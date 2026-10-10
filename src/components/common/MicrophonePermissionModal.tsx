import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Volume2,
  X,
  RefreshCw,
  HelpCircle,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import {
  checkMicrophonePermission,
  requestMicrophoneAccess,
  isPageInIframe,
  MicPermissionState,
} from '../../services/pronunciationService';
import { playWoodClick, playSuccessChime } from '../../services/audioService';

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialError?: string | null;
  onPermissionGranted?: () => void;
}

export const MicrophonePermissionModal: React.FC<MicrophonePermissionModalProps> = ({
  isOpen,
  onClose,
  initialError,
  onPermissionGranted,
}) => {
  const [permissionState, setPermissionState] = useState<MicPermissionState>('prompt');
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  const [inIframe, setInIframe] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'chrome' | 'yandex' | 'safari' | 'edge'>('chrome');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialError) {
      setErrorMessage(initialError);
    }
  }, [initialError]);

  useEffect(() => {
    if (!isOpen) {
      stopLiveAudio();
      return;
    }

    setInIframe(isPageInIframe());
    checkMicrophonePermission().then((res) => {
      setPermissionState(res.state);
      if (res.state === 'granted') {
        startLiveAudioMeter();
      }
    });

    return () => {
      stopLiveAudio();
    };
  }, [isOpen]);

  const stopLiveAudio = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setIsLiveListening(false);
    setAudioLevel(0);
  };

  const startLiveAudioMeter = async (existingStream?: MediaStream) => {
    try {
      stopLiveAudio();
      const stream = existingStream || (await navigator.mediaDevices.getUserMedia({ audio: true }));
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsLiveListening(true);
      setPermissionState('granted');
      setErrorMessage(null);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        // Normalize roughly between 0 and 100
        const normalized = Math.min(100, Math.round((avg / 80) * 100));
        setAudioLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      animFrameRef.current = requestAnimationFrame(updateLevel);
    } catch (e: any) {
      console.warn('Live audio meter start failed:', e);
    }
  };

  const handleRequestPermission = async () => {
    playWoodClick();
    setIsRequesting(true);
    setErrorMessage(null);

    const result = await requestMicrophoneAccess();
    setIsRequesting(false);

    if (result.granted && result.stream) {
      playSuccessChime();
      setPermissionState('granted');
      startLiveAudioMeter(result.stream);
      if (onPermissionGranted) {
        onPermissionGranted();
      }
    } else {
      setPermissionState(result.errorType === 'denied' ? 'denied' : 'prompt');
      setErrorMessage(result.errorMessage || 'Не удалось получить разрешение на доступ к микрофону.');
    }
  };

  const handleOpenInNewTab = () => {
    playWoodClick();
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div
        className="relative w-full max-w-xl bg-stone-900 border-2 border-amber-600/70 rounded-3xl p-5 sm:p-7 text-stone-100 shadow-2xl max-h-[92vh] flex flex-col justify-between overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl border ${
                permissionState === 'granted'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                  : permissionState === 'denied'
                  ? 'bg-rose-950/80 border-rose-500 text-rose-400'
                  : 'bg-amber-950/80 border-amber-500 text-amber-400'
              }`}
            >
              {permissionState === 'granted' ? (
                <Mic className="w-6 h-6 animate-pulse" />
              ) : permissionState === 'denied' ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Sliders className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-maritime text-stone-100">
                Доступ к микрофону
              </h2>
              <p className="text-xs text-stone-400">
                Для оценки произношения английских слов и чтения дневника
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playWoodClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="my-5 space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800">
            <span className="text-sm text-stone-300">Статус в браузере:</span>
            <div className="flex items-center gap-2">
              {permissionState === 'granted' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Разрешено
                </span>
              ) : permissionState === 'denied' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/60 text-rose-300 text-xs font-bold uppercase tracking-wider">
                  <MicOff className="w-3.5 h-3.5" />
                  Заблокировано
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/60 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Ожидает клика
                </span>
              )}
            </div>
          </div>

          {/* Error / Alert notification banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs sm:text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Почему не включилось?</span>
                <p className="text-rose-300 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Active Live Sound Meter */}
          {permissionState === 'granted' && isLiveListening ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/50 space-y-3">
              <div className="flex items-center justify-between text-xs text-emerald-300">
                <span className="flex items-center gap-2 font-bold">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  Микрофон активен — скажите что-нибудь:
                </span>
                <span className="font-mono">{audioLevel}%</span>
              </div>

              {/* VU-meter bars */}
              <div className="flex items-center gap-1.5 h-8 px-2 bg-stone-950/90 rounded-xl border border-stone-800">
                {Array.from({ length: 20 }).map((_, i) => {
                  const threshold = (i / 20) * 100;
                  const active = audioLevel >= threshold;
                  const isRed = i >= 16;
                  const isYellow = i >= 12 && i < 16;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm transition-all duration-75 ${
                        active
                          ? isRed
                            ? 'h-6 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                            : isYellow
                            ? 'h-5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                            : 'h-4 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : 'h-1.5 bg-stone-800'
                      }`}
                    />
                  );
                })}
              </div>

              <p className="text-[11px] text-stone-400 text-center">
                Зеленые полоски двигаются в такт вашему голосу — звук поступает отлично!
              </p>
            </div>
          ) : (
            /* Big Button to request permission */
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-base sm:text-lg uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                {isRequesting ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
                <span>
                  {isRequesting
                    ? 'Запрос доступа...'
                    : 'РАЗРЕШИТЬ ДОСТУП К МИКРОФОНУ'}
                </span>
              </button>

              <p className="text-xs text-stone-400 text-center leading-relaxed">
                По правилам безопасности браузер показывает всплывающее окно
                <strong> «Разрешить сайту использовать микрофон?» </strong>
                только при нажатии на эту кнопку.
              </p>
            </div>
          )}

          {/* Iframe Hint & Open in New Tab Button */}
          {inIframe && (
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-700/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 text-stone-300">
                <span className="font-bold text-amber-300 block">
                  Приложение открыто в окне предпросмотра (iframe)
                </span>
                <span className="text-stone-400">
                  Некоторые браузеры блокируют микрофон внутри фрейма. Откройте в отдельной вкладке:
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold whitespace-nowrap active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Открыть в новой вкладке</span>
              </button>
            </div>
          )}

          {/* Step-by-Step Instructions Tabs */}
          <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                Как разблокировать микрофон в браузере:
              </span>
            </div>

            {/* Browser Selector Tabs */}
            <div className="flex rounded-xl bg-stone-900 p-1 border border-stone-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('chrome')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'chrome'
                    ? 'bg-amber-600 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Chrome
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('yandex')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'yandex'
                    ? 'bg-amber-600 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Яндекс
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('safari')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'safari'
                    ? 'bg-amber-600 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Safari
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('edge')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'edge'
                    ? 'bg-amber-600 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Edge
              </button>
            </div>

            {/* Instruction content per browser */}
            <div className="text-xs text-stone-300 space-y-2 leading-relaxed bg-stone-900/60 p-3 rounded-xl border border-stone-800/80">
              {activeTab === 'chrome' && (
                <ol className="list-decimal list-inside space-y-1 text-stone-300">
                  <li>
                    Слева в адресной строке нажмите значок <strong>«Настройки сайта»</strong> (ползунки / замочек рядом с адресом).
                  </li>
                  <li>
                    Найдите пункт <strong>«Микрофон»</strong> и переключите в <strong>«Разрешить»</strong> (Allow).
                  </li>
                  <li>Обновите страницу (клавиша F5 или Ctrl+R).</li>
                </ol>
              )}

              {activeTab === 'yandex' && (
                <ol className="list-decimal list-inside space-y-1 text-stone-300">
                  <li>
                    Нажмите на значок <strong>замка</strong> в адресной строке слева.
                  </li>
                  <li>
                    В пункте <strong>«Разрешения»</strong> включите тумблер <strong>«Микрофон»</strong>.
                  </li>
                  <li>Обновите страницу браузера.</li>
                </ol>
              )}

              {activeTab === 'safari' && (
                <ol className="list-decimal list-inside space-y-1 text-stone-300">
                  <li>
                    В верхнем меню выберите <strong>Safari</strong> → <strong>«Настройки для этого веб-сайта»</strong>.
                  </li>
                  <li>
                    В строке <strong>«Микрофон»</strong> установите <strong>«Разрешить»</strong>.
                  </li>
                  <li>Перезагрузите вкладку.</li>
                </ol>
              )}

              {activeTab === 'edge' && (
                <ol className="list-decimal list-inside space-y-1 text-stone-300">
                  <li>
                    Нажмите на значок <strong>замка</strong> слева от URL-адреса.
                  </li>
                  <li>
                    В раскрывающемся списке <strong>«Разрешения для этого сайта»</strong> выберите для микрофона <strong>«Разрешить»</strong>.
                  </li>
                  <li>Обновите страницу.</li>
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              playWoodClick();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-bold active:scale-95 transition-all cursor-pointer"
          >
            {permissionState === 'granted' ? 'Готово' : 'Закрыть'}
          </button>
        </div>
      </div>
    </div>
  );
};
