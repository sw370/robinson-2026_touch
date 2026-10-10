import React from 'react';
import { Timer, Touchpad } from 'lucide-react';
import { playWoodClick } from '../../services/audioService';

interface KioskResetCountdownProps {
  secondsRemaining: number;
  onKeepActive: () => void;
}

export const KioskResetCountdown: React.FC<KioskResetCountdownProps> = ({
  secondsRemaining,
  onKeepActive,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="relative w-full max-w-md bg-stone-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <Timer className="w-8 h-8 animate-pulse" />
        </div>

        <h3 className="text-xl sm:text-2xl font-bold font-serif-maritime text-amber-200 mb-2">
          Вы ещё здесь?
        </h3>
        <p className="text-stone-300 text-sm mb-6">
          Автоматический возврат на заставку через{' '}
          <span className="font-extrabold text-amber-400 text-xl">{secondsRemaining}</span> сек.
        </p>

        <button
          type="button"
          onClick={() => {
            playWoodClick();
            onKeepActive();
          }}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-extrabold text-lg uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <Touchpad className="w-6 h-6" />
          <span>Я здесь, продолжить</span>
        </button>
      </div>
    </div>
  );
};
