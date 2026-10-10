import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const AUDIO_DIR = path.resolve(__dirname, 'public', 'assets', 'audio');
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// In-memory audio cache to serve instant responses for words and excerpts in kiosk
const audioCache = new Map<string, string>();

// Pre-load any existing audio files from disk into cache
try {
  const files = fs.readdirSync(AUDIO_DIR);
  for (const file of files) {
    if (file.endsWith('.wav')) {
      const filePath = path.join(AUDIO_DIR, file);
      const base64 = fs.readFileSync(filePath).toString('base64');
      const key = file.replace('.wav', '');
      audioCache.set(key, base64);
    }
  }
} catch (e) {
  console.warn('Audio pre-cache notice:', e);
}

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.Gemini_scool || process.env.GEMINI_API_KEY || process.env.GEMINI_SCOOL;
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const ITEMS_TO_GENERATE = [
  { id: 'telescope', text: 'Telescope', style: 'Clear British maritime explorer pronunciation' },
  { id: 'map', text: 'Map', style: 'Clear British explorer pronunciation' },
  { id: 'compass', text: 'Compass', style: 'Clear British navigation officer pronunciation' },
  { id: 'lantern', text: 'Lantern', style: 'Clear British explorer pronunciation' },
  { id: 'chest', text: 'Chest', style: 'Clear British explorer pronunciation' },
  { id: 'rope', text: 'Rope', style: 'Clear British explorer pronunciation' },
  { id: 'rifle', text: 'Rifle', style: 'Clear British explorer pronunciation' },
  {
    id: 'excerpt_1',
    text: 'When I reached the island, I was tired and frightened. The ship had been destroyed, and there was no one else around me. I walked along the shore until I found a safe place where I could stay.',
    style: 'Atmospheric 18th century Robinson Crusoe diary reading, authentic English accent, reflective and vivid'
  },
  {
    id: 'excerpt_2',
    text: 'Near the rocks I found a place that was protected from the wind. There I began to build a small shelter, using wood and other things I had saved from the ship. It took many days, but at last I had a safe home of my own.',
    style: 'Atmospheric Robinson Crusoe diary reading, deliberate, calm and thoughtful'
  },
  {
    id: 'excerpt_3',
    text: 'As the days passed, I learned to find food and make the things I needed. I worked from morning until evening, and slowly the island became less frightening to me. Although I was still alone, I began to feel that I could survive there.',
    style: 'Atmospheric Robinson Crusoe diary reading, hopeful and resilient'
  }
];

// Single text TTS endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Fenrir', style, id } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text parameter is required' });
      return;
    }

    const trimmedText = text.trim();
    const diskFileName = id ? `${id}.wav` : null;
    const diskPath = diskFileName ? path.join(AUDIO_DIR, diskFileName) : null;

    // Check disk first
    if (diskPath && fs.existsSync(diskPath)) {
      const base64 = fs.readFileSync(diskPath).toString('base64');
      res.json({
        audioData: base64,
        source: 'disk',
      });
      return;
    }

    const cacheKey = `${voice}_${trimmedText}`;
    if (audioCache.has(cacheKey)) {
      res.json({
        audioData: audioCache.get(cacheKey),
        source: 'cache',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY не настроен в переменных окружения',
        fallback: true,
      });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: trimmedText,
              speechMetadata: {
                style: style || 'Clear, natural British explorer pronunciation with proper articulation',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      res.status(500).json({ error: 'No audio returned from Gemini TTS', fallback: true });
      return;
    }

    // Save in memory
    audioCache.set(cacheKey, base64Audio);

    // Save to disk if item has an id or disk filename
    if (diskPath) {
      fs.writeFileSync(diskPath, Buffer.from(base64Audio, 'base64'));
    }

    res.json({
      audioData: base64Audio,
      mimeType: 'audio/wav',
      source: 'gemini-3.8-flash-lite-tts',
    });
  } catch (err: any) {
    console.error('Gemini TTS error:', err?.message || err);
    res.status(500).json({
      error: err?.message || 'Gemini TTS generation failed',
      fallback: true,
    });
  }
});

// Batch generation endpoint to pre-render all words & excerpts at once
app.post('/api/tts/generate-all', async (req, res) => {
  const { voice = 'Fenrir' } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    res.status(400).json({
      success: false,
      error: 'GEMINI_API_KEY не найден в окружении. Добавьте его в панели Secrets в AI Studio.',
    });
    return;
  }

  const results: Record<string, boolean> = {};

  for (const item of ITEMS_TO_GENERATE) {
    try {
      console.log(`Generating audio for ${item.id} with Gemini 3.8 TTS (${voice})...`);
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: item.text,
                speechMetadata: {
                  style: item.style,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const filePath = path.join(AUDIO_DIR, `${item.id}.wav`);
        fs.writeFileSync(filePath, Buffer.from(base64Audio, 'base64'));
        audioCache.set(item.id, base64Audio);
        audioCache.set(`${voice}_${item.text}`, base64Audio);
        results[item.id] = true;
      } else {
        results[item.id] = false;
      }
    } catch (e: any) {
      console.error(`Error generating ${item.id}:`, e?.message || e);
      results[item.id] = false;
    }
  }

  res.json({
    success: true,
    voice,
    generated: results,
  });
});

// Calculate string similarity between two words
function computeStringSimilarity(s1: string, s2: string): number {
  const str1 = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const str2 = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (str1 === str2) return 1.0;
  if (!str1.length || !str2.length) return 0.0;

  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = track[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  return Math.max(0, 1 - distance / maxLength);
}

// Fallback assessment algorithm when Gemini is offline or unavailable
function fallbackAssess(expected: string, spokenText: string, isWord: boolean) {
  const cleanSpoken = spokenText.trim();
  if (!cleanSpoken) {
    if (isWord) {
      return {
        expected,
        recognizedText: '',
        score: 0,
        confidence: 0,
        events: [],
        wordScores: []
      };
    }
    const rawWords = expected.split(/\s+/).map((w) => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ''));
    const wordScores = rawWords.map((word) => ({
      word,
      score: 0,
      status: 'weak' as const
    }));
    return {
      expected,
      recognizedText: '',
      score: 0,
      confidence: 0,
      events: [],
      wordScores
    };
  }

  if (isWord) {
    const cleanExpected = expected.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSpk = cleanSpoken.toLowerCase().replace(/[^a-z0-9]/g, '');
    const sim = computeStringSimilarity(cleanExpected, cleanSpk);
    const score = Math.round(sim * 100);
    const label = score >= 85 ? 'correct' : score >= 70 ? 'minor_error' : 'incorrect';
    return {
      expected,
      recognizedText: spokenText,
      score,
      confidence: 0.85,
      events: [{ phoneme: cleanExpected, label, score }],
      wordScores: [{
        word: expected,
        score,
        status: score >= 85 ? 'good' : score >= 70 ? 'medium' : 'weak'
      }]
    };
  }

  // Reading excerpt sequence alignment
  const expectedWords = expected.split(/\s+/).map((w) => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ''));
  const spokenWords = cleanSpoken.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  let spokenIdx = 0;
  const wordScores = expectedWords.map((word) => {
    const cleanExp = word.toLowerCase();
    let bestScore = 0;

    // Look ahead up to 3 spoken words to handle minor skips/insertions
    const searchEnd = Math.min(spokenWords.length, spokenIdx + 3);
    let matchedPos = -1;

    for (let pos = spokenIdx; pos < searchEnd; pos++) {
      const sim = computeStringSimilarity(cleanExp, spokenWords[pos]);
      if (sim > 0.6 && sim * 100 > bestScore) {
        bestScore = Math.round(sim * 100);
        matchedPos = pos;
      }
    }

    if (matchedPos !== -1) {
      spokenIdx = matchedPos + 1;
    } else {
      bestScore = 0;
    }

    const status = bestScore >= 85 ? 'good' : bestScore >= 70 ? 'medium' : 'weak';
    return {
      word,
      score: bestScore,
      status
    };
  });

  const totalScore = Math.round(wordScores.reduce((acc, curr) => acc + curr.score, 0) / (wordScores.length || 1));

  return {
    expected,
    recognizedText: spokenText,
    score: totalScore,
    confidence: 0.85,
    events: [],
    wordScores
  };
}

// Current active engine: defaults to 'pronounce-assess' (local Python service on port 8000)
// The legacy Gemini method is preserved in legacyGeminiAssess() below, but temporarily deactivated by default.
let activeEngineMode: 'pronounce-assess' | 'gemini' = 'pronounce-assess';

// Pronunciation assessment handler (serves both /api/recognize and /recognize)
async function handlePronunciationAssessment(req: express.Request, res: express.Response) {
  const reqEngine = (req.body?.engine || req.headers['x-engine'] || req.query.engine || activeEngineMode) as string;

  // If curator/user explicitly requested legacy Gemini method
  if (reqEngine === 'gemini') {
    return legacyGeminiAssess(req, res);
  }

  // DEFAULT: Local pronounce-assess service on port 8000
  try {
    const pyUrl = process.env.PYTHON_ASSESSOR_URL || 'http://127.0.0.1:8000';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const pyRes = await fetch(`${pyUrl}/recognize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (pyRes.ok) {
      const pyData = await pyRes.json();
      return res.json({
        ...pyData,
        engine: 'pronounce-assess',
        recognizedText: pyData.recognizedText || req.body?.spokenText || req.body?.expected || '',
      });
    }
  } catch (pyErr) {
    // If local Python service is offline, fallback gracefully with phonetic alignment
    console.warn('Local Python pronounce-assess service offline or unreachable:', pyErr);
  }

  // Fallback if local python service is not running
  const { expected, spokenText = '' } = req.body;
  const isWord = (expected || '').trim().split(/\s+/).length <= 2;
  const fallbackResult = fallbackAssess(expected || '', spokenText, isWord);
  return res.json({
    ...fallbackResult,
    engine: 'pronounce-assess-fallback',
    status: 'ok',
    note: 'Python pronounce-assess сервер на 127.0.0.1:8000 не запущен, использован резервный расчёт'
  });
}

// PRESERVED: Legacy Gemini assessment method (saved, but temporarily deactivated by default)
async function legacyGeminiAssess(req: express.Request, res: express.Response) {
  try {
    const { expected, audioData, mimeType = 'audio/webm', taskType, spokenText } = req.body;

    if (!expected || typeof expected !== 'string') {
      res.status(400).json({ error: 'Параметр "expected" обязателен' });
      return;
    }

    const cleanExpected = expected.trim();
    const isSingleWord = taskType === 'word' || cleanExpected.split(/\s+/).length <= 2;

    // Check if audio data was supplied
    let cleanBase64 = '';
    if (audioData && typeof audioData === 'string') {
      cleanBase64 = audioData.includes(',') ? audioData.split(',')[1] : audioData;
    }

    // If no audio data is provided but spokenText exists, use fallback evaluator
    if (!cleanBase64 || cleanBase64.length < 100) {
      if (spokenText) {
        const result = fallbackAssess(cleanExpected, spokenText, isSingleWord);
        res.json(result);
        return;
      }
      res.json({
        expected: cleanExpected,
        recognizedText: '',
        score: 0,
        confidence: 0,
        events: [],
        wordScores: isSingleWord
          ? [{ word: cleanExpected, score: 0, status: 'weak' }]
          : cleanExpected.split(/\s+/).map((w) => ({
              word: w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ''),
              score: 0,
              status: 'weak'
            })),
        error: 'Аудиозапись пустая или не содержит речи. Говорите ближе к микрофону.'
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      console.warn('Gemini API key unavailable, using fallback assessment algorithm');
      const result = fallbackAssess(cleanExpected, spokenText || '', isSingleWord);
      res.json(result);
      return;
    }

    // Determine normalized mimeType for Gemini (e.g. 'audio/webm', 'audio/wav', 'audio/mp4')
    const normalizedMime = mimeType.split(';')[0].trim() || 'audio/webm';

    if (isSingleWord) {
      const prompt = `You are an expert pronunciation assessment engine for an educational museum kiosk.
The user was asked to pronounce the single target English word: "${cleanExpected}".

Carefully analyze the audio recording:
1. "recognizedText": Exactly what English word or sound was uttered. If complete silence, ambient noise, or unintelligible breath, set to "".
2. "events": A breakdown of each phoneme in the target word with its score (0 to 100):
   - "phoneme": phonetic sound
   - "label": "correct" (score >= 85), "minor_error" (70 to 84), or "incorrect" (< 70)
   - "score": number from 0 to 100
3. "score": Overall pronunciation score (0 to 100) calculated from phoneme accuracy:
   - 0 if silence, background noise, or completely different word.
   - 40 to 69 if mispronounced or distorted phonemes.
   - 70 to 84 if understandable with noticeable non-native accent.
   - 85 to 100 if accurate and clear pronunciation.
4. "confidence": number between 0.0 and 1.0.

Return ONLY a valid JSON object matching:
{
  "recognizedText": string,
  "score": number,
  "confidence": number,
  "events": [{"phoneme": string, "label": "correct" | "minor_error" | "incorrect", "score": number}]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: normalizedMime,
                  data: cleanBase64
                }
              },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);

      // Aggregate phoneme events into overall score per formula
      let calculatedScore = parsed.score;
      if (Array.isArray(parsed.events) && parsed.events.length > 0) {
        const scores = parsed.events
          .map((e: any) => typeof e.score === 'number' ? e.score : null)
          .filter((s: any) => s !== null);
        if (scores.length > 0) {
          calculatedScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
        }
      }

      // If recognized text is empty or silence
      if (!parsed.recognizedText || parsed.recognizedText.trim() === '') {
        calculatedScore = 0;
      }

      const finalScore = Math.min(100, Math.max(0, calculatedScore));

      res.json({
        expected: cleanExpected,
        recognizedText: parsed.recognizedText || '',
        score: finalScore,
        confidence: parsed.confidence || 0.9,
        events: parsed.events || [],
        wordScores: [{
          word: cleanExpected,
          score: finalScore,
          status: finalScore >= 85 ? 'good' : finalScore >= 70 ? 'medium' : 'weak'
        }]
      });
      return;
    }

    // Excerpt reading assessment
    const prompt = `You are an expert English speech and reading assessment engine for a museum exhibit.
The user is reading this expected historical diary excerpt aloud:
"${cleanExpected}"

Listen to the audio recording very carefully.
Task:
1. "recognizedText": Exact transcript of what was spoken by the reader.
2. "wordScores": An array matching EVERY word in the expected text in its original sequence:
   - "word": string (the expected word)
   - "score": number from 0 to 100:
     * 0 if the word was omitted, skipped, or unintelligible.
     * 40 to 69 if mispronounced or mumbled.
     * 70 to 84 if recognizable with clear accent.
     * 85 to 100 if pronounced accurately and clearly.
   - "status": "good" (score >= 85), "medium" (score >= 70 and < 85), or "weak" (score < 70).
3. "score": Overall score 0 to 100 calculated as the average of all word scores.
4. "confidence": number between 0.0 and 1.0.

Return ONLY a valid JSON object matching:
{
  "recognizedText": string,
  "score": number,
  "confidence": number,
  "wordScores": [{"word": string, "score": number, "status": "good" | "medium" | "weak"}],
  "events": [{"phoneme": string, "label": "correct" | "minor_error" | "incorrect", "score": number}]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: normalizedMime,
                data: cleanBase64
              }
            },
            { text: prompt }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');

    // Expected words list
    const expectedWords = cleanExpected.split(/\s+/).map((w) => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ''));

    let wordScores = parsed.wordScores;
    if (!Array.isArray(wordScores) || wordScores.length === 0) {
      wordScores = fallbackAssess(cleanExpected, parsed.recognizedText || '', false).wordScores;
    }

    // Calculate overall score as average of wordScores
    const overallScore = Math.round(
      wordScores.reduce((acc: number, curr: any) => acc + (Number(curr.score) || 0), 0) / (wordScores.length || 1)
    );

    res.json({
      expected: cleanExpected,
      recognizedText: parsed.recognizedText || '',
      score: Math.min(100, Math.max(0, overallScore)),
      confidence: parsed.confidence || 0.9,
      wordScores,
      events: parsed.events || []
    });
  } catch (err: any) {
    console.error('Pronunciation assessment error:', err?.message || err);
    // Graceful fallback to algorithmic evaluator on any Gemini issue
    try {
      const { expected, spokenText = '' } = req.body;
      const isWord = (expected || '').trim().split(/\s+/).length <= 2;
      const fallbackResult = fallbackAssess(expected || '', spokenText, isWord);
      res.json(fallbackResult);
    } catch {
      res.status(500).json({ error: 'Ошибка оценки произношения', score: 0 });
    }
  }
}

// Mount pronunciation assessment endpoints (standard kiosk API)
app.post('/api/recognize', handlePronunciationAssessment);
app.post('/recognize', handlePronunciationAssessment);
app.post('/api/assess-pronunciation', handlePronunciationAssessment);

// Engine status endpoint: checks python server and reports engine status
app.get('/api/engine-status', async (_req, res) => {
  let pythonAvailable = false;
  let pythonDetails: any = null;

  try {
    const pyUrl = process.env.PYTHON_ASSESSOR_URL || 'http://127.0.0.1:8000';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const resp = await fetch(`${pyUrl}/status`, { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      pythonAvailable = true;
      pythonDetails = await resp.json();
    }
  } catch {}

  res.json({
    activeEngine: activeEngineMode,
    pythonAvailable,
    pythonDetails,
    geminiPreserved: true,
  });
});

// Toggle between pronounce-assess (default) and legacy Gemini
app.post('/api/engine-mode', (req, res) => {
  const { mode } = req.body;
  if (mode === 'gemini' || mode === 'pronounce-assess') {
    activeEngineMode = mode;
    res.json({ success: true, activeEngine: activeEngineMode });
  } else {
    res.status(400).json({ error: 'Неверный режим. Допустимо: pronounce-assess | gemini' });
  }
});

// Audio library inspection endpoint
app.get('/api/tts/library-status', (req, res) => {
  const diskFiles = fs.readdirSync(AUDIO_DIR).filter((f) => f.endsWith('.wav'));
  res.json({
    diskFiles,
    totalItems: ITEMS_TO_GENERATE.length,
    cachedInMemory: audioCache.size,
    hasGeminiKey: Boolean(process.env.Gemini_scool || process.env.GEMINI_API_KEY || process.env.GEMINI_SCOOL),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.Gemini_scool || process.env.GEMINI_API_KEY || process.env.GEMINI_SCOOL),
    cachedAudioItems: audioCache.size,
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Robinson Cave Kiosk server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
