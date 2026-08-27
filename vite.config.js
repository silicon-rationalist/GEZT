import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'https';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const openrouterKey = env.OPENROUTER_API_KEY || '';
  const geminiKey = env.GEMINI_API_KEY || '';
  const model = env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

  function callOpenRouter(bodyJson) {
    return new Promise((resolve, reject) => {
      if (!openrouterKey) return reject(new Error('No OpenRouter key'));
      const payload = {
        ...bodyJson,
        model: bodyJson.model || model,
        max_tokens: bodyJson.max_tokens || 1500,
      };
      const data = JSON.stringify(payload);
      const req = https.request({
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'GEZT Smart Filing',
          'Content-Length': Buffer.byteLength(data),
        },
      }, res => {
        let resBody = '';
        res.on('data', chunk => resBody += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve({ data: JSON.parse(resBody), provider: 'openrouter' });
            } catch (e) {
              reject(new Error('OpenRouter response JSON parse error'));
            }
          } else {
            console.warn(`[Smart Filing server] OpenRouter returned status ${res.statusCode}: ${resBody.slice(0, 150)}`);
            reject(new Error(`OpenRouter HTTP ${res.statusCode}`));
          }
        });
      });
      req.on('error', err => reject(err));
      req.write(data);
      req.end();
    });
  }

  function callGeminiDirect(bodyJson) {
    return new Promise((resolve, reject) => {
      if (!geminiKey) return reject(new Error('No Gemini key'));
      
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

      const data = JSON.stringify(payload);
      const urlPath = `/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;

      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      }, res => {
        let resBody = '';
        res.on('data', chunk => resBody += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const geminiRes = JSON.parse(resBody);
              const textContent = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text;
              if (!textContent) throw new Error('No candidate content in Gemini response');
              // Format into OpenAI-compatible chat completion response
              const standardResponse = {
                id: 'gemini-' + Date.now(),
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: 'gemini-flash-latest',
                provider: 'gemini',
                choices: [
                  {
                    index: 0,
                    message: {
                      role: 'assistant',
                      content: textContent,
                    },
                    finish_reason: 'stop',
                  },
                ],
              };
              resolve({ data: standardResponse, provider: 'gemini' });
            } catch (e) {
              reject(new Error('Gemini response parse error: ' + e.message));
            }
          } else {
            console.warn(`[Smart Filing server] Gemini returned status ${res.statusCode}: ${resBody.slice(0, 150)}`);
            reject(new Error(`Gemini HTTP ${res.statusCode}`));
          }
        });
      });
      req.on('error', err => reject(err));
      req.write(data);
      req.end();
    });
  }

  return {
    plugins: [
      react(),
      {
        name: 'smart-filing-api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/smart-filing', (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method Not Allowed' }));
              return;
            }

            let bodyStr = '';
            req.on('data', chunk => bodyStr += chunk);
            req.on('end', async () => {
              let bodyJson = {};
              try {
                bodyJson = JSON.parse(bodyStr || '{}');
              } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
                return;
              }

              console.log(`[Smart Filing server] Handling request (messages: ${bodyJson.messages?.length || 0})`);

              // Try OpenRouter first
              try {
                if (openrouterKey) {
                  console.log(`[Smart Filing server] Attempting OpenRouter (${model})...`);
                  const result = await callOpenRouter(bodyJson);
                  console.log(`[Smart Filing server] ✓ OpenRouter succeeded`);
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('X-AI-Provider', 'openrouter');
                  res.statusCode = 200;
                  res.end(JSON.stringify(result.data));
                  return;
                }
              } catch (err) {
                console.warn(`[Smart Filing server] OpenRouter failed: ${err.message}. Trying Gemini fallback...`);
              }

              // Try Gemini Direct fallback
              try {
                if (geminiKey) {
                  console.log(`[Smart Filing server] Attempting Gemini Direct (gemini-flash-latest)...`);
                  const result = await callGeminiDirect(bodyJson);
                  console.log(`[Smart Filing server] ✓ Gemini Direct succeeded`);
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('X-AI-Provider', 'gemini');
                  res.statusCode = 200;
                  res.end(JSON.stringify(result.data));
                  return;
                }
              } catch (err) {
                console.warn(`[Smart Filing server] Gemini fallback failed: ${err.message}`);
              }

              // If both failed or neither configured
              console.log(`[Smart Filing server] All AI providers failed or unconfigured -> 503`);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 503;
              res.end(JSON.stringify({
                error: 'AI service unavailable',
                message: 'Neither OpenRouter nor Gemini API could fulfill the request.',
                code: 503,
              }));
            });
          });
        },
      },
    ],
    define: {
      __OPENROUTER_MODEL__: JSON.stringify(model),
      __HAS_OPENROUTER_KEY__: JSON.stringify(!!openrouterKey),
      __HAS_GEMINI_KEY__: JSON.stringify(!!geminiKey),
      __HAS_API_KEY__: JSON.stringify(!!(openrouterKey || geminiKey)),
    },
  };
});
