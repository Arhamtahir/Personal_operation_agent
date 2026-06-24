const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

const app = express();

app.use(express.json({ limit: '200mb' }));

/*
|--------------------------------------------------------------------------
| CONFIG
|--------------------------------------------------------------------------
*/

const N8N_WEBHOOK =
    'http://localhost:5678/webhook-test/auto-reply';

/*
|--------------------------------------------------------------------------
| GLOBAL ERROR HANDLING
|--------------------------------------------------------------------------
*/

process.on('unhandledRejection', (err) => {

    console.log('\n==============================');
    console.log('UNHANDLED REJECTION');
    console.log('==============================');

    console.log(err);

});

process.on('uncaughtException', (err) => {

    console.log('\n==============================');
    console.log('UNCAUGHT EXCEPTION');
    console.log('==============================');

    console.log(err);

});

/*
|--------------------------------------------------------------------------
| WHATSAPP CLIENT
|--------------------------------------------------------------------------
*/


const SENSITIVE_PATTERNS = [
    /password/i,
    /passwd/i,
    /otp/i,
    /verification code/i,
    /api[_ -]?key/i,
    /secret/i,
    /token/i,
    /private key/i,
    /access key/i
];

console.log('\nInitializing WhatsApp Client...\n');

const client = new Client({

    authStrategy: new LocalAuth({
        clientId: 'main'
    }),

    takeoverOnConflict: true,
    takeoverTimeoutMs: 10000,

    restartOnAuthFail: true

});

/*
|--------------------------------------------------------------------------
| DEBUG EVENTS
|--------------------------------------------------------------------------
*/

client.on('change_state', (state) => {

    console.log('\n==============================');
    console.log('STATE CHANGED');
    console.log('==============================');

    console.log(state);

});

client.on('loading_screen', (percent, message) => {

    console.log('\n==============================');
    console.log('LOADING');
    console.log('==============================');

    console.log(percent + '%');
    console.log(message);

});

/*
|--------------------------------------------------------------------------
| QR
|--------------------------------------------------------------------------
*/

client.on('qr', (qr) => {

    console.log('\n==============================');
    console.log('SCAN QR CODE');
    console.log('==============================\n');

    qrcode.generate(qr, {
        small: true
    });

});

/*
|--------------------------------------------------------------------------
| AUTH EVENTS
|--------------------------------------------------------------------------
*/

client.on('authenticated', () => {

    console.log('\n==============================');
    console.log('AUTHENTICATED');
    console.log('==============================');

});

client.on('auth_failure', async (msg) => {

    console.log('\n==============================');
    console.log('AUTH FAILURE');
    console.log('==============================');

    console.log(msg);

});

/*
|--------------------------------------------------------------------------
| READY
|--------------------------------------------------------------------------
*/

client.on('ready', async () => {

    console.log('\n==============================');
    console.log('WHATSAPP READY');
    console.log('==============================');

    try {

        const state = await client.getState();

        console.log('STATE:', state);

        console.log('\nCLIENT INFO:\n');

        console.log(client.info);

    } catch (err) {

        console.log(err);

    }

});

/*
|--------------------------------------------------------------------------
| DISCONNECTED
|--------------------------------------------------------------------------
*/

client.on('disconnected', async (reason) => {

    console.log('\n==============================');
    console.log('DISCONNECTED');
    console.log('==============================');

    console.log(reason);

    try {

        await client.destroy();

        console.log('\nClient destroyed');

    } catch (err) {

        console.log(err);

    }

    setTimeout(() => {

        console.log('\nReinitializing...\n');

        client.initialize();

    }, 5000);

});

/*
|--------------------------------------------------------------------------
| MESSAGE LISTENER
|--------------------------------------------------------------------------
|
| IMPORTANT:
| ONLY COMMANDS WILL EXECUTE
|
| TEXT COMMAND:
| /naman ko bol sham ko meet hai
|
| VOICE COMMAND:
| send voice note starting with:
| "command ..."
|
*/

client.on('message', async (msg) => {

    console.log('\n======================');
    console.log('MESSAGE RECEIVED');
    console.log('FROM:', msg.from);
    console.log('BODY:', msg.body);
    console.log('FROM ME:', msg.fromMe);
    console.log('======================');

    try {

        if (msg.fromMe) {
            return;
        }

        const chat = await msg.getChat();

        const contact =
            await chat.getContact();

        const TARGET_CONTACT =
            '923361703703';

        if (
            contact.id?.user !== TARGET_CONTACT
        ) {
            return;
        }

        const messages =
            await chat.fetchMessages({
                limit: 10
            });

        const history = messages
            .filter(m =>
                m.type === 'chat' &&
                m.body?.trim()
            )
            .map(m => {

                let body = m.body;

                const containsSensitive =
                    SENSITIVE_PATTERNS.some(
                        pattern => pattern.test(body)
                    );

                if (containsSensitive) {
                    body =
                        '[REDACTED_SENSITIVE_CONTENT]';
                }

                return {
                    fromMe: m.fromMe,
                    body
                };

            });

        if (!history.length) {

            console.log(
                'No valid messages found'
            );

            return;
        }

        await axios.post(
            N8N_WEBHOOK,
            {
                type: 'auto_reply',
                chatId: msg.from,
                name:
                    contact.pushname ||
                    contact.name ||
                    'Unknown',
                history
            }
        );

        console.log(
            'History sent to n8n'
        );

    } catch (err) {

        console.log(err);

    }

});

 /*
|--------------------------------------------------------------------------
| SEND MESSAGE API
|--------------------------------------------------------------------------
*/
const API_KEY = 
    process.env.API_KEY ||
    'change-this-secret-key';

app.post('/send-message', async (req, res) => {

    const apiKey =
        req.headers['x-api-key'];

    if (apiKey !== API_KEY) {

        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });

    }

    try {

        // existing code

    } catch (err) {

        // existing code

    }

});


/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get('/', async (req, res) => {

    try {

        let state = 'UNKNOWN';

        try {

            state =
                await client.getState();

        } catch {}

        res.json({
            success: true,
            state
        });

    } catch (err) {

        res.json({
            success: false,
            error: err.message
        });

    }

});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

app.listen(3000, '127.0.0.1', () => {

    console.log('\n==============================');
    console.log('EXPRESS SERVER STARTED');
    console.log('PORT: 3000');
    console.log('==============================');

});

/*
|--------------------------------------------------------------------------
| START CLIENT
|--------------------------------------------------------------------------
*/

console.log('\nStarting WhatsApp Client...\n');

client.initialize();