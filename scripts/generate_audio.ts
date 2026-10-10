/**
 * Standalone Audio Pre-generation Script using Gemini 3.8 Flash Lite TTS
 * Run with: npx tsx scripts/generate_audio.ts [voiceName]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUDIO_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'audio');
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

const voice = process.argv[2] || 'Fenrir';
const apiKey = process.env.Gemini_scool || process.env.GEMINI_API_KEY || process.env.GEMINI_SCOOL;

if (!apiKey) {
  console.error('❌ ОШИБКА: Ключ API (Gemini_scool или GEMINI_API_KEY) не найден в окружении!');
  console.error('Добавьте его в файл .env или Secrets в AI Studio');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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

async function generateAll() {
  console.log(`🎙️ Запуск генерации Gemini 3.8 Flash Lite TTS (Голос: ${voice})...`);
  console.log(`📁 Папка сохранения: ${AUDIO_DIR}`);

  for (const item of ITEMS_TO_GENERATE) {
    const outFile = path.join(AUDIO_DIR, `${item.id}.wav`);
    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 1000) {
      console.log(`⏩ Пропуск (уже существует): ${item.id}`);
      continue;
    }

    console.log(`⏳ Генерация [${item.id}]: "${item.text.slice(0, 35)}..."`);

    let success = false;
    let attempts = 0;

    while (!success && attempts < 3) {
      attempts++;
      try {
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
          fs.writeFileSync(outFile, Buffer.from(base64Audio, 'base64'));
          console.log(`✅ Сохранено: ${outFile} (${(base64Audio.length / 1024).toFixed(1)} KB)`);
          success = true;
          // Small pause between items to stay friendly with rate limits
          await new Promise((r) => setTimeout(r, 4000));
        } else {
          console.warn(`⚠️ Нет аудиоданных в ответе для ${item.id}`);
          break;
        }
      } catch (e: any) {
        const msg = e?.message || '';
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
          console.log(`⏳ Лимит запросов (Rate limit). Ожидание 22 сек перед повтором...`);
          await new Promise((r) => setTimeout(r, 22000));
        } else {
          console.error(`❌ Ошибка генерации ${item.id}:`, msg);
          break;
        }
      }
    }
  }

  console.log('\n🎉 Генерация завершена!');
}

generateAll();
