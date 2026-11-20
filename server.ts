import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

type SupportedLang = 'sr' | 'en';
type ChaserRole = 'GOCA' | 'ZIR' | 'DIREKTORKA';

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const ttsCache = new Map<string, Buffer>();
const ttsInFlight = new Map<string, Promise<Buffer>>();

function normalizeSpeechText(text: string, lang: SupportedLang): string {
  const trimmed = text.trim();
  if (lang === 'sr') {
    return trimmed
      .replace(/^Dećeš\?!$/i, 'De ćeš?!')
      .replace(/^JAOO!\s*MOJA LEĐA!$/i, 'Jao, moja leđa!')
      .replace(/^BLJAAA!\s*ĆAO!$/i, 'Blja, ćao!');
  }
  return trimmed;
}

function buildVoiceStyle(lang: SupportedLang, chaser: ChaserRole): string {
  if (lang === 'sr') {
    switch (chaser) {
      case 'DIREKTORKA':
        return 'Tečan, prirodan srpski jezik (ekavica). Govori kao stroga, autoritativna direktorka škole, oštrim, dubljim i zapovedničkim ženskim glasom.';
      case 'ZIR':
        return 'Tečan, prirodan srpski jezik (ekavica). Govori kao zadihana, punija starija žena spremačica, grubljeg i promuklog ženskog glasa, glasno i ljutito.';
      case 'GOCA':
      default:
        return 'Tečan, prirodan srpski jezik (ekavica). Govori kao starija, stroga, malo gruba i promukla žena spremačica Goca od 74 godine, energično i ljutito ali potpuno razgovetno.';
    }
  }

  switch (chaser) {
    case 'DIREKTORKA':
      return 'Fluent natural English spoken by a strict, sharp, low-voiced female school principal.';
    case 'ZIR':
      return 'Fluent natural English spoken by a breathless, gruff older woman school caretaker shouting mid-chase.';
    case 'GOCA':
    default:
      return 'Fluent natural English spoken by a stern, raspy, slightly gruff 74-year-old European school caretaker woman shouting sharply.';
  }
}

async function synthesizeTtsWav(
  rawText: string,
  lang: SupportedLang,
  chaser: ChaserRole
): Promise<Buffer> {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const spokenText = normalizeSpeechText(rawText, lang);
  const cacheKey = `${lang}:${chaser}:${spokenText}`;

  const cached = ttsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const existing = ttsInFlight.get(cacheKey);
  if (existing) {
    return existing;
  }

  const style = buildVoiceStyle(lang, chaser);

  const callTtsModel = async (modelName: string, useMetadata: boolean) => {
    return ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            useMetadata
              ? { text: spokenText, speechMetadata: { style } }
              : { text: `(${style}): ${spokenText}` },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
  };

  const job = (async () => {
    const attempts: Array<{ model: string; waitMs: number }> = [
      { model: 'gemini-3.8-flash-lite-tts', waitMs: 0 },
      { model: 'gemini-3.8-flash-tts', waitMs: 250 },
      { model: 'gemini-3.8-flash-lite-tts', waitMs: 700 },
    ];

    let response;
    let lastError: unknown = null;

    for (const attempt of attempts) {
      if (attempt.waitMs > 0) {
        await new Promise((r) => setTimeout(r, attempt.waitMs));
      }
      try {
        try {
          response = await callTtsModel(attempt.model, true);
        } catch (metaErr) {
          const metaMsg = metaErr instanceof Error ? metaErr.message : '';
          if (/speechMetadata/i.test(metaMsg)) {
            response = await callTtsModel(attempt.model, false);
          } else {
            throw metaErr;
          }
        }
        break;
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : '';
        const isTransient = /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(msg);
        if (!isTransient) {
          throw err;
        }
      }
    }

    if (!response) {
      throw lastError instanceof Error ? lastError : new Error('TTS request failed');
    }

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('No audio data returned from Gemini TTS.');
    }

    const wavBuffer = Buffer.from(base64Audio, 'base64');
    if (ttsCache.size > 150) {
      const oldestKey = ttsCache.keys().next().value;
      if (oldestKey) ttsCache.delete(oldestKey);
    }
    ttsCache.set(cacheKey, wavBuffer);
    return wavBuffer;
  })();

  ttsInFlight.set(cacheKey, job);
  try {
    return await job;
  } finally {
    ttsInFlight.delete(cacheKey);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        text?: unknown;
        lang?: unknown;
        chaser?: unknown;
      };

      const text = typeof body?.text === 'string' ? body.text.trim() : '';
      if (!text || text.length > 160) {
        res.status(400).json({ error: 'Invalid text parameter.' });
        return;
      }

      const lang: SupportedLang = body?.lang === 'sr' ? 'sr' : 'en';
      const chaser: ChaserRole =
        body?.chaser === 'ZIR' || body?.chaser === 'DIREKTORKA'
          ? body.chaser
          : 'GOCA';

      const wavBuffer = await synthesizeTtsWav(text, lang, chaser);
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(wavBuffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'TTS generation failed';
      console.error('[TTS Error]', message);
      res.status(500).json({ error: message });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Goca Escape server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
