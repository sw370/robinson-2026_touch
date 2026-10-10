/**
 * Audio Synthesis and Sound Effects for Robinson Crusoe Kiosk
 * Supports Google Gemini Studio TTS (gemini-3.8-flash-lite-tts) for ultra-realistic human speech,
 * with offline Web Speech API fallback.
 */

let audioCtx: AudioContext | null = null;
let currentAudioElement: HTMLAudioElement | null = null;
let activeGoogleVoice: string = 'Fenrir'; // 'Fenrir', 'Puck', 'Charon', 'Kore', 'Zephyr'

export function setGoogleVoice(voice: string) {
  activeGoogleVoice = voice;
}

export function getGoogleVoice(): string {
  return activeGoogleVoice;
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Fallback browser speech synthesis
function speakWithBrowserSynthesis(text: string, rate = 0.88): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = rate;
    utterance.pitch = 0.98;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        (v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('UK') ||
            v.name.includes('British') ||
            v.name.includes('Daniel') ||
            v.name.includes('Oliver') ||
            v.name.includes('Google'))) ||
        v.lang === 'en-GB' ||
        v.lang === 'en-US'
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Main speech synthesis function:
 * 1. Checks disk/cache via /api/tts with id and text
 * 2. Uses Google Gemini AI TTS (`gemini-3.8-flash-lite-tts`) via server-side endpoint `/api/tts`
 * 3. If server/network unavailable, smoothly falls back to browser synthesis
 */
export async function speakEnglish(text: string, rate = 0.88, id?: string): Promise<void> {
  stopSpeech();

  // 1. If an ID is provided, try direct static audio file first (supports 100% offline local static run)
  if (id) {
    const playStaticDirect = await new Promise<boolean>((resolve) => {
      const staticAudio = new Audio(`/assets/audio/${id}.wav`);
      currentAudioElement = staticAudio;

      staticAudio.onended = () => {
        currentAudioElement = null;
        resolve(true);
      };

      staticAudio.onerror = () => {
        currentAudioElement = null;
        resolve(false);
      };

      staticAudio.play().catch(() => {
        currentAudioElement = null;
        resolve(false);
      });
    });

    if (playStaticDirect) {
      return;
    }
  }

  // 2. Try server-side Gemini TTS API endpoint
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        id,
        voice: activeGoogleVoice,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.audioData) {
        return new Promise((resolve) => {
          const audio = new Audio(`data:audio/wav;base64,${data.audioData}`);
          currentAudioElement = audio;

          audio.onended = () => {
            currentAudioElement = null;
            resolve();
          };

          audio.onerror = () => {
            currentAudioElement = null;
            speakWithBrowserSynthesis(text, rate).then(resolve);
          };

          audio.play().catch(() => {
            currentAudioElement = null;
            speakWithBrowserSynthesis(text, rate).then(resolve);
          });
        });
      }
    }
  } catch {
    // Backend API unreachable or static file mode
  }

  // 3. Graceful offline fallback to browser speech synthesis
  return speakWithBrowserSynthesis(text, rate);
}

export async function generateAllAudioFiles(voice: string = activeGoogleVoice): Promise<{
  success: boolean;
  generated?: Record<string, boolean>;
  error?: string;
}> {
  try {
    const res = await fetch('/api/tts/generate-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error' };
  }
}

export async function checkAudioLibraryStatus(): Promise<{
  diskFiles: string[];
  totalItems: number;
  cachedInMemory: number;
  hasGeminiKey: boolean;
}> {
  try {
    const res = await fetch('/api/tts/library-status');
    return await res.json();
  } catch {
    return { diskFiles: [], totalItems: 10, cachedInMemory: 0, hasGeminiKey: false };
  }
}

export function stopSpeech(): void {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch {}
    currentAudioElement = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Sound Effects via Web Audio API
export function playWoodClick(): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

export function playSuccessChime(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (major arpeggio)

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.4);
    });
  } catch {}
}

export function playErrorThud(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  } catch {}
}

export function playCompletionFanfare(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const melody = [
      { f: 440, d: 0.12, t: 0 },
      { f: 554.37, d: 0.12, t: 0.12 },
      { f: 659.25, d: 0.15, t: 0.24 },
      { f: 880, d: 0.4, t: 0.42 },
    ];

    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.25, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.t);
      osc.stop(now + note.t + note.d);
    });
  } catch {}
}
