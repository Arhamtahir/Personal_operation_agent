const axios = require('axios');
const fs = require('fs');
const path = require('path');

const promptTemplate = fs.readFileSync(
  path.join(__dirname, '../prompts/classify.txt'),
  'utf-8'
);

async function classifyMessage(message) {

    const prompt = promptTemplate.replace("{{input}}", message);
   
    const res = await axios.post(
        'http://127.0.0.1:11434/api/generate',
        {
            model: 'qwen3.5:9b',
            prompt,
            stream: false
        }
    );

    return res.data.response;
}

module.exports = { classifyMessage };