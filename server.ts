import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_YEARS = new Set([2023, 2024, 2025, 2026]);
const ALLOWED_VIEWS = new Set(['overview', 'country', 'cities', 'compare', 'trade']);

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // Health probe for server verification
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim() && process.env.GEMINI_API_KEY.trim() !== 'MY_GEMINI_API_KEY'),
    });
  });

  // Server-side AI Analyst endpoint powered by Gemini
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'Invalid request payload.' });
        return;
      }

      const rawQuestion = typeof body.question === 'string' ? body.question.trim() : '';
      if (!rawQuestion || rawQuestion.length < 3) {
        res.status(400).json({ error: 'Please enter a question of at least 3 characters.' });
        return;
      }
      if (rawQuestion.length > 600) {
        res.status(400).json({ error: 'Question exceeds the 600-character limit.' });
        return;
      }

      const dataYear = typeof body.dataYear === 'number' && ALLOWED_YEARS.has(body.dataYear)
        ? body.dataYear
        : 2026;
      const activeView = typeof body.activeView === 'string' && ALLOWED_VIEWS.has(body.activeView)
        ? body.activeView
        : 'overview';
      const contextSummary =
        typeof body.contextSummary === 'string'
          ? body.contextSummary.slice(0, 16000)
          : '';

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'AI Analyst is temporarily unavailable because the server-side Gemini API key is not configured in this environment.',
        });
        return;
      }

      const systemInstruction = [
        'You are the WorldStats AI Macroeconomic & Demographic Analyst.',
        'Ground every numerical claim strictly in the provided WorldStats dataset snapshot for the active reporting year.',
        'Do not fabricate country figures outside the supplied context; if a metric is missing or projected, explicitly state that.',
        'Keep answers concise, analytical, policy-relevant, and structured like an IMF / Our World in Data briefing.',
        'For suggestedActions, only output countryCode values (ISO alpha-3) and cityIds that appear verbatim in the supplied dataset snapshot.',
        'Return valid JSON matching the requested schema.',
      ].join(' ');

      const promptText = [
        `Active View: ${activeView}`,
        `Active Reporting Year: ${dataYear}`,
        '',
        '--- WORLDSTATS DATASET SNAPSHOT ---',
        contextSummary,
        '--- END SNAPSHOT ---',
        '',
        `User Question: ${rawQuestion}`,
      ].join('\n');

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          headline: {
            type: Type.STRING,
            description: 'Concise 6-14 word analytical headline.',
          },
          summary: {
            type: Type.STRING,
            description: '2-3 sentence executive synthesis grounded in the provided data.',
          },
          bulletPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 to 5 crisp, quantitative findings or scenario outcomes.',
          },
          caveat: {
            type: Type.STRING,
            description: '1 sentence noting methodology, projection uncertainty, or data source vintage.',
          },
          suggestedActions: {
            type: Type.ARRAY,
            description: 'Up to 3 follow-up navigation actions inside WorldStats using valid countryCode or cityIds from the snapshot.',
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                view: {
                  type: Type.STRING,
                  enum: ['overview', 'country', 'cities', 'compare', 'trade'],
                },
                countryCode: { type: Type.STRING },
                cityIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['label', 'view'],
            },
          },
        },
        required: ['headline', 'summary', 'bulletPoints', 'caveat', 'suggestedActions'],
      };

      const candidateAttempts: Array<{ model: string; thinkingLevel?: ThinkingLevel; timeoutMs: number }> = [
        { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 15000 },
        { model: 'gemini-3.1-flash-lite', timeoutMs: 15000 },
      ];
      let usedModel: string = candidateAttempts[0].model;
      let rawText = '';
      let lastError: unknown = null;

      for (const attempt of candidateAttempts) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${attempt.model} timed out after ${attempt.timeoutMs}ms`)), attempt.timeoutMs);
          });
          const genPromise = ai.models.generateContent({
            model: attempt.model,
            contents: promptText,
            config: {
              systemInstruction,
              ...(attempt.thinkingLevel ? { thinkingConfig: { thinkingLevel: attempt.thinkingLevel } } : {}),
              responseMimeType: 'application/json',
              responseSchema,
            },
          });
          const response = await Promise.race([genPromise, timeoutPromise]);
          const text = response.text?.trim() ?? '';
          if (text) {
            rawText = text;
            usedModel = attempt.model;
            break;
          }
        } catch (modelErr: unknown) {
          lastError = modelErr;
          const errMsg = modelErr instanceof Error ? modelErr.message : String(modelErr);
          console.warn(`[WorldStats AI Analyst] ${attempt.model} failed:`, errMsg);
        } finally {
          if (timer) clearTimeout(timer);
        }
      }

      if (!rawText) {
        if (lastError) {
          console.error('[WorldStats AI Analyst Error]', lastError instanceof Error ? lastError.message : lastError);
        }
        res.status(502).json({ error: 'Unable to complete AI analysis right now. Please try again in a moment.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({
        model: usedModel,
        dataYear,
        ...parsed,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected AI service failure.';
      console.error('[WorldStats AI Analyst Error]', message);
      res.status(502).json({
        error: 'Unable to complete AI analysis right now. Please try again in a moment.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WorldStats server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start WorldStats server:', err);
  process.exit(1);
});
