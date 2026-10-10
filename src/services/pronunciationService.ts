import { WordScore, PhonemeEvent } from '../types';

export interface PronunciationResult {
  recognizedText: string;
  score: number; // 0 - 100
  confidence: number;
  wordScores?: WordScore[];
  events?: PhonemeEvent[];
  isMockFallback?: boolean;
  error?: string;
}

// Convert Blob to Base64 string
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Client-side Levenshtein similarity fallback
function stringSimilarity(s1: string, s2: string): number {
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

// Send audio to recognition backend (/api/recognize or configured local Python server)
async function sendToBackendAssessor(
  audioBlob: Blob | null,
  expected: string,
  taskType: 'word' | 'reading',
  interimTranscript: string
): Promise<PronunciationResult> {
  let base64Audio = '';
  let mimeType = 'audio/webm';

  if (audioBlob && audioBlob.size > 200) {
    base64Audio = await blobToBase64(audioBlob);
    mimeType = audioBlob.type || 'audio/webm';
  }

  try {
    const response = await fetch('/api/recognize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expected,
        audioData: base64Audio,
        mimeType,
        taskType,
        spokenText: interimTranscript,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        recognizedText: data.recognizedText || interimTranscript || '',
        score: typeof data.score === 'number' ? data.score : 0,
        confidence: data.confidence || 0.9,
        wordScores: data.wordScores,
        events: data.events,
        error: data.error,
      };
    }
  } catch (e) {
    console.warn('Backend speech assessment request failed, using client fallback:', e);
  }

  // Pure deterministic client fallback if server endpoint is unreachable
  return clientSideAssess(expected, interimTranscript, taskType);
}

function clientSideAssess(
  expected: string,
  transcript: string,
  taskType: 'word' | 'reading'
): PronunciationResult {
  const cleanSpoken = transcript.trim().toLowerCase();

  if (taskType === 'word') {
    const cleanExp = expected.trim().toLowerCase();
    if (!cleanSpoken) {
      return {
        recognizedText: '',
        score: 0,
        confidence: 0,
        wordScores: [{ word: expected, score: 0, status: 'weak' }],
      };
    }

    const sim = stringSimilarity(cleanExp, cleanSpoken);
    const score = Math.round(sim * 100);
    return {
      recognizedText: transcript,
      score,
      confidence: 0.85,
      wordScores: [{
        word: expected,
        score,
        status: score >= 85 ? 'good' : score >= 70 ? 'medium' : 'weak',
      }],
      events: [{
        phoneme: cleanExp,
        label: score >= 85 ? 'correct' : score >= 70 ? 'minor_error' : 'incorrect',
        score,
      }],
    };
  }

  // Reading excerpt client sequence evaluation
  const rawWords = expected.split(/\s+/).map((w) => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ''));
  if (!cleanSpoken) {
    const zeroScores: WordScore[] = rawWords.map((word) => ({
      word,
      score: 0,
      status: 'weak',
    }));
    return {
      recognizedText: '',
      score: 0,
      confidence: 0,
      wordScores: zeroScores,
    };
  }

  const spokenWords = cleanSpoken.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  let spokenIndex = 0;

  const wordScores: WordScore[] = rawWords.map((word) => {
    const cleanWord = word.toLowerCase();
    let bestSim = 0;
    const searchLimit = Math.min(spokenWords.length, spokenIndex + 3);
    let matchedPos = -1;

    for (let p = spokenIndex; p < searchLimit; p++) {
      const sim = stringSimilarity(cleanWord, spokenWords[p]);
      if (sim > 0.6 && sim > bestSim) {
        bestSim = sim;
        matchedPos = p;
      }
    }

    if (matchedPos !== -1) {
      spokenIndex = matchedPos + 1;
    } else {
      bestSim = 0;
    }

    const score = Math.round(bestSim * 100);
    return {
      word,
      score,
      status: score >= 85 ? 'good' : score >= 70 ? 'medium' : 'weak',
    };
  });

  const totalScore = Math.round(
    wordScores.reduce((acc, curr) => acc + curr.score, 0) / (wordScores.length || 1)
  );

  return {
    recognizedText: transcript,
    score: totalScore,
    confidence: 0.85,
    wordScores,
  };
}

export type MicPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported' | 'iframe_blocked';

export interface MicCheckResult {
  state: MicPermissionState;
  isInIframe: boolean;
  message?: string;
  errorName?: string;
}

export function isPageInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function checkMicrophonePermission(): Promise<MicCheckResult> {
  const inIframe = isPageInIframe();

  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      state: 'unsupported',
      isInIframe: inIframe,
      message: 'Захват аудио не поддерживается этим браузером или текущим протоколом (требуется HTTPS).',
    };
  }

  if (navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return {
        state: status.state as MicPermissionState,
        isInIframe: inIframe,
      };
    } catch {
      // Querying microphone is not supported in Safari or some web engines
    }
  }

  return {
    state: 'prompt',
    isInIframe: inIframe,
  };
}

export async function requestMicrophoneAccess(): Promise<{
  granted: boolean;
  errorType?: 'denied' | 'iframe_blocked' | 'not_found' | 'in_use' | 'unsupported' | 'other';
  errorMessage?: string;
  stream?: MediaStream;
}> {
  const inIframe = isPageInIframe();

  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      granted: false,
      errorType: 'unsupported',
      errorMessage: 'Браузер не предоставляет доступ к MediaDevices API (убедитесь, что страница открыта по HTTPS).',
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return {
      granted: true,
      stream,
    };
  } catch (err: any) {
    console.warn('Microphone permission request error:', err);
    const name = err?.name || '';
    const message = (err?.message || '').toLowerCase();

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      if (inIframe && (message.includes('policy') || message.includes('iframe') || message.includes('disallowed') || message.includes('feature'))) {
        return {
          granted: false,
          errorType: 'iframe_blocked',
          errorMessage: 'Фрейм предпросмотра заблокировал доступ к микрофону. Откройте приложение в новой отдельной вкладке браузера.',
        };
      }
      return {
        granted: false,
        errorType: 'denied',
        errorMessage: 'Доступ к микрофону заблокирован браузером. Нажмите на иконку настроек/замка в строке адреса и разрешите микрофон.',
      };
    }

    if (name === 'SecurityError') {
      return {
        granted: false,
        errorType: 'iframe_blocked',
        errorMessage: 'Политика безопасности ограничила доступ к микрофону во фрейме. Откройте приложение в отдельной вкладке.',
      };
    }

    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return {
        granted: false,
        errorType: 'not_found',
        errorMessage: 'Микрофон не обнаружен на устройстве. Подключите микрофон или гарнитуру.',
      };
    }

    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return {
        granted: false,
        errorType: 'in_use',
        errorMessage: 'Микрофон занят другой программой или вкладкой. Закройте другие программы, использующие микрофон.',
      };
    }

    return {
      granted: false,
      errorType: 'other',
      errorMessage: err?.message || 'Не удалось активировать микрофон браузера.',
    };
  }
}

/**
 * Record and evaluate a single word (e.g. "compass", "telescope")
 */
export async function recordAndAssessWord(
  expectedWord: string,
  onSpeechDetected?: (text: string) => void
): Promise<PronunciationResult> {
  const micAccess = await requestMicrophoneAccess();
  if (!micAccess.granted || !micAccess.stream) {
    return {
      recognizedText: '',
      score: 0,
      confidence: 0,
      error: micAccess.errorMessage || 'Микрофон недоступен.',
    };
  }

  const mediaStream: MediaStream = micAccess.stream;
  let mediaRecorder: MediaRecorder | null = null;
  const audioChunks: Blob[] = [];

  // Browser live speech recognition for immediate interim visual feedback
  const win = window as any;
  const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
  let speechRec: any = null;
  let interimTranscript = '';

  try {
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : '';

    mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    mediaRecorder.start(250);
  } catch (err) {
    console.warn('MediaRecorder setup error:', err);
  }

  if (SpeechRecognitionClass) {
    try {
      speechRec = new SpeechRecognitionClass();
      speechRec.lang = 'en-US';
      speechRec.interimResults = true;
      speechRec.maxAlternatives = 1;
      speechRec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          interimTranscript = res[0].transcript;
          if (onSpeechDetected) {
            onSpeechDetected(interimTranscript);
          }
        }
      };
      speechRec.start();
    } catch {}
  }

  // Allow ~3.5 seconds to utter the single word
  await new Promise((r) => setTimeout(r, 3500));

  // Stop recording
  if (speechRec) {
    try {
      speechRec.stop();
    } catch {}
  }

  let finalBlob: Blob | null = null;
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    await new Promise<void>((resolve) => {
      mediaRecorder!.onstop = () => {
        finalBlob = new Blob(audioChunks, { type: mediaRecorder!.mimeType || 'audio/webm' });
        resolve();
      };
      mediaRecorder!.stop();
    });
  }

  // Release microphone tracks
  mediaStream.getTracks().forEach((track) => track.stop());

  return sendToBackendAssessor(finalBlob, expectedWord, 'word', interimTranscript);
}

/**
 * Record and evaluate a full reading excerpt with word-by-word scores
 */
export function recordAndAssessReading(
  expectedText: string,
  onInterimSpeech?: (text: string) => void,
  onError?: (errorMessage: string, errorType?: string) => void
): {
  stop: () => Promise<PronunciationResult>;
} {
  let mediaStream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  const audioChunks: Blob[] = [];

  const win = window as any;
  const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
  let speechRec: any = null;
  let liveTranscript = '';

  // Request microphone capture
  requestMicrophoneAccess().then((access) => {
    if (!access.granted || !access.stream) {
      if (onError) {
        onError(access.errorMessage || 'Не удалось запустить микрофон', access.errorType);
      }
      return;
    }

    mediaStream = access.stream;
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      mediaRecorder.start(250);
    } catch (err) {
      console.warn('Reading MediaRecorder initialization error:', err);
    }
  });

  // Start speech recognition for live visual prompt while reading
  if (SpeechRecognitionClass) {
    try {
      speechRec = new SpeechRecognitionClass();
      speechRec.lang = 'en-US';
      speechRec.continuous = true;
      speechRec.interimResults = true;
      speechRec.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            liveTranscript += ' ' + res[0].transcript;
          } else {
            interim += ' ' + res[0].transcript;
          }
        }
        if (onInterimSpeech) {
          onInterimSpeech((liveTranscript + ' ' + interim).trim());
        }
      };
      speechRec.start();
    } catch {}
  }

  const stop = async (): Promise<PronunciationResult> => {
    if (speechRec) {
      try {
        speechRec.stop();
      } catch {}
    }

    let finalBlob: Blob | null = null;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        mediaRecorder!.onstop = () => {
          finalBlob = new Blob(audioChunks, { type: mediaRecorder!.mimeType || 'audio/webm' });
          resolve();
        };
        mediaRecorder!.stop();
      });
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }

    return sendToBackendAssessor(finalBlob, expectedText, 'reading', liveTranscript.trim());
  };

  return { stop };
}
