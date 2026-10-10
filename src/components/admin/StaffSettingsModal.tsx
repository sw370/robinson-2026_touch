import React, { useState, useEffect } from 'react';
import { KioskMode } from '../../types';
import { Settings, Shield, Volume2, RotateCcw, X, Check, Laptop, Sparkles, Loader2 } from 'lucide-react';
import {
  speakEnglish,
  playSuccessChime,
  playWoodClick,
  setGoogleVoice,
  getGoogleVoice,
  generateAllAudioFiles,
  checkAudioLibraryStatus,
} from '../../services/audioService';

interface StaffSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: KioskMode;
  onSetMode: (mode: KioskMode) => void;
  isModeLocked: boolean;
  onToggleModeLock: (locked: boolean) => void;
  inactivityTimeout: number;
  onSetInactivityTimeout: (seconds: number) => void;
  onFullReset: () => void;
  onOpenMicCheck?: () => void;
  onOpenPronounceTest?: () => void;
}

const GOOGLE_VOICES = [
  { id: 'Fenrir', name: 'Fenrir (Рекомендуется)', desc: 'Глубокий британский голос первооткрывателя, идеален для темы Робинзона' },
  { id: 'Puck', name: 'Puck', desc: 'Яркий, чёткий и выразительный тембр рассказчика' },
  { id: 'Charon', name: 'Charon', desc: 'Благородный, спокойный и бархатный баритон' },
  { id: 'Kore', name: 'Kore', desc: 'Тёплый, чистый и мелодичный голос' },
  { id: 'Zephyr', name: 'Zephyr', desc: 'Мягкий, интеллигентный студийный голос' },
];

export const StaffSettingsModal: React.FC<StaffSettingsModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSetMode,
  isModeLocked,
  onToggleModeLock,
  inactivityTimeout,
  onSetInactivityTimeout,
  onFullReset,
  onOpenMicCheck,
}) => {
  const [testSpeechText, setTestSpeechText] = useState('Welcome to the island cave of Robinson Crusoe');
  const [selectedVoice, setSelectedVoiceState] = useState<string>(getGoogleVoice());
  const [pythonServerUrl, setPythonServerUrl] = useState('http://127.0.0.1:8000');
  const [pythonStatus, setPythonStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');
  const [audioStatus, setAudioStatus] = useState<{ diskFiles: string[]; totalItems: number; cachedInMemory: number; hasGeminiKey: boolean } | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkAudioLibraryStatus().then(setAudioStatus);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoiceState(voiceId);
    setGoogleVoice(voiceId);
    speakEnglish(`Selected voice: ${voiceId}`);
  };

  const handleBatchGenerate = async () => {
    setIsBatchGenerating(true);
    setBatchMessage('Идёт обращение к Gemini 3.8 TTS и сохранение 10 аудиодорожек...');
    const res = await generateAllAudioFiles(selectedVoice);
    setIsBatchGenerating(false);

    if (res.success) {
      playSuccessChime();
      const updated = await checkAudioLibraryStatus();
      setAudioStatus(updated);
      setBatchMessage('✅ Все фразы успешно сгенерированы и сохранены на диск!');
    } else {
      setBatchMessage(
        res.error ||
          'Не удалось выполнить генерацию. Убедитесь, что GEMINI_API_KEY добавлен в панель Secrets.'
      );
    }
  };

  const testTTS = () => {
    speakEnglish(testSpeechText);
  };

  const checkPythonBackend = async () => {
    setPythonStatus('checking');
    try {
      await fetch(`${pythonServerUrl}/docs`, { mode: 'no-cors' });
      setPythonStatus('online');
      playSuccessChime();
    } catch {
      setPythonStatus('offline');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-stone-900 border-2 border-stone-700 rounded-3xl p-6 sm:p-8 text-stone-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-stone-800 rounded-2xl text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif-maritime text-stone-100">
                Служебная панель киоска
              </h2>
              <p className="text-xs text-stone-400">Настройки для оператора музея / инженера выставки</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playWoodClick();
              onClose();
            }}
            className="p-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {/* Mode Lock */}
          <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-3">
            <h3 className="font-semibold text-stone-200 text-sm flex items-center justify-between">
              <span>Режим этого сенсорного экрана:</span>
              <span className="text-xs text-amber-400 font-mono">
                {isModeLocked ? '🔒 Заблокирован' : '🔓 Свободное переключение'}
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  playWoodClick();
                  onSetMode('learn');
                }}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all
                  ${
                    currentMode === 'learn'
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                  }
                `}
              >
                <span>ЭКРАН 1: ВХОД / ОБУЧЕНИЕ</span>
                {currentMode === 'learn' && <Check className="w-4 h-4 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  playWoodClick();
                  onSetMode('check');
                }}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all
                  ${
                    currentMode === 'check'
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                  }
                `}
              >
                <span>ЭКРАН 2: ВЫХОД / ПРОВЕРКА</span>
                {currentMode === 'check' && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-stone-400">
                Зафиксировать режим (скрыть переключатель от посетителей):
              </span>
              <button
                type="button"
                onClick={() => onToggleModeLock(!isModeLocked)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  isModeLocked
                    ? 'bg-amber-600 text-stone-950 border-amber-400'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                {isModeLocked ? 'Включено' : 'Выключено'}
              </button>
            </div>
          </div>

          {/* AI Voice Selection & Speech Engine */}
          <div className="p-4 rounded-2xl bg-stone-950/70 border border-amber-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-amber-200 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Студийная озвучка Google Gemini AI (gemini-3.8-flash-lite-tts)
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700 text-amber-300 font-mono">
                24kHz Studio WAV
              </span>
            </div>

            <p className="text-xs text-stone-300">
              Вместо роботизированного браузерного синтезатора теперь используется студийный искусственный интеллект Google с естественным дыханием, аутентичным тембром и живым произношением:
            </p>

            <div className="space-y-2 pt-1">
              {GOOGLE_VOICES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleVoiceChange(v.id)}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                    selectedVoice === v.id
                      ? 'bg-amber-600/25 border-amber-400 text-amber-200 shadow-md'
                      : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm block">{v.name}</span>
                    <span className="text-xs text-stone-400">{v.desc}</span>
                  </div>
                  {selectedVoice === v.id && <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={testSpeechText}
                onChange={(e) => setTestSpeechText(e.target.value)}
                className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200"
              />
              <button
                type="button"
                onClick={testTTS}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-md"
              >
                Прослушать голос
              </button>
            </div>

            {/* Batch Pre-generation */}
            <div className="pt-3 border-t border-amber-900/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-300">
                  Сохранённые аудиофайлы (для работы без задержек):
                </span>
                <span className="text-xs font-mono text-amber-300">
                  {audioStatus ? `${audioStatus.diskFiles.length} из ${audioStatus.totalItems} файлов на диске` : 'Загрузка...'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleBatchGenerate}
                disabled={isBatchGenerating}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isBatchGenerating
                    ? 'bg-amber-950/60 border-amber-600/50 text-amber-300 animate-pulse'
                    : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-600/60 text-amber-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  {isBatchGenerating
                    ? 'Генерация всех 10 фраз через Gemini 3.8 TTS...'
                    : '⚡ Сгенерировать и сохранить все фразы через Gemini 3.8 TTS'}
                </span>
              </button>

              {batchMessage && (
                <p className="text-xs text-amber-300/90 mt-2 text-center bg-black/40 p-2 rounded-lg border border-amber-900/40">
                  {batchMessage}
                </p>
              )}
            </div>
          </div>

          {/* Inactivity Timeout */}
          <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 flex items-center justify-between">
            <div>
              <p className="font-semibold text-stone-200 text-sm">Таймаут сброса при бездействии</p>
              <p className="text-xs text-stone-400">По умолчанию 3 минуты (180 сек)</p>
            </div>
            <select
              value={inactivityTimeout}
              onChange={(e) => onSetInactivityTimeout(Number(e.target.value))}
              className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm text-amber-300 focus:outline-none"
            >
              <option value={60}>1 минута (60 с)</option>
              <option value={180}>3 минуты (180 с) — рекомендуемо</option>
              <option value={300}>5 минут (300 с)</option>
              <option value={600}>10 минут (600 с)</option>
            </select>
          </div>

          {/* Microphone Diagnostic & Hardware Test */}
          <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-stone-200 text-sm flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                Микрофон и захват голоса посетителей
              </p>
              <button
                type="button"
                onClick={() => {
                  playWoodClick();
                  if (onOpenMicCheck) onOpenMicCheck();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
              >
                <span>Проверить микрофон и уровень звука</span>
              </button>
            </div>
            <p className="text-xs text-stone-400">
              Проверьте работу микрофона, разрешение в браузере и визуализатор громкости звука в реальном времени.
            </p>
          </div>

          {/* Pronunciation Engine Selector & pronounce-assess Settings */}
          <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-stone-200 text-sm flex items-center gap-2">
                <Laptop className="w-4 h-4 text-emerald-400" />
                Движок оценки произношения:
              </p>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-600 text-emerald-300 font-bold">
                По умолчанию: pronounce-assess
              </span>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              По требованию текущий способ (Gemini) сохранён, но временно отключён в пользу локального
              оценщика <strong>pronounce-assess</strong> (фонемный уровень, без облака).
            </p>

            {/* Test 3 sentences button */}
            {onOpenPronounceTest && (
              <button
                type="button"
                onClick={() => {
                  playWoodClick();
                  onOpenPronounceTest();
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md"
              >
                <span>Запустить тест 3 предложений (pronounce-assess)</span>
              </button>
            )}

            <div className="pt-2 border-t border-stone-800/80 space-y-2">
              <span className="text-xs font-bold text-stone-300 block">
                Локальный Python сервер (http://127.0.0.1:8000):
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pythonServerUrl}
                  onChange={(e) => setPythonServerUrl(e.target.value)}
                  placeholder="http://127.0.0.1:8000"
                  className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-200 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={checkPythonBackend}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-xs font-semibold"
                >
                  {pythonStatus === 'checking' ? 'Проверка...' : 'Проверить'}
                </button>
              </div>
              <p className="text-[11px] text-stone-400">
                Запуск на музейном ПК: <code>cd python-backend && python server.py</code>
              </p>
            </div>
          </div>

          {/* Hard Reset */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Сбросить все сохранённые результаты и вернуться на главный экран?')) {
                  onFullReset();
                  onClose();
                }
              }}
              className="w-full py-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-rose-300 text-sm font-bold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Полный сброс сеанса и памяти</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
