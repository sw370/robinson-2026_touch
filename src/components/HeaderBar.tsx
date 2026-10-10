import React, { useState, useEffect } from 'react';
import { KioskMode } from '../types';
import { Compass, HelpCircle, Home, LogOut, Maximize2, Minimize2, Settings, Sparkles, Mic, MicOff, Cpu } from 'lucide-react';
import { playWoodClick } from '../services/audioService';
import { checkMicrophonePermission, MicPermissionState } from '../services/pronunciationService';

interface HeaderBarProps {
  mode: KioskMode;
  onSwitchMode: (mode: KioskMode) => void;
  onOpenInstructions: () => void;
  onResetToHome?: () => void;
  onOpenSettings: () => void;
  onOpenMicCheck: () => void;
  onOpenPronounceTest: () => void;
  showHomeButton?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  mode,
  onSwitchMode,
  onOpenInstructions,
  onResetToHome,
  onOpenSettings,
  onOpenMicCheck,
  onOpenPronounceTest,
  showHomeButton = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [micState, setMicState] = useState<MicPermissionState>('prompt');

  useEffect(() => {
    const updateMicStatus = () => {
      checkMicrophonePermission().then((res) => {
        setMicState(res.state);
      });
    };

    updateMicStatus();
    const interval = setInterval(updateMicStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    playWoodClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <header className="w-full bg-stone-950/90 backdrop-blur-md border-b border-amber-900/40 px-3 sm:px-6 py-2.5 flex items-center justify-between text-stone-100 z-50 shadow-lg">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center border border-amber-400/50 shadow-md shrink-0">
          <Compass className="w-6 h-6 text-amber-200" />
        </div>
        <div>
          <h1 className="text-base sm:text-lg lg:text-xl font-bold tracking-wider uppercase text-amber-200 font-serif-maritime flex items-center gap-2">
            Пещера Робинзона
            <span className="text-[10px] sm:text-xs font-sans tracking-normal px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-300 hidden md:inline">
              Музейный Киоск 1080p
            </span>
          </h1>
          <p className="text-xs text-stone-400 hidden lg:block">
            Интерактивная сенсорная система обучения и проверки
          </p>
        </div>
      </div>

      {/* Screen Mode Switcher (Kiosk Screen 1 vs Screen 2) */}
      <div className="flex items-center bg-stone-900/90 border border-stone-800 p-1 rounded-xl shadow-inner">
        <button
          type="button"
          onClick={() => {
            playWoodClick();
            onSwitchMode('learn');
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer
            ${
              mode === 'learn'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-50 shadow-md font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }
          `}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span className="hidden sm:inline">ЭКРАН 1: </span>
          <span>ОБУЧЕНИЕ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playWoodClick();
            onSwitchMode('check');
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer
            ${
              mode === 'check'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-emerald-50 shadow-md font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }
          `}
        >
          <Compass className="w-4 h-4 text-emerald-300" />
          <span className="hidden sm:inline">ЭКРАН 2: </span>
          <span>ПРОВЕРКА</span>
        </button>
      </div>

      {/* Action Buttons: Mic, Home, Instruction, Fullscreen, Settings */}
      <div className="flex items-center gap-2">
        {/* Microphone status badge & tester */}
        <button
          type="button"
          onClick={() => {
            playWoodClick();
            onOpenMicCheck();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer border ${
            micState === 'granted'
              ? 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-500/60 text-emerald-300'
              : micState === 'denied'
              ? 'bg-rose-950/70 hover:bg-rose-900 border-rose-500/60 text-rose-300'
              : 'bg-amber-950/70 hover:bg-amber-900 border-amber-500/60 text-amber-300'
          }`}
          title="Нажмите для проверки и настройки микрофона"
        >
          {micState === 'granted' ? (
            <>
              <Mic className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Микрофон:</span>
              <span className="text-emerald-300">Готов</span>
            </>
          ) : micState === 'denied' ? (
            <>
              <MicOff className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Микрофон:</span>
              <span className="text-rose-300">Заблокирован</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Микрофон:</span>
              <span className="text-amber-300">Включить</span>
            </>
          )}
        </button>

        {/* Prominent "Return to Home Page" Button for New Visitors */}
        {showHomeButton && onResetToHome && (
          <button
            type="button"
            onClick={() => {
              playWoodClick();
              onResetToHome();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
              mode === 'check'
                ? 'bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/60 text-emerald-200'
                : 'bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/60 text-amber-200'
            }`}
            title="Вернуться на главную страницу и начать заново"
          >
            <Home className={`w-4 h-4 ${mode === 'check' ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="uppercase tracking-wide hidden sm:inline">На главную</span>
          </button>
        )}

        {/* Instruction Button */}
        <button
          type="button"
          onClick={() => {
            playWoodClick();
            onOpenInstructions();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs sm:text-sm font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          title="Инструкция к заданию"
        >
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span className="font-semibold uppercase tracking-wide hidden sm:inline">Инструкция</span>
        </button>

        {/* Fullscreen Toggle for Kiosk */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-300 transition-colors cursor-pointer"
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Test 3 Sentences with pronounce-assess */}
        <button
          type="button"
          onClick={() => {
            playWoodClick();
            onOpenPronounceTest();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-200 text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          title="Тестирование библиотеки pronounce-assess (3 контрольных предложения)"
        >
          <Cpu className="w-4 h-4 text-amber-400" />
          <span className="hidden xl:inline">Тест: </span>
          <span>pronounce-assess</span>
        </button>

        {/* Curator Settings */}
        <button
          type="button"
          onClick={() => {
            playWoodClick();
            onOpenSettings();
          }}
          className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-amber-300 transition-colors cursor-pointer"
          title="Настройки киоска"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

