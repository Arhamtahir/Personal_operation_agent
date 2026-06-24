const axios = require("axios");

(async () => {
  const res = await axios.post("http://127.0.0.1:11434/api/generate", {
    model: "qwen3.5:9b",
    prompt: "hello",
    stream: false
  });

  console.log(res.data);
})();