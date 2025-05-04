// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let messages = [];

app.get('/messages', (req, res) => {
  res.json(messages);
});

app.post('/messages', async (req, res) => {
  const { text, sender } = req.body;
  if (!text || !sender) {
    return res.status(400).json({ error: 'Text and sender are required' });
  }

  // 1) Save the user’s message
  messages.push({
    text,
    sender,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  try {
    // 2) Format message history for Gemini API
    const history = messages.map(msg => ({
      role: msg.sender === 'Bot' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`;

    const payload = {
      contents: history,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 256
      }
    };

    const aiRes = await axios.post(url, payload);
    const candidate = aiRes.data.candidates?.[0];

if (!candidate || !candidate.content?.parts?.[0]?.text) {
  throw new Error('No valid response from Gemini model.');
}
    const aiText = formatBotReply(aiRes.data.candidates[0].content.parts[0].text);

    const botReply = {
      text: aiText,
      sender: 'Bot',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    messages.push(botReply);

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Google AI Error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to get response from Google AI' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running at http://192.168.70.166:${PORT}`);
});

const formatBotReply = (text) => {
  return text.charAt(0).toUpperCase() + text.slice(1).trim();
};
