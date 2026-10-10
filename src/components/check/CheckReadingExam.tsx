import React, { useState, useRef, useEffect } from 'react';
import { READING_TEXTS } from '../../data/readingTexts';
import { recordAndAssessReading, PronunciationResult } from '../../services/pronunciationService';
import {
  speakEnglish,
  playWoodClick,
  playSuccessChime,
  playErrorThud,
  playCompletionFanfare,
  stopSpeech,
} from '../../services/audioService';
import {
  Mic,
  Square,
  Volume2,
  RotateCcw,
  Home,
  HelpCircle,
  BookOpen,
  CheckCircle,
  ArrowRight,
  Loader2,
  Award,
} from 'lucide-react';
import { WordScore } from '../../types';

interface CheckReadingExamProps {
  onOpenInstructions: () => void;
  onResetToHome: () => void;
  onOpenMicCheck?: (errorMessage?: string) => void;
}

export const CheckReadingExam: React.FC<CheckReadingExamProps> = ({
  onOpenInstructions,
  onResetToHome,
  onOpenMicCheck,
}) => {
  const [currentExcerptIndex, setCurrentExcerptIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<PronunciationResult | null>(null);
  const [activeWordPlaying, setActiveWordPlaying] = useState<string | null>(null);
  const [completedExcerptIds, setCompletedExcerptIds] = useState<number[]>([]);

  const activeRecorderRef = useRef<{ stop: () => Promise<PronunciationResult> } | null>(null);
  const currentExcerpt = READING_TEXTS[currentExcerptIndex];
  const isCurrentCompleted = completedExcerptIds.includes(currentExcerpt.id);

  useEffect(() => {
    return () => {
      stopSpeech();
      if (activeRecorderRef.current) {
        try {
          activeRecorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const handleStartRecording = () => {
    playWoodClick();
    stopSpeech();
    setEvaluationResult(null);
    setInterimText('');
    setIsRecording(true);

    const recorder = recordAndAssessReading(
      currentExcerpt.english,
      (interim) => {
        setInterimText(interim);
      },
      (errorMsg) => {
        setIsRecording(false);
        if (onOpenMicCheck) {
          onOpenMicCheck(errorMsg);
        }
      }
    );
    activeRecorderRef.current = recorder;
  };

  const handleStopRecording = async () => {
    playWoodClick();
    if (!activeRecorderRef.current) {
      setIsRecording(false);
      return;
    }

    setIsRecording(false);
    setIsAssessing(true);

    try {
      const result = await activeRecorderRef.current.stop();
      activeRecorderRef.current = null;
      setIsAssessing(false);
      setEvaluationResult(result);

      if (result.score >= 70) {
        playSuccessChime();
        setCompletedExcerptIds((prev) =>
          prev.includes(currentExcerpt.id) ? prev : [...prev, currentExcerpt.id]
        );
      } else {
        playWoodClick();
      }
    } catch (e) {
      console.error('Reading assessment stop error:', e);
      setIsAssessing(false);
    }
  };

  const handlePlayWord = (word: string) => {
    playWoodClick();
    setActiveWordPlaying(word);
    speakEnglish(word);
    setTimeout(() => {
      setActiveWordPlaying(null);
    }, 1200);
  };

  const handleSelectExcerpt = (index: number) => {
    if (isRecording) {
      handleStopRecording();
    }
    playWoodClick();
    stopSpeech();
    setCurrentExcerptIndex(index);
    setEvaluationResult(null);
    setInterimText('');
  };

  const handleNextExcerpt = () => {
    if (currentExcerptIndex < READING_TEXTS.length - 1) {
      handleSelectExcerpt(currentExcerptIndex + 1);
    } else {
      handleSelectExcerpt(0);
    }
  };

  const handleRetry = () => {
    playWoodClick();
    stopSpeech();
    setEvaluationResult(null);
    setInterimText('');
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-5 select-none overflow-hidden">
      {/* Background Cave Image with Dark Atmospheric Overlay (Matches Task 2) */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/assets/cave.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/75 pointer-events-none backdrop-blur-[1px]" />

      {/* Top Navigation Bar (Matches Task 2) */}
      <div className="relative flex items-center justify-between z-10 px-2">
        <button
          type="button"
          onClick={() => {
            playWoodClick();
            stopSpeech();
            onResetToHome();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-200 text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md cursor-pointer"
          title="Вернуться на главную страницу"
        >
          <Home className="w-4 h-4 text-emerald-400" />
          <span>На главную страницу</span>
        </button>

        <div />
      </div>

      {/* Main Parchment Diary Area (Matches Task 2 exactly: 2px border, clean typography) */}
      <div className="relative flex-1 flex items-center justify-center my-1.5 max-w-5xl mx-auto w-full z-10">
        <div className="relative w-full rounded-3xl p-6 sm:p-8 md:p-9 shadow-2xl border-2 border-emerald-900/60 bg-[#1c1815] bg-opacity-95 text-stone-200 flex flex-col justify-between max-h-[70vh] overflow-y-auto">
          {/* Decorative Parchment Header */}
          <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-serif-maritime text-emerald-200">
                  {currentExcerpt.title}
                </h2>
                <p className="text-xs text-emerald-400/80">
                  {currentExcerpt.subtitle} • {currentExcerpt.period}
                </p>
              </div>
            </div>

            {/* Right Group: Score Badge (if assessed) + «Инструкция» + «Отрывок Х из Y» */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {evaluationResult && (
                <div
                  className={`px-3 py-1.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-inner ${
                    evaluationResult.score >= 85
                      ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300'
                      : evaluationResult.score >= 70
                      ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-400'
                      : 'bg-rose-950/90 border-rose-500/70 text-rose-300'
                  }`}
                >
                  <Award className="w-4 h-4 shrink-0" />
                  <span>{evaluationResult.score} / 100</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  playWoodClick();
                  onOpenInstructions();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-200 text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md cursor-pointer"
                title="Открыть инструкцию к заданию"
              >
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>Инструкция</span>
              </button>

              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-600/60 text-emerald-200 text-xs sm:text-sm font-semibold tracking-wide shadow-inner whitespace-nowrap">
                Отрывок {currentExcerptIndex + 1} из {READING_TEXTS.length}
              </div>
            </div>
          </div>

          {/* Interactive English Text / Assessment Results Display */}
          <div className="my-2">
            {!evaluationResult ? (
              <div>
                <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed sm:leading-loose font-parchment tracking-wide text-stone-100 font-medium">
                  {currentExcerpt.english}
                </p>

                {/* Interim speech recognition preview while user is recording */}
                {isRecording && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-black/60 border border-emerald-500/50 animate-pulse flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <span className="text-xs sm:text-sm text-emerald-300 font-medium italic">
                      {interimText || 'Слушаю ваше чтение... Говорите в микрофон'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Evaluated word-by-word colored feedback */
              <div>
                <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed sm:leading-loose font-parchment tracking-wide font-medium">
                  {evaluationResult.wordScores && evaluationResult.wordScores.length > 0 ? (
                    evaluationResult.wordScores.map((ws, i) => {
                      const isGood = ws.status === 'good';
                      const isMedium = ws.status === 'medium';
                      const colorClass = isGood
                        ? 'text-emerald-300 hover:bg-emerald-950/60'
                        : isMedium
                        ? 'text-emerald-400 hover:bg-emerald-950/60'
                        : 'text-rose-400 hover:bg-rose-950/60 underline decoration-rose-500/60';

                      return (
                        <span
                          key={i}
                          onClick={() => handlePlayWord(ws.word)}
                          className={`inline-block mr-2 px-1 py-0.5 rounded cursor-pointer transition-colors ${colorClass} ${
                            activeWordPlaying === ws.word ? 'ring-2 ring-emerald-400 scale-105' : ''
                          }`}
                          title={`Оценка: ${ws.score}/100. Нажмите, чтобы прослушать`}
                        >
                          {ws.word}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-stone-300">{currentExcerpt.english}</span>
                  )}
                </p>

                <p className="text-xs text-stone-400 mt-2 font-sans">
                  Коснитесь любого слова, чтобы услышать его правильное звучание
                </p>
              </div>
            )}
          </div>

          {/* Small subtle divider line under English text */}
          <div className="w-full flex items-center justify-center my-3 sm:my-4">
            <div className="w-28 sm:w-36 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-600/50 to-transparent" />
          </div>

          {/* Russian translation of the excerpt (Matches Task 2) */}
          <div className="text-base sm:text-lg md:text-xl font-parchment leading-relaxed text-stone-300 italic px-1">
            {currentExcerpt.russian}
          </div>

          {/* Action Button inside Parchment Frame: Fixed width, ONLY rendered SVG icon (NO emoji symbol) */}
          <div className="mt-4 pt-1 relative flex items-center justify-center min-h-[52px]">
            {!evaluationResult ? (
              !isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isAssessing}
                  className="w-56 py-3 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-colors shadow-xl active:scale-95 cursor-pointer bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-stone-950"
                >
                  <Mic className="w-5 h-5 text-stone-900 shrink-0" />
                  <span>Начать чтение</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="w-64 py-3 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-colors shadow-xl active:scale-95 cursor-pointer bg-rose-600 hover:bg-rose-500 text-white border-2 border-rose-400 animate-pulse"
                >
                  <Square className="w-5 h-5 fill-white text-white shrink-0" />
                  <span>Завершить и проверить</span>
                </button>
              )
            ) : (
              /* When evaluated: "Прочитать снова" & "Следующий отрывок" */
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="w-52 py-3 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-colors shadow-xl active:scale-95 cursor-pointer bg-stone-900/90 hover:bg-stone-800 text-emerald-200 border-2 border-emerald-600/70"
                >
                  <RotateCcw className="w-5 h-5 text-emerald-300 shrink-0" />
                  <span>Прочитать снова</span>
                </button>

                <div className="absolute left-[calc(50%+115px)] animate-fade-in">
                  <button
                    type="button"
                    onClick={handleNextExcerpt}
                    className="px-4 py-3 rounded-2xl font-bold text-sm sm:text-base flex items-center gap-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-stone-950 shadow-lg active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title="Перейти к следующему отрывку"
                  >
                    <span>Следующий</span>
                    <ArrowRight className="w-4 h-4 text-stone-950 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )}

            {/* Assessing loading state overlay */}
            {isAssessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-stone-950/80 rounded-2xl backdrop-blur-sm z-20">
                <div className="flex items-center gap-2.5 text-emerald-300 font-bold text-base">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Оцениваю произношение...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Excerpt Selectors at the VERY BOTTOM (Matches Task 2) */}
      <div className="relative z-10 flex flex-col items-center gap-2.5 pb-1">
        {/* Central Feedback / Prompt Pill */}
        <div className="flex justify-center w-full">
          {evaluationResult ? (
            <div
              className={`w-56 py-3 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider shadow-2xl transition-all flex items-center justify-center gap-2.5 whitespace-nowrap border-2 ${
                evaluationResult.score >= 70
                  ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-600/70 text-amber-300'
              }`}
            >
              <Award className="w-5 h-5 shrink-0" />
              <span>Оценка: {evaluationResult.score} / 100</span>
            </div>
          ) : (
            <div className="py-2 px-5 rounded-2xl bg-stone-900/90 border border-stone-800 text-stone-300 text-xs sm:text-sm font-medium shadow-md">
              Прочтите отрывок в микрофон для проверки точности речи
            </div>
          )}
        </div>

        {/* Excerpt Selector Buttons at the VERY BOTTOM with completed green state (Matches Task 2) */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 px-2 pt-0.5 max-w-4xl mx-auto">
          {READING_TEXTS.map((t, idx) => {
            const isCompleted = completedExcerptIds.includes(t.id);
            const isCurrent = idx === currentExcerptIndex;

            let btnStyle =
              'bg-stone-900/85 text-stone-300 border-stone-700 hover:bg-stone-800 hover:text-stone-100';
            if (isCompleted && isCurrent) {
              btnStyle =
                'bg-emerald-800 text-white border-2 border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg';
            } else if (isCompleted) {
              btnStyle =
                'bg-emerald-950/90 text-emerald-300 border-2 border-emerald-600/80 hover:bg-emerald-900';
            } else if (isCurrent) {
              btnStyle =
                'bg-amber-500 text-stone-950 font-bold border-2 border-amber-300 ring-2 ring-amber-400/40 shadow-lg';
            }

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  if (idx !== currentExcerptIndex) {
                    handleSelectExcerpt(idx);
                  }
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 rounded-2xl font-bold text-xs sm:text-sm border transition-all active:scale-95 cursor-pointer shadow-md whitespace-nowrap ${btnStyle}`}
              >
                {isCompleted && (
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                )}
                <span>Отрывок {idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
