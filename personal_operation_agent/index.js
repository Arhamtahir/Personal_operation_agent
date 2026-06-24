process.on('uncaughtException', (err) => {
    console.log("❌ UNCAUGHT EXCEPTION:");
    console.log(err);
});

process.on('unhandledRejection', (err) => {
    console.log("❌ UNHANDLED REJECTION:");
    console.log(err);
});



console.log("INDEX STARTED");
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { classifyMessage } = require('./services/llm');
const pool = require('./db/postgres');
const app = express();
const file = './data/tasks.json';


app.use(express.json());
app.use(express.static('public'));

const N8N_WEBHOOK = "http://host.docker.internal:5678/webhook/agent";

// =========================
// SAFE JSON PARSER
// =========================
function safeJSONParse(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        const match = str.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error("Invalid AI JSON response");
    }
}

// =========================
// SAVE TASK
// =========================
function saveTask(task) {
    

    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, "[]");
    }

    const data = JSON.parse(fs.readFileSync(file));

    data.push({
        ...task,
        createdAt: new Date().toISOString()
    });

    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}


// =========================
// MAIN API
// =========================
app.post('/process', async (req, res) => {

    try {

         console.log("📩 REQUEST RECEIVED:", req.body);   // 👈 ADD THIS HERE
        const { message } = req.body;
        const conversationId = req.body.conversationId;

        const conv = await pool.query(
    `SELECT title FROM conversations WHERE id=$1`,
    [conversationId]
);
const titlePrompt = `
Generate a short chat title.

Message:
${message}

Rules:
- Maximum 4 words
- No quotes
- No punctuation
- Return title only
`;

const titleRes = await axios.post(
    'http://127.0.0.1:11434/api/generate',
    {
        model: 'qwen3.5:9b',
        prompt: titlePrompt,
        stream: false
    }
);

const smartTitle =
    titleRes.data.response.trim();

await pool.query(
`
UPDATE conversations
SET title=$1
WHERE id=$2
`,
[smartTitle, conversationId]
);

        if (!conversationId) {
    return res.status(400).json({
        error: "No conversation selected"
    });
}
        await pool.query(
        `
        INSERT INTO messages(conversation_id, role, content)
        VALUES($1, $2, $3)
        `,
        [conversationId, 'user', message]
        );
        let raw;

        try {
            
            raw = await classifyMessage(message);
            
            console.log(raw);
        } catch (err) {
            console.log("❌ LLM ERROR:", err);

            return res.status(500).json({
                success: false,
                error: "LLM failed"
            });
        }
        //const raw = await classifyMessage(message);

        const ai = safeJSONParse(raw);
        console.log("STEP 3");
        console.log(ai);
        ai.type = ai.type.toUpperCase();

        await pool.query(
    `
    INSERT INTO messages(conversation_id, role, content)
    VALUES($1, $2, $3)
    `,
    [
        conversationId,
        'assistant',
        ai.answer || ai.description || ai.title || ""
    ]
    );
        

       // console.log("AI:", ai);

        // TASK
            if (ai.type === "TASK") {
        try {
            //console.log("TASK AI:", ai);
            console.log("ABOUT TO INSERT INTO DB");

            const title = ai.title || ai.message || "Untitled Task";
            const description = ai.description || ai.message || "";

            try {
                await pool.query(
                    `
                    INSERT INTO tasks(title, description)
                    VALUES($1, $2)
                    `,
                    [title, description]
                );

                console.log("✅ TASK SAVED TO DB");
            } catch (err) {
                console.log("❌ DB ERROR:", err);

                if (ai.type === "REPLY") {
                return res.json({
                    success: true,
                    reply: {
                        text: ai.answer
                    }
                });
}
            }

        } catch (err) {
            console.log("DB ERROR:", err.message);

            return res.json({
                success: false,
                reply: {
                    answer: "DB error: " + err.message
                }
            });
        }
    }
        // REMINDER
        if (ai.type === "REMINDER") {
        try {
            await pool.query(
        `
        INSERT INTO reminders(title, description)
        VALUES($1,$2)
        `,
        [ai.title, ai.description]
            );
        console.log("✅ REMINDER SAVED TO DB");
            }   catch (err) {
                console.log("DB ERROR:", err.message);
                    if (ai.type === "REPLY") {
                        return res.json({
                            success: true,
                            reply: {
                                text: ai.answer
                            }
                        });
                    }
            };
            
            await axios.post(N8N_WEBHOOK, ai);

            return res.json({
                success: true,
                action: "sent_to_n8n",
                reply: ai
            });
        }

        // INFO
        if (ai.type === "INFO") {
        return res.json({
            success: true,
            reply: {
                text: ai.answer
            }
        });
    }

        // REPLY
            if (ai.type === "REPLY") {
        return res.json({
            success: true,
            reply: {
                text: ai.answer
            }
        });
    }

        // N8N TRIGGER
        if (ai.type === "N8N_TRIGGER") {
            await axios.post(N8N_WEBHOOK, ai);

            return res.json({
                success: true,
                action: "n8n_triggered",
                reply: ai
            });
        }

        return res.json({
        success: true,
        reply: {
            answer: "Unknown request type"
        }
    });

    } catch (err) {
        return res.status(500).json({
            error: err.message
        });
    }

});

//history endpoint to fetch conversation history

app.get('/history/:id', async (req, res) => {
    const { id } = req.params;

    const result = await pool.query(
        `SELECT * FROM messages WHERE conversation_id=$1 ORDER BY id ASC`,
        [id]
    );

    res.json(result.rows);
});


app.post('/conversation/new', async (req, res) => {
        console.log("🔥 NEW CHAT ROUTE HIT");


    const result = await pool.query(`
        INSERT INTO conversations(title)
        VALUES('New Chat')
        RETURNING id
    `);

    res.json({
        id: result.rows[0].id
    });

});

app.get('/conversations', async (req, res) => {
    const result = await pool.query(`
        SELECT *
        FROM conversations
        ORDER BY created_at DESC
    `);

    res.json(result.rows);
});

// =========================
// SERVER
// =========================
const server = app.listen(3000, () => {
    console.log("🚀 SERVER RUNNING on http://localhost:3000");
});

server.on('error', (err) => {
    console.log("💥 SERVER ERROR:", err);
});