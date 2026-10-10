import React from 'react';
import { Compass, BookOpen, Sparkles, HelpCircle } from 'lucide-react';
import { playWoodClick } from '../../services/audioService';

interface CheckModeStartProps {
  onSelectCheckWords: () => void;
  onSelectCheckReading: () => void;
  onOpenInstructions: () => void;
}

export const CheckModeStart: React.FC<CheckModeStartProps> = ({
  onSelectCheckWords,
  onSelectCheckReading,
  onOpenInstructions,
}) => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden select-none">
      {/* Background Cave Illustration with Dimming Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/assets/cave.jpg"
          alt="Пещера Робинзона"
          className="w-full h-full object-cover brightness-[0.4] filter blur-[2px] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-stone-950/40" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-4xl text-center space-y-8 animate-fade-in">
        {/* Badge & Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-serif-maritime text-amber-100 tracking-wider drop-shadow-2xl">
            Пещера Робинзона
          </h1>

          {/* Clean subtitle text without background card or border, continuation of title */}
          <div className="max-w-2xl mx-auto space-y-1.5">
            <p className="text-xl sm:text-2xl text-stone-200 font-medium">
              Перед тобой два испытания на выходе из экспозиции.
            </p>
            <p className="text-base sm:text-lg text-emerald-200/90 leading-relaxed">
              Выбери, что именно ты хочешь проверить сейчас:
            </p>
          </div>
        </div>

        {/* Big Touch Buttons for Check Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-4">
          {/* TASK 1: Check Words in Cave */}
          <button
            type="button"
            onClick={() => {
              playWoodClick();
              onSelectCheckWords();
            }}
            className="group relative text-left p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-stone-900/90 to-stone-950/95 border-2 border-emerald-600/70 hover:border-emerald-400 shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-serif-maritime text-stone-100 group-hover:text-emerald-200 transition-colors">
                Найди предметы в пещере
              </h2>
              <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
                Вспомни предметы, которые ты видел в пещере Робинзона. Найди их по английским названиям и проверь точность своего произношения в микрофон.
              </p>
            </div>

            {/* Bottom centered oval button */}
            <div className="mt-8 pt-4 border-t border-stone-800/80 flex items-center justify-center">
              <span className="px-10 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 group-hover:from-emerald-400 group-hover:to-emerald-500 text-stone-950 font-bold text-base shadow-lg transition-all transform group-hover:scale-105">
                Начать
              </span>
            </div>
          </button>

          {/* TASK 2: Check Reading Excerpt */}
          <button
            type="button"
            onClick={() => {
              playWoodClick();
              onSelectCheckReading();
            }}
            className="group relative text-left p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-stone-900/90 to-stone-950/95 border-2 border-emerald-700/60 hover:border-emerald-400 shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-serif-maritime text-stone-100 group-hover:text-emerald-200 transition-colors">
                Прочитай фрагмент
              </h2>
              <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
                Прочитай вслух отрывок из дневника Робинзона Крузо и проверь правильность своего чтения и произношения каждого слова в микрофон.
              </p>
            </div>

            {/* Bottom centered oval button */}
            <div className="mt-8 pt-4 border-t border-stone-800/80 flex items-center justify-center">
              <span className="px-10 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 group-hover:from-emerald-400 group-hover:to-emerald-500 text-stone-950 font-bold text-base shadow-lg transition-all transform group-hover:scale-105">
                Начать
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
