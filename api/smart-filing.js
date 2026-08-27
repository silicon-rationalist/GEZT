export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY || '';
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

  let bodyJson = req.body;
  if (typeof req.body === 'string') {
    try {
      bodyJson = JSON.parse(req.body);
    } catch (e) {
      bodyJson = {};
    }
  }
  bodyJson = bodyJson || {};

  // 1. Try OpenRouter
  if (openrouterKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'https://vercel.com',
          'X-Title': 'GEZT Smart Filing',
        },
        body: JSON.stringify({
          ...bodyJson,
          model: bodyJson.model || model,
          max_tokens: bodyJson.max_tokens || 1500,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        res.setHeader('X-AI-Provider', 'openrouter');
        return res.status(200).json(data);
      }
    } catch (err) {
      console.warn('[Vercel API] OpenRouter error:', err.message);
    }
  }

  // 2. Try Gemini Direct fallback
  if (geminiKey) {
    try {
      const systemMsg = (bodyJson.messages || []).find(m => m.role === 'system')?.content || '';
      const nonSystemMsgs = (bodyJson.messages || []).filter(m => m.role !== 'system');

      const contents = nonSystemMsgs.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      }));

      const payload = {
        contents,
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 1500,
          temperature: 0.1,
        },
      };
      if (systemMsg) {
        payload.systemInstruction = {
          parts: [{ text: systemMsg }],
        };
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const geminiRes = await response.json();
        const textContent = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          const standardResponse = {
            id: 'gemini-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: 'gemini-flash-latest',
            provider: 'gemini',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: textContent },
                finish_reason: 'stop',
              },
            ],
          };
          res.setHeader('X-AI-Provider', 'gemini');
          return res.status(200).json(standardResponse);
        }
      }
    } catch (err) {
      console.warn('[Vercel API] Gemini error:', err.message);
    }
  }

  return res.status(503).json({
    error: 'AI service unavailable',
    message: 'Neither OpenRouter nor Gemini API could fulfill the request. Please ensure environment variables are configured on Vercel.',
    code: 503,
  });
}
