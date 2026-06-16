const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
  const { review, bizType, bizName, rating, tone } = req.body;

  if (!review || !rating || !tone) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const starDesc = ['','very negative (1 star)','negative (2 stars)','mixed (3 stars)','positive (4 stars)','very positive (5 stars)'][rating];
  const name = bizName || 'our business';

  const prompt = `You are the owner of a ${bizType} called "${name}". A customer has left a ${starDesc} Google review. Write a genuine, human reply in a ${tone} tone.

Customer review: "${review}"

Instructions:
- Keep it under 85 words
- Sound like a real business owner, not a robot
- If the review is negative (1-2 stars): acknowledge the specific issue, apologise sincerely, invite them to contact you directly
- If the review is mixed (3 stars): thank them, address the criticism honestly, invite them back
- If the review is positive (4-5 stars): thank them warmly, mention something specific from their review, invite them back
- Do not use hashtags, exclamation marks more than once, or phrases like "We strive for excellence"
- Write only the reply text, nothing else`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Gemini error:', data.error);
      return res.status(500).json({ error: 'AI error: ' + data.error.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
      return res.status(500).json({ error: 'No reply generated. Please try again.' });
    }

    res.json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ReplyFast running on port ${PORT}`));
