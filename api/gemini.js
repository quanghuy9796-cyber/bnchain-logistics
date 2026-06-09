// api/gemini.js — Vercel Serverless Proxy cho Google Gemini API

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY chưa được cấu hình trong Vercel' });

  try {
    const { model = 'gemini-2.5-flash', contents } = req.body;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' });
    }

    // Gemini 2.5 trả về nhiều parts (thinking + text)
    // Gộp tất cả parts có text, bỏ qua thought parts
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts
      .filter(p => p.text && !p.thought)
      .map(p => p.text)
      .join('') || '';

    return res.status(200).json({ text, raw: data });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
