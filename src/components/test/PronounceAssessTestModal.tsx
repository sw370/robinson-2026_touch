import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Volume2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
  Cpu,
  Layers,
  Clock,
  VolumeX,
} from 'lucide-react';
import { speakEnglish, playWoodClick, playSuccessChime, stopSpeech } from '../../services/audioService';
import { requestMicrophoneAccess } from '../../services/pronunciationService';

export const TEST_SENTENCES = [
  "The quick brown fox jumps over the lazy dog.",
  "I would like to have a cup of coffee.",
  "She went to the library after school."
];

interface PhonemeItem {
  phoneme: string;
  score?: number | null;
  label?: string;
  decoded?: string;
}

interface PronounceResultData {
  expected: string;
  score: number | null;
  phonemes: PhonemeItem[];
  status: string;
  engine?: string;
  audio_duration_sec?: number;
  processing_time_ms?: number;
  message?: string;
}

interface PronounceAssessTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMicCheck?: () => void;
}

export const PronounceAssessTestModal: React.FC<PronounceAssessTestModalProps> = ({
  isOpen,
  onClose,
  onOpenMicCheck,
}) => {
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState(0);
  const [customText, setCustomText] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  // States: 'idle' | 'recording' | 'processing' | 'result' | 'error'
  const [uiState, setUiState] = useState<'idle' | 'recording' | 'processing' | 'result' | 'error'>('idle');
  const [resultData, setResultData] = useState<PronounceResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live recording & VAD states
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [vadEnabled, setVadEnabled] = useState(true);

  // Engine status info
  const [engineInfo, setEngineInfo] = useState<{
    activeEngine: string;
    pythonAvailable: boolean;
    pythonDetails?: any;
  } | null>(null);

  // Refs for audio capture & VAD
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // VAD refs
  const speechDetectedRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);

  const activeTargetText = isCustom ? customText.trim() : TEST_SENTENCES[selectedSentenceIndex];

  // Fetch engine status when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/engine-status')
        .then((res) => res.json())
        .then((data) => setEngineInfo(data))
        .catch(() => {});
    } else {
      cleanupRecording();
      stopSpeech();
    }
  }, [isOpen]);

  const cleanupRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setAudioLevel(0);
  };

  const handleStartRecording = async () => {
    playWoodClick();
    stopSpeech();
    cleanupRecording();
    setResultData(null);
    setErrorMessage(null);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
    speechDetectedRef.current = false;
    silenceStartRef.current = null;

    const micAccess = await requestMicrophoneAccess();
    if (!micAccess.granted || !micAccess.stream) {
      setErrorMessage(micAccess.errorMessage || 'Микрофон недоступен');
      setUiState('error');
      if (onOpenMicCheck) onOpenMicCheck();
      return;
    }

    const stream = micAccess.stream;
    mediaStreamRef.current = stream;

    // Setup Web Audio analyser for VU meter and lightweight VAD
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const checkAudioActivity = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const avg = sum / buffer.length;
        const level = Math.min(100, Math.round((avg / 70) * 100));
        setAudioLevel(level);

        // VAD Logic: speech threshold is level > 12
        const now = Date.now();
        if (level > 12) {
          speechDetectedRef.current = true;
          silenceStartRef.current = null;
        } else if (speechDetectedRef.current && vadEnabled) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = now;
          } else if (now - silenceStartRef.current > 1600) {
            // 1.6s of silence after speech detected -> auto stop!
            handleStopRecording();
            return;
          }
        }

        animFrameRef.current = requestAnimationFrame(checkAudioActivity);
      };
      animFrameRef.current = requestAnimationFrame(checkAudioActivity);
    } catch (e) {
      console.warn('Audio analyser init error:', e);
    }

    // MediaRecorder
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250);
      setUiState('recording');

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 18) {
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ошибка MediaRecorder');
      setUiState('error');
    }
  };

  const handleStopRecording = async () => {
    playWoodClick();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      return;
    }

    setUiState('processing');

    const finalBlobPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        resolve(blob);
      };
      recorder.stop();
    });

    const audioBlob = await finalBlobPromise;

    // Release microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    // Convert blob to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const base64Audio = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

      try {
        const response = await fetch('/api/recognize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-engine': 'pronounce-assess',
          },
          body: JSON.stringify({
            expected: activeTargetText,
            audioData: base64Audio,
            mimeType: audioBlob.type || 'audio/webm',
            engine: 'pronounce-assess',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setResultData(data);
          setUiState('result');
          if (data.score !== null && data.score >= 70) {
            playSuccessChime();
          } else {
            playWoodClick();
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          setErrorMessage(errData.error || errData.message || 'Ошибка обработки аудио');
          setUiState('error');
        }
      } catch (e: any) {
        setErrorMessage(e?.message || 'Сетевая ошибка при передаче аудио на сервер');
        setUiState('error');
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  const handleListenTarget = () => {
    speakEnglish(activeTargetText);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <div
        className="relative w-full max-w-3xl bg-stone-900 border-2 border-amber-600/70 rounded-3xl p-5 sm:p-7 text-stone-100 shadow-2xl max-h-[94vh] flex flex-col justify-between overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-400/50 text-amber-200 shadow-md shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-serif-maritime text-amber-200">
                  Тестирование библиотеки pronounce-assess
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/60 text-emerald-300">
                  Wav2Vec2 Phoneme CTC
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Оценка произношения на уровне фонем (3 контрольных предложения)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playWoodClick();
              cleanupRecording();
              onClose();
            }}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Status Banner */}
        <div className="my-3 p-3 rounded-2xl bg-stone-950/80 border border-stone-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-stone-300 font-medium">Активный оценщик:</span>
            <span className="font-bold text-amber-300 font-mono">
              pronounce-assess (локальный сервис 127.0.0.1:8000)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-400 text-[11px] hidden sm:inline">VAD авто-стоп:</span>
            <button
              type="button"
              onClick={() => setVadEnabled(!vadEnabled)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                vadEnabled
                  ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                  : 'bg-stone-800 text-stone-400'
              }`}
            >
              {vadEnabled ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
          </div>
        </div>

        {/* 3 Sentences Selector Tabs */}
        <div className="space-y-2 mb-3">
          <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
            Выберите одно из 3 предложений:
          </label>
          <div className="grid grid-cols-1 gap-2">
            {TEST_SENTENCES.map((sentence, idx) => (
              <button
                key={idx}
                type="button"
                disabled={uiState === 'recording' || uiState === 'processing'}
                onClick={() => {
                  playWoodClick();
                  setIsCustom(false);
                  setSelectedSentenceIndex(idx);
                  setResultData(null);
                  setErrorMessage(null);
                  setUiState('idle');
                }}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-start gap-3 ${
                  !isCustom && selectedSentenceIndex === idx
                    ? 'bg-amber-950/60 border-amber-500 shadow-md text-amber-100 ring-2 ring-amber-500/30'
                    : 'bg-stone-900/60 hover:bg-stone-800/80 border-stone-800 text-stone-300'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-stone-800 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-semibold leading-snug">
                    {sentence}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Sentence Card & Controls */}
        <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/90 border border-amber-700/50 mb-3 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
              Текст для произнесения:
            </span>
            <button
              type="button"
              onClick={handleListenTarget}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-600/70 text-amber-300 text-xs font-semibold cursor-pointer active:scale-95"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Послушать эталон</span>
            </button>
          </div>

          <p className="text-lg sm:text-2xl font-bold font-serif-maritime text-stone-100 leading-snug">
            «{activeTargetText}»
          </p>

          {/* RECORDING STATE */}
          {uiState === 'recording' && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/80 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span>ИДЁТ ЗАПИСЬ... Произнесите предложение</span>
                </div>
                <div className="flex items-center gap-1 text-rose-300 font-mono text-sm font-bold">
                  <Clock className="w-4 h-4" />
                  <span>0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
                </div>
              </div>

              {/* Live VU-meter */}
              <div className="flex items-center gap-1 h-6 px-2 bg-stone-950 rounded-xl border border-stone-800">
                {Array.from({ length: 24 }).map((_, i) => {
                  const threshold = (i / 24) * 100;
                  const active = audioLevel >= threshold;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm transition-all duration-75 ${
                        active
                          ? i > 18
                            ? 'h-5 bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                            : i > 12
                            ? 'h-4 bg-amber-400'
                            : 'h-3 bg-emerald-400'
                          : 'h-1 bg-stone-800'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-rose-200">
                <span>
                  {vadEnabled ? 'Говорите в микрофон (пауза 1.5 с завершит запись)' : 'Нажмите кнопку СТОП когда закончите'}
                </span>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>СТОП (Распознать)</span>
                </button>
              </div>
            </div>
          )}

          {/* PROCESSING STATE */}
          {uiState === 'processing' && (
            <div className="p-6 rounded-2xl bg-amber-950/50 border border-amber-600/70 text-center space-y-3 animate-fade-in">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-sm sm:text-base font-bold text-amber-200">
                Обработка через pronounce-assess...
              </p>
              <p className="text-xs text-stone-400">
                Декодирование PCM 16kHz, извлечение логитов Wav2Vec2 CTC и расчёт Goodness of Pronunciation (GOP)
              </p>
            </div>
          )}

          {/* IDLE BUTTON */}
          {uiState === 'idle' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartRecording}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-stone-950 font-black text-lg uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <Mic className="w-6 h-6" />
                <span>РАСПОЗНАТЬ (НАЧАТЬ ЗАПИСЬ)</span>
              </button>
            </div>
          )}

          {/* ERROR STATE */}
          {uiState === 'error' && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/80 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>Ошибка распознавания:</span>
              </div>
              <p className="text-xs sm:text-sm text-rose-200 leading-relaxed">
                {errorMessage || 'Не удалось оценить произношение.'}
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setUiState('idle')}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer"
                >
                  Попробовать снова
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RESULT SECTION (Section 7 & 8) */}
        {uiState === 'result' && resultData && (
          <div className="space-y-4 animate-fade-in">
            {/* Overall Score Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/90 border border-amber-600/70 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-stone-400 uppercase font-bold tracking-wider block">
                  Итоговая оценка произношения:
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={`text-4xl sm:text-5xl font-black ${
                      resultData.score === null
                        ? 'text-stone-400'
                        : resultData.score >= 80
                        ? 'text-emerald-300'
                        : resultData.score >= 60
                        ? 'text-amber-300'
                        : 'text-rose-400'
                    }`}
                  >
                    {resultData.score !== null ? `${resultData.score}` : 'null'}
                  </span>
                  {resultData.score !== null && (
                    <span className="text-lg font-bold text-stone-400">/ 100</span>
                  )}
                  <span
                    className={`ml-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      resultData.score === null
                        ? 'bg-stone-800 text-stone-400'
                        : resultData.score >= 80
                        ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300'
                        : resultData.score >= 60
                        ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300'
                        : 'bg-rose-500/20 border border-rose-500/60 text-rose-300'
                    }`}
                  >
                    {resultData.score === null
                      ? 'Недостаточно данных'
                      : resultData.score >= 80
                      ? 'Отличное произношение'
                      : resultData.score >= 60
                      ? 'Удовлетворительно'
                      : 'Требуется тренировка'}
                  </span>
                </div>
              </div>

              {/* Processing Stats */}
              <div className="text-xs text-stone-400 space-y-1 text-right sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-800">
                {resultData.processing_time_ms && (
                  <p>
                    Время вычисления:{' '}
                    <span className="text-amber-300 font-mono font-bold">
                      {resultData.processing_time_ms} мс
                    </span>
                  </p>
                )}
                {resultData.audio_duration_sec && (
                  <p>
                    Длительность записи:{' '}
                    <span className="text-amber-300 font-mono">
                      {resultData.audio_duration_sec} с
                    </span>
                  </p>
                )}
                <p>
                  Движок:{' '}
                  <span className="text-emerald-300 font-mono font-semibold">
                    {resultData.engine || 'pronounce-assess'}
                  </span>
                </p>
              </div>
            </div>

            {/* Phoneme Level Breakdown (Section 8: Результаты по фонемам) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Анализ на уровне фонем (IPA Tokens & GOP Scores):
                </span>
                <span className="text-[11px] text-stone-400">
                  Всего фонем: {resultData.phonemes?.length || 0}
                </span>
              </div>

              {resultData.phonemes && resultData.phonemes.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto p-1">
                  {resultData.phonemes.map((item, idx) => {
                    const sc = typeof item.score === 'number' ? Math.round(item.score) : null;
                    const isCorrect = item.label === 'correct' || (sc !== null && sc >= 80);
                    const isMinor = item.label === 'minor_error' || item.label === 'mispronounced';
                    const isOmitted = item.label === 'omitted' || (sc !== null && sc < 50);

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border text-xs min-w-[48px] ${
                          isCorrect
                            ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200'
                            : isMinor
                            ? 'bg-amber-950/70 border-amber-500/70 text-amber-200'
                            : 'bg-rose-950/70 border-rose-500/70 text-rose-200'
                        }`}
                        title={`Фонема: /${item.phoneme}/, Оценка GOP: ${sc !== null ? `${sc}%` : 'N/A'}, Статус: ${item.label || ''}`}
                      >
                        <span className="font-mono text-base font-black">
                          /{item.phoneme}/
                        </span>
                        <span className="text-[10px] font-bold font-mono">
                          {sc !== null ? `${sc}%` : item.label || '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">
                  Фонематический поток пуст (речь была слишком тихой или не зафиксирована).
                </p>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 pt-2 text-[11px] text-stone-400 border-t border-stone-800/80">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  Правильно (≥80)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  С акцентом (60-79)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                  Пропущено / искажено (&lt;60)
                </span>
              </div>
            </div>

            {/* Repeat button */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => {
                  playWoodClick();
                  setUiState('idle');
                }}
                className="px-6 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Произнести ещё раз</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
          <p className="text-xs text-stone-400">
            Оценка производится локальной моделью без отправки аудио во внешние сервисы.
          </p>
          <button
            type="button"
            onClick={() => {
              playWoodClick();
              cleanupRecording();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-bold cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
