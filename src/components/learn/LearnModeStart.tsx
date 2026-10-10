import React from 'react';
import { BookOpen, Compass, Sparkles, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { playWoodClick } from '../../services/audioService';

interface LearnModeStartProps {
  onSelectTask1: () => void;
  onSelectTask2: () => void;
  onOpenInstructions: () => void;
  onResetProgress?: () => void;
  studiedCount: number;
  totalWords: number;
}

export const LearnModeStart: React.FC<LearnModeStartProps> = ({
  onSelectTask1,
  onSelectTask2,
  onOpenInstructions,
  onResetProgress,
  studiedCount,
  totalWords,
}) => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden">
      {/* Background Cave Illustration with Dimming Overlay (Requirement 3.1) */}
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
          {/* Badge hidden per request */}
          <div className="hidden inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-sm font-semibold backdrop-blur-md">
            <Compass className="w-4 h-4 text-amber-300" />
            <span>ВХОД В ЭКСПОЗИЦИЮ • ОБУЧЕНИЕ</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-serif-maritime text-amber-100 tracking-wider drop-shadow-2xl">
            Пещера Робинзона
          </h1>

          {/* Clean subtitle text without background card or border, continuation of title */}
          <div className="max-w-2xl mx-auto space-y-1.5">
            <p className="text-xl sm:text-2xl text-stone-200 font-medium">
              Перед тобой два задания.
            </p>
            <p className="text-base sm:text-lg text-amber-200/90 leading-relaxed">
              Ты можешь выполнить одно из них или оба перед&nbsp;путешествием&nbsp;по&nbsp;выставке.
            </p>

            {/* "Начать сначала" button appears under subtitle ONLY if there is ongoing progress */}
            {studiedCount > 0 && onResetProgress && (
              <div className="pt-3 flex justify-center animate-fade-in">
                <button
                  type="button"
                  onClick={() => {
                    playWoodClick();
                    onResetProgress();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-stone-900/90 hover:bg-stone-800 border border-amber-600/70 text-amber-300 hover:text-amber-200 text-sm font-bold shadow-lg transition-all active:scale-95 cursor-pointer"
                  title="Сбросить прогресс и начать сначала"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Начать сначала</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Big Touch Buttons for Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-4">
          {/* TASK 1: Words in Cave */}
          <button
            type="button"
            onClick={() => {
              playWoodClick();
              onSelectTask1();
            }}
            className="group relative text-left p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-stone-900/90 to-stone-950/95 border-2 border-amber-600/70 hover:border-amber-400 shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer flex flex-col justify-between"
          >
            {/* Icon hidden per request */}
            <div className="hidden absolute top-4 right-4 p-2.5 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-300">
              <Sparkles className="w-7 h-7 text-amber-400" />
            </div>

            <div className="space-y-3">
              {/* Task label hidden per request */}
              <span className="hidden px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black tracking-widest uppercase">
                ЗАДАНИЕ 1
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-serif-maritime text-stone-100 group-hover:text-amber-200 transition-colors">
                Запомни слова
              </h2>
              <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
                Исследуй предметы в пещере Робинзона. Коснись каждого предмета, чтобы услышать и запомнить его английское название.
              </p>
            </div>

            {/* Bottom centered oval button */}
            <div className="mt-8 pt-4 border-t border-stone-800/80 flex items-center justify-center">
              <span className="px-10 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 group-hover:from-amber-400 group-hover:to-amber-500 text-stone-950 font-bold text-base shadow-lg transition-all transform group-hover:scale-105">
                Начать
              </span>
            </div>
          </button>

          {/* TASK 2: Reading Excerpts */}
          <button
            type="button"
            onClick={() => {
              playWoodClick();
              onSelectTask2();
            }}
            className="group relative text-left p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-stone-900/90 to-stone-950/95 border-2 border-amber-700/60 hover:border-amber-400 shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer flex flex-col justify-between"
          >
            {/* Icon hidden per request */}
            <div className="hidden absolute top-4 right-4 p-2.5 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-300">
              <BookOpen className="w-7 h-7 text-amber-400" />
            </div>

            <div className="space-y-3">
              {/* Task label hidden per request */}
              <span className="hidden px-3 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-xs font-black tracking-widest uppercase">
                ЗАДАНИЕ 2
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-serif-maritime text-stone-100 group-hover:text-amber-200 transition-colors">
                Прочитай фрагмент
              </h2>
              <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
                Прочитай короткие записи из подлинного дневника Робинзона Крузо. И потом проверь точность своего произношения на другом экране.
              </p>
            </div>

            {/* Bottom centered oval button */}
            <div className="mt-8 pt-4 border-t border-stone-800/80 flex items-center justify-center">
              <span className="px-10 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 group-hover:from-amber-400 group-hover:to-amber-500 text-stone-950 font-bold text-base shadow-lg transition-all transform group-hover:scale-105">
                Начать
              </span>
            </div>
          </button>
        </div>

        {/* Small Instruction Button (hidden per request) */}
        <div className="hidden pt-2">
          <button
            type="button"
            onClick={() => {
              playWoodClick();
              onOpenInstructions();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-stone-900/80 hover:bg-stone-800 border border-amber-900/50 text-stone-300 hover:text-amber-200 text-sm font-bold shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>ИНСТРУКЦИЯ И ПРАВИЛА</span>
          </button>
        </div>
      </div>
    </div>
  );
};
