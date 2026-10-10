import React from 'react';
import { BookOpen, CheckCircle, Compass, Sparkles, Volume2, X } from 'lucide-react';
import { playWoodClick } from '../services/audioService';

export type InstructionContext = 'task1' | 'task2' | 'check' | 'check_words' | 'check_reading';

interface InstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: InstructionContext;
}

export const InstructionModal: React.FC<InstructionModalProps> = ({
  isOpen,
  onClose,
  context = 'task1',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-stone-900 border-2 border-amber-600/70 rounded-3xl p-6 sm:p-8 shadow-2xl text-stone-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-950/80 border border-amber-600/50 rounded-2xl text-amber-300">
              {context === 'task1' ? (
                <Sparkles className="w-6 h-6 text-amber-400" />
              ) : context === 'task2' || context === 'check_reading' ? (
                <BookOpen className="w-6 h-6 text-amber-400" />
              ) : (
                <Compass className="w-6 h-6 text-emerald-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-maritime text-amber-200">
                {context === 'task1'
                  ? 'Инструкция к заданию'
                  : context === 'task2'
                  ? 'Инструкция: Чтение дневника'
                  : context === 'check_reading'
                  ? 'Инструкция: Проверка чтения'
                  : 'Инструкция: Проверка знаний'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playWoodClick();
              onClose();
            }}
            className="p-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-6 space-y-6 text-base sm:text-lg leading-relaxed">
          {context === 'task1' ? (
            /* ================= TASK 1 INSTRUCTION ================= */
            <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-700/50">
              <ul className="space-y-3.5 text-stone-200">
                <li className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span>Коснитесь любого предмета, чтобы открыть английское слово и запомнить его.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span>
                    Нажмите <span className="text-amber-300 font-bold">«Послушать произношение»</span>, чтобы услышать правильное английское произношение.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span>
                    После того, как вы запомнили слово, нажмите кнопку <span className="text-amber-300 font-bold">«Запомнил»</span>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span className="text-amber-200 font-medium">Вы сможете проверить свою память на другом экране в конце зала.</span>
                </li>
              </ul>
            </div>
          ) : context === 'task2' ? (
            /* ================= TASK 2 INSTRUCTION ================= */
            <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-700/50">
              <ul className="space-y-3.5 text-stone-200">
                <li className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span>
                    Перед вами страницы подлинного дневника Робинзона Крузо. Нажмите кнопку <span className="text-amber-300 font-bold">«🔊 Прослушать»</span>, чтобы услышать английскую речь.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span>
                    Во время воспроизведения произносимые слова подсвечиваются прямо в тексте.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span>
                    Коснитесь любого английского слова: вы услышите его отдельное звучание, а в русском переводе ниже подсветится точное соответствие или фраза по смыслу.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span>
                    Когда текст усвоен, нажмите кнопку <span className="text-amber-300 font-bold">«Запомнил»</span>, чтобы перейти к следующему фрагменту. К уже выученным отрывкам можно всегда вернуться для повторения.
                  </span>
                </li>
              </ul>
            </div>
          ) : context === 'check_reading' ? (
            /* ================= CHECK READING INSTRUCTION ================= */
            <>
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-700/40">
                <ul className="space-y-3.5 text-stone-200">
                  <li className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <span>
                      Выберите отрывок из дневника Робинзона и нажмите <span className="font-bold text-emerald-300">«Начать чтение»</span>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <span>
                      Читайте английский текст вслух чётко и спокойно в микрофон киоска.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <span>
                      Когда закончите чтение, нажмите <span className="font-bold text-rose-300">«Завершить и проверить»</span>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <span>
                      Система оценит точность произношения каждого слова. Коснитесь любого слова, чтобы услышать его правильный образец.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950 border border-emerald-900/40 flex items-center gap-3">
                <Volume2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <p className="text-xs sm:text-sm text-stone-300">
                  Совет: говорите чётко, на расстоянии 20–30 см от экрана.
                </p>
              </div>
            </>
          ) : (
            /* ================= SCREEN 2 (CHECK WORDS) INSTRUCTION ================= */
            <>
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-700/40">
                <ul className="space-y-3.5 text-stone-200">
                  <li className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <span>
                      В овале прямо поверх пещеры появляется английское слово (например, <span className="font-bold text-amber-200">COMPASS</span>).
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <span>Вспомните, что оно означает, и коснитесь соответствующего предмета в пещере!</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <span>
                      После нахождения предмета нажмите <span className="text-emerald-300 font-bold">«ПРОИЗНЕСТИ СЛОВО»</span> для проверки навыка произношения.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <span>В конце вас ждёт итоговая ведомость исследователя и Сертификат Робинзона!</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950 border border-emerald-900/40 flex items-center gap-3">
                <Volume2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <p className="text-xs sm:text-sm text-stone-300">
                  Совет: говорите чётко, на расстоянии 20–30 см от экрана.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-8 pt-4 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={() => {
              playWoodClick();
              onClose();
            }}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-bold text-base sm:text-lg shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            Понятно, приступить
          </button>
        </div>
      </div>
    </div>
  );
};
