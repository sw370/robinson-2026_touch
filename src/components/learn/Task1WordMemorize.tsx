import React, { useState } from 'react';
import { VocabularyItem } from '../../types';
import { CaveInteractiveMap } from '../CaveInteractiveMap';
import { ItemIllustration } from '../common/ItemIllustration';
import { Volume2, CheckCircle2, Sparkles, ArrowRight, Home, X, Mic, RefreshCw } from 'lucide-react';
import { speakEnglish, playWoodClick, playSuccessChime, playCompletionFanfare } from '../../services/audioService';
import { recordAndAssessWord, PronunciationResult } from '../../services/pronunciationService';

interface Task1WordMemorizeProps {
  vocabulary: VocabularyItem[];
  studiedIds: string[];
  onMarkStudied: (itemId: string) => void;
  onGoToTask2: () => void;
  onFinishTask: () => void;
  onOpenInstructions: () => void;
  onOpenMicCheck?: (error?: string) => void;
}

export const Task1WordMemorize: React.FC<Task1WordMemorizeProps> = ({
  vocabulary,
  studiedIds,
  onMarkStudied,
  onGoToTask2,
  onFinishTask,
  onOpenInstructions,
  onOpenMicCheck,
}) => {
  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPracticingPronunciation, setIsPracticingPronunciation] = useState(false);
  const [practiceScore, setPracticeScore] = useState<number | null>(null);
  const [practiceTranscript, setPracticeTranscript] = useState<string>('');

  const isAllStudied = vocabulary.length > 0 && studiedIds.length >= vocabulary.length;

  const handleSelectObject = (item: VocabularyItem) => {
    // Open modal with smooth gradual backdrop manifestation
    setSelectedItem(item);
    setPracticeScore(null);
    setPracticeTranscript('');
    setIsModalVisible(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsModalVisible(true);
      });
    });
  };

  const handleCloseModal = () => {
    // Smooth exit transition with gradual fade
    setIsModalVisible(false);
    setTimeout(() => {
      setSelectedItem(null);
      setPracticeScore(null);
      setPracticeTranscript('');
    }, 380);
  };

  const handleSpeak = async (word: string, id?: string) => {
    setIsSpeaking(true);
    await speakEnglish(word, 0.88, id || selectedItem?.id);
    setIsSpeaking(false);
  };

  const handlePracticePronunciation = async () => {
    if (!selectedItem) return;
    playWoodClick();
    setIsPracticingPronunciation(true);
    setPracticeScore(null);
    setPracticeTranscript('');

    try {
      const result: PronunciationResult = await recordAndAssessWord(
        selectedItem.english,
        (interim) => {
          setPracticeTranscript(interim);
        }
      );

      setIsPracticingPronunciation(false);

      if (result.error) {
        if (onOpenMicCheck) {
          onOpenMicCheck(result.error);
        }
        return;
      }

      setPracticeScore(result.score);
      setPracticeTranscript(result.recognizedText);

      if (result.score >= 70) {
        playSuccessChime();
      } else {
        playWoodClick();
      }
    } catch (err: any) {
      setIsPracticingPronunciation(false);
      if (onOpenMicCheck) {
        onOpenMicCheck(err?.message || 'Ошибка доступа к микрофону');
      }
    }
  };

  const handleConfirmMemorized = () => {
    if (!selectedItem) return;
    playSuccessChime();
    const itemId = selectedItem.id;
    onMarkStudied(itemId);
    setIsModalVisible(false);
    setTimeout(() => {
      setSelectedItem(null);
    }, 280);

    // If this was the last item to study, play fanfare
    if (studiedIds.length + 1 >= vocabulary.length && !studiedIds.includes(itemId)) {
      setTimeout(() => {
        playCompletionFanfare();
      }, 350);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden">
      {/* Top Banner / Progress Indicator */}
      <div className="flex items-center justify-between z-10 px-2 py-1">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs sm:text-sm font-bold uppercase tracking-wider">
            Задание 1: Запомни слова
          </span>
          <span className="text-stone-300 text-xs sm:text-sm hidden sm:inline">
            Коснись светящихся предметов в пещере
          </span>
        </div>

        {/* Counter Pill */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-900/90 border border-amber-700/50 text-xs sm:text-sm shadow-md">
          <span className="text-stone-400">Изучено:</span>
          <span className="font-extrabold text-amber-300 text-base">
            {studiedIds.length} / {vocabulary.length}
          </span>
        </div>
      </div>

      {/* Main Cave Area (Takes majority of screen per 2.3) */}
      <div className="relative flex-1 flex items-center justify-center my-2 max-w-7xl mx-auto w-full">
        <CaveInteractiveMap
          vocabulary={vocabulary}
          studiedIds={studiedIds}
          activeItemId={selectedItem?.id}
          onSelectObject={handleSelectObject}
          className="max-h-[72vh] w-auto mx-auto shadow-2xl"
        />
      </div>

      {/* Bottom Control Bar */}
      <div className="flex items-center justify-between z-10 px-2 pt-1 text-xs sm:text-sm">
        {/* Prominent Return to Home / Selection Button (Does not erase progress) */}
        <button
          type="button"
          onClick={() => {
            playWoodClick();
            onFinishTask();
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-950/70 hover:bg-amber-900 border border-amber-600/70 text-amber-200 font-bold active:scale-95 transition-all shadow-md cursor-pointer"
          title="Вернуться на главную страницу"
        >
          <Home className="w-4 h-4 text-amber-400" />
          <span>НА ГЛАВНУЮ СТРАНИЦУ</span>
        </button>

        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={() => {
              playWoodClick();
              onOpenInstructions();
            }}
            className="px-4 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 font-semibold active:scale-95 transition-all cursor-pointer"
          >
            ИНСТРУКЦИЯ
          </button>
        </div>
      </div>

      {/* MODAL: Word Detail Card (Smooth gradual backdrop manifestation, Sans-Serif, Illustrated, Click-outside/Close) */}
      {selectedItem && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-400 ease-out cursor-pointer ${
            isModalVisible
              ? 'bg-black/80 backdrop-blur-sm opacity-100'
              : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'
          }`}
          onClick={handleCloseModal}
        >
          <div
            className={`relative w-full max-w-md bg-stone-900/95 border-2 border-amber-600/60 rounded-3xl p-6 sm:p-7 text-center shadow-2xl text-stone-100 cursor-default transition-all duration-350 ease-out ${
              isModalVisible
                ? 'scale-100 opacity-100 translate-y-0'
                : 'scale-95 opacity-0 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close 'X' Button in Top Right */}
            <button
              type="button"
              onClick={() => {
                playWoodClick();
                handleCloseModal();
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              title="Закрыть без сохранения"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Compact Horizontal Illustration of the Specific Item */}
            <div className="mt-2 mb-3 flex items-center justify-center">
              <ItemIllustration
                itemId={selectedItem.id}
                className="h-16 sm:h-20 max-w-full object-contain filter drop-shadow-md"
              />
            </div>

            {/* English Word in Clean Sans-Serif Font (No Serifs) */}
            <div className="space-y-1">
              <h2 className="text-3xl sm:text-4xl font-black font-sans tracking-wider text-amber-100 uppercase">
                {selectedItem.english}
              </h2>

              <p className="text-lg sm:text-xl font-mono text-amber-300/80 font-medium">
                {selectedItem.transcription}
              </p>
            </div>

            {/* Russian Translation & Description (Clean text, no box or dark border) */}
            <div className="my-3 space-y-1">
              <p className="text-xl sm:text-2xl font-bold font-sans text-stone-200 capitalize">
                {selectedItem.russian}
              </p>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-xs mx-auto">
                {selectedItem.description}
              </p>
            </div>

            {/* Pronunciation Practice Result Feedback */}
            {practiceScore !== null && (
              <div className="my-2.5 py-2 px-3.5 rounded-xl bg-amber-950/70 border border-amber-500/60 flex flex-col items-center justify-center gap-1 animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      practiceScore >= 70 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-semibold text-amber-200">
                    Оценка произношения:{' '}
                    <span
                      className={`font-black text-sm sm:text-base ${
                        practiceScore >= 85
                          ? 'text-emerald-300'
                          : practiceScore >= 70
                          ? 'text-amber-300'
                          : 'text-rose-300'
                      }`}
                    >
                      {practiceScore} / 100
                    </span>
                  </span>
                </div>
                {practiceTranscript && (
                  <span className="text-[11px] text-stone-300 italic">
                    Услышано: «{practiceTranscript}»
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons: Listen + Practice Pronunciation + Confirm Memorized */}
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Listen button */}
                <button
                  type="button"
                  onClick={() => handleSpeak(selectedItem.english, selectedItem.id)}
                  className={`py-3 px-4 rounded-2xl border border-amber-600/70 flex items-center justify-center gap-2 text-sm sm:text-base font-bold transition-all active:scale-95 cursor-pointer
                    ${
                      isSpeaking
                        ? 'bg-amber-600 text-stone-950'
                        : 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-200'
                    }
                  `}
                >
                  <Volume2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Послушать</span>
                </button>

                {/* Practice pronunciation button */}
                <button
                  type="button"
                  onClick={handlePracticePronunciation}
                  disabled={isPracticingPronunciation}
                  className={`py-3 px-4 rounded-2xl border flex items-center justify-center gap-2 text-sm sm:text-base font-bold transition-all active:scale-95 cursor-pointer
                    ${
                      isPracticingPronunciation
                        ? 'bg-rose-600 text-white animate-pulse border-rose-500'
                        : practiceScore !== null
                        ? 'bg-emerald-950/60 hover:bg-emerald-900/70 border-emerald-600/70 text-emerald-200'
                        : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/70 text-amber-200'
                    }
                  `}
                >
                  {isPracticingPronunciation ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                      <span>Слушаю...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>{practiceScore !== null ? 'Повторить' : 'Произнести'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Confirm Memorized button */}
              <button
                type="button"
                onClick={handleConfirmMemorized}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-lg sm:text-xl uppercase tracking-wider shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2.5"
              >
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                <span>ЗАПОМНИЛ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TASK 1 COMPLETION SCREEN (Requirement 7) */}
      {isAllStudied && !selectedItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-stone-900 border-2 border-emerald-500 rounded-3xl p-8 sm:p-12 text-center shadow-2xl text-stone-100">
            {/* Celebration Icon */}
            <div className="w-20 h-20 rounded-3xl bg-emerald-950/80 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-6 text-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
              <Sparkles className="w-10 h-10" />
            </div>

            {/* Requirement 7 exact copy */}
            <h2 className="text-3xl sm:text-5xl font-black font-serif-maritime text-emerald-200 mb-3">
              Ты запомнил все слова!
            </h2>
            <p className="text-stone-300 text-lg sm:text-xl mb-8">
              Все 7 предметов из пещеры Робинзона успешно изучены. Теперь ты готов к испытанию на выходе из экспозиции!
            </p>

            <div className="p-4 rounded-2xl bg-black/40 border border-stone-800 mb-8">
              <p className="text-xl font-bold text-amber-300">
                Хочешь выполнить второе задание?
              </p>
              <p className="text-xs sm:text-sm text-stone-400 mt-1">
                Чтение короткого отрывка из дневника Робинзона
              </p>
            </div>

            {/* Buttons: "ДА, ПЕРЕЙТИ КО ВТОРОМУ" and "ЗАКОНЧИТЬ" */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={() => {
                  playWoodClick();
                  onGoToTask2();
                }}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-lg uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>ДА, ПЕРЕЙТИ КО ВТОРОМУ</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  playWoodClick();
                  onFinishTask();
                }}
                className="py-4 px-8 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 font-bold text-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5 text-stone-400" />
                <span>ЗАКОНЧИТЬ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
