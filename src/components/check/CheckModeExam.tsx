import React, { useState } from 'react';
import { VocabularyItem, ExamWordResult } from '../../types';
import { CaveInteractiveMap } from '../CaveInteractiveMap';
import { ItemIllustration } from '../common/ItemIllustration';
import { recordAndAssessWord, PronunciationResult } from '../../services/pronunciationService';
import {
  speakEnglish,
  playWoodClick,
  playSuccessChime,
  playErrorThud,
  playCompletionFanfare
} from '../../services/audioService';
import {
  Mic,
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Printer,
  Compass,
  Home
} from 'lucide-react';

interface CheckModeExamProps {
  vocabulary: VocabularyItem[];
  onOpenInstructions: () => void;
  onRestartExam: () => void;
  onResetToHome?: () => void;
  onOpenMicCheck?: (errorMessage?: string) => void;
}

export const CheckModeExam: React.FC<CheckModeExamProps> = ({
  vocabulary,
  onOpenInstructions,
  onRestartExam,
  onResetToHome,
  onOpenMicCheck,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAttempts, setCurrentAttempts] = useState(0);
  const [hasFoundObject, setHasFoundObject] = useState(false);
  const [isRecordingPronunciation, setIsRecordingPronunciation] = useState(false);
  const [isAssessingPronunciation, setIsAssessingPronunciation] = useState(false);
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [pronouncedTranscript, setPronouncedTranscript] = useState<string>('');
  const [resultsList, setResultsList] = useState<ExamWordResult[]>([]);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({
    type: null,
    text: ''
  });

  const currentItem = vocabulary[currentIndex];

  // User taps an object in the cave to match current English word (Requirement 14.1)
  const handleSelectObject = (selected: VocabularyItem) => {
    if (hasFoundObject || isExamCompleted) return;

    const attemptsNow = currentAttempts + 1;
    setCurrentAttempts(attemptsNow);

    if (selected.id === currentItem.id) {
      // Correct object!
      playSuccessChime();
      setHasFoundObject(true);
      setFeedbackMessage({ type: null, text: '' });
    } else {
      // Wrong object
      playErrorThud();
      setFeedbackMessage({
        type: 'error',
        text: `✗ Не совсем так — вы выбрали «${selected.russian}». Попробуйте ещё раз найти «${currentItem.english}»!`
      });
    }
  };

  // User speaks into microphone to test pronunciation (Requirement 15)
  const handleTestPronunciation = async () => {
    setIsRecordingPronunciation(true);
    setIsAssessingPronunciation(false);
    setFeedbackMessage({ type: null, text: '' });

    try {
      const result: PronunciationResult = await recordAndAssessWord(
        currentItem.english,
        (interim) => {
          setPronouncedTranscript(interim);
        }
      );

      setIsRecordingPronunciation(false);
      setIsAssessingPronunciation(false);

      if (result.error) {
        setFeedbackMessage({
          type: 'error',
          text: result.error,
        });
        if (onOpenMicCheck) {
          onOpenMicCheck(result.error);
        }
        return;
      }

      setPronunciationScore(result.score);
      setPronouncedTranscript(result.recognizedText);

      if (result.score === 0 && !result.recognizedText) {
        setFeedbackMessage({
          type: 'error',
          text: 'Микрофон не уловил голос. Пожалуйста, говорите чётко и ближе к микрофону.',
        });
      } else if (result.score >= 70) {
        playSuccessChime();
      } else {
        playWoodClick();
      }
    } catch (err: any) {
      setIsRecordingPronunciation(false);
      setIsAssessingPronunciation(false);
      if (onOpenMicCheck) {
        onOpenMicCheck(err?.message || 'Ошибка доступа к микрофону');
      }
    }
  };

  // User listens to model pronunciation (Requirement 16)
  const handleListenReference = () => {
    speakEnglish(currentItem.english, 0.88, currentItem.id);
  };

  // Move to next word or finalize exam (Requirement 17, 18)
  const handleProceedNextWord = () => {
    playWoodClick();

    // Record results for current word
    const record: ExamWordResult = {
      itemId: currentItem.id,
      english: currentItem.english,
      russian: currentItem.russian,
      attempts: Math.max(1, currentAttempts),
      pronunciationScore: pronunciationScore !== null ? pronunciationScore : 75,
      pronouncedText: pronouncedTranscript,
      passed: true
    };

    const updated = [...resultsList, record];
    setResultsList(updated);

    if (currentIndex + 1 < vocabulary.length) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentAttempts(0);
      setHasFoundObject(false);
      setPronunciationScore(null);
      setPronouncedTranscript('');
      setFeedbackMessage({ type: null, text: '' });
    } else {
      // All words finished -> Final Summary! (Requirement 18, 20)
      setIsExamCompleted(true);
      playCompletionFanfare();
    }
  };

  const handleFullReset = () => {
    playWoodClick();
    setCurrentIndex(0);
    setCurrentAttempts(0);
    setHasFoundObject(false);
    setPronunciationScore(null);
    setPronouncedTranscript('');
    setResultsList([]);
    setIsExamCompleted(false);
    setFeedbackMessage({ type: null, text: '' });
    onRestartExam();
  };

  // Calculate final summary statistics
  const avgPronunciation =
    resultsList.length > 0
      ? Math.round(resultsList.reduce((acc, r) => acc + r.pronunciationScore, 0) / resultsList.length)
      : 0;

  const totalFirstTry = resultsList.filter((r) => r.attempts === 1).length;

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden">
      {/* Top Banner */}
      <div className="flex items-center justify-between z-10 px-2">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs sm:text-sm font-bold uppercase tracking-wider">
            Экран 2: Проверка знаний на выходе
          </span>
          <span className="text-stone-300 text-xs sm:text-sm hidden sm:inline">
            Найди предмет по английскому слову и проверь произношение
          </span>
        </div>

        {/* Word Counter */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-900/90 border border-emerald-700/50 text-xs sm:text-sm shadow-md">
          <span className="text-stone-400">Слово:</span>
          <span className="font-extrabold text-emerald-300 text-base">
            {isExamCompleted ? vocabulary.length : currentIndex + 1} / {vocabulary.length}
          </span>
        </div>
      </div>

      {!isExamCompleted ? (
        <>
          {/* Interactive Cave Area with Target Word Oval positioned directly OVER the picture */}
          <div className="relative flex-1 flex items-center justify-center my-1 max-w-7xl mx-auto w-full">
            <div className="relative max-h-[72vh] w-auto mx-auto flex items-center justify-center">
              <CaveInteractiveMap
                vocabulary={vocabulary}
                activeItemId={hasFoundObject ? currentItem.id : null}
                onSelectObject={handleSelectObject}
                disabled={hasFoundObject}
                className="max-h-[72vh] w-auto mx-auto shadow-2xl"
              />

              {/* Target Word Oval directly OVER the cave image */}
              <div className="absolute top-3 sm:top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <div className="px-5 py-2 sm:px-8 sm:py-2.5 rounded-full bg-stone-950/85 border border-emerald-500/70 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.85)] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 pointer-events-auto">
                  <span className="text-xs sm:text-sm uppercase tracking-wider text-emerald-400 font-bold whitespace-nowrap">
                    Найди этот предмет в пещере:
                  </span>
                  <span className="text-2xl sm:text-3xl md:text-4xl font-black font-sans tracking-wider text-emerald-100 uppercase whitespace-nowrap drop-shadow-md">
                    {currentItem.english}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Feedback alert when wrong item is tapped */}
          {feedbackMessage.text && feedbackMessage.type === 'error' && (
            <div className="z-10 px-2 py-1 max-w-xl mx-auto w-full">
              <div className="p-3.5 rounded-2xl border text-sm sm:text-base font-semibold flex items-center justify-center gap-2 animate-fade-in text-center bg-rose-950/90 border-rose-500 text-rose-200 shadow-xl">
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{feedbackMessage.text}</span>
              </div>
            </div>
          )}

          {/* MODAL POPUP OVER THE SCREEN UPON FINDING THE ITEM */}
          {hasFoundObject && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div
                className="relative w-full max-w-md bg-stone-900/95 border-2 border-emerald-500/70 rounded-3xl p-6 sm:p-7 text-center shadow-2xl text-stone-100 animate-scale-up"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Compact Horizontal Illustration of the Specific Item */}
                <div className="mt-1 mb-3 flex items-center justify-center">
                  <ItemIllustration
                    itemId={currentItem.id}
                    className="h-16 sm:h-20 max-w-full object-contain filter drop-shadow-md"
                  />
                </div>

                {/* English Word in Clean Sans-Serif Font (No Serifs) */}
                <div className="space-y-1">
                  <h2 className="text-3xl sm:text-4xl font-black font-sans tracking-wider text-emerald-100 uppercase">
                    {currentItem.english}
                  </h2>

                  <p className="text-base sm:text-lg font-mono text-emerald-300/80 font-medium">
                    {currentItem.transcription}
                  </p>
                </div>

                {/* Russian Translation */}
                <div className="my-2.5">
                  <p className="text-xl sm:text-2xl font-bold font-sans text-stone-200 capitalize">
                    {currentItem.russian}
                  </p>
                </div>

                {/* Pronunciation Score Feedback (if tested) */}
                {pronunciationScore !== null && (
                  <div className="my-3 py-2.5 px-4 rounded-xl bg-emerald-950/80 border border-emerald-500/60 flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-sm font-semibold text-emerald-200">
                        Оценка произношения:{' '}
                        <span className="font-bold text-emerald-300 text-base">{pronunciationScore} / 100</span>
                      </span>
                    </div>
                    {pronouncedTranscript && (
                      <span className="text-xs text-stone-300 italic">
                        Услышано: «{pronouncedTranscript}»
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons in Modal */}
                <div className="space-y-3 pt-2">
                  {/* Central Big Microphone Button: "произнеси слово" */}
                  <button
                    type="button"
                    onClick={handleTestPronunciation}
                    disabled={isRecordingPronunciation}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 active:scale-95 transition-all cursor-pointer shadow-lg
                      ${
                        isRecordingPronunciation
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 shadow-emerald-950/50'
                      }
                    `}
                  >
                    <Mic className="w-6 h-6 shrink-0" />
                    <span>
                      {isRecordingPronunciation
                        ? 'Слушаю...'
                        : pronunciationScore !== null
                        ? 'Повторить произношение'
                        : 'Произнеси слово'}
                    </span>
                  </button>

                  {/* Listen button (WITHOUT emoji in text) */}
                  <button
                    type="button"
                    onClick={handleListenReference}
                    className="w-full py-3 px-5 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-600/70 text-emerald-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5 text-emerald-300 shrink-0" />
                    <span>Послушать</span>
                  </button>

                  {/* Proceed to Next Word Button */}
                  <button
                    type="button"
                    onClick={handleProceedNextWord}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-stone-950 font-black text-base sm:text-lg uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                  >
                    <span>Дальше</span>
                    <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Bar Help, Home & Restart */}
          <div className="flex items-center justify-between z-10 px-2 pt-1 text-xs sm:text-sm">
            {onResetToHome && (
              <button
                type="button"
                onClick={() => {
                  playWoodClick();
                  handleFullReset();
                  onResetToHome();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-200 font-bold active:scale-95 transition-all shadow-md cursor-pointer"
                title="Сбросить и вернуться на главную страницу"
              >
                <Home className="w-4 h-4 text-emerald-400" />
                <span>НА ГЛАВНУЮ СТРАНИЦУ</span>
              </button>
            )}

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={() => {
                  playWoodClick();
                  onOpenInstructions();
                }}
                className="px-4 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700 hover:border-emerald-500/50 text-stone-300 hover:text-emerald-200 font-semibold active:scale-95 cursor-pointer"
              >
                ИНСТРУКЦИЯ
              </button>

              <button
                type="button"
                onClick={handleFullReset}
                className="px-4 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700 hover:border-emerald-500/50 text-stone-400 hover:text-emerald-200 font-semibold active:scale-95 cursor-pointer"
              >
                Начать заново
              </button>
            </div>
          </div>
        </>
      ) : (
        /* FINAL SUMMARY TABLE SCREEN (Requirement 18, 20) */
        <div className="relative flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full my-auto animate-scale-up z-20">
          <div className="w-full bg-stone-900/95 border-3 border-emerald-500/80 rounded-3xl p-6 sm:p-10 shadow-2xl text-stone-100 max-h-[85vh] overflow-y-auto">
            {/* Header Badge */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-sm font-bold">
                <Award className="w-5 h-5 text-emerald-400" />
                <span>ИТОГИ ИСПЫТАНИЯ В ПЕЩЕРЕ РОБИНЗОНА</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black font-serif-maritime text-emerald-100">
                Ты прошёл испытание!
              </h2>

              <p className="text-sm sm:text-base text-stone-300 max-w-xl mx-auto">
                Звание:{' '}
                <span className="font-extrabold text-emerald-300 font-serif-maritime text-lg">
                  {avgPronunciation >= 85 && totalFirstTry >= 6
                    ? 'Главный Штурман Острова Робинзона'
                    : avgPronunciation >= 70
                    ? 'Опытный Исследователь Пещеры'
                    : 'Смелый Путешественник Океана'}
                </span>
              </p>
            </div>

            {/* Exact Table Required by Section 18 */}
            <div className="overflow-x-auto rounded-2xl border border-stone-800 bg-stone-950/80 mb-6 shadow-inner">
              <table className="w-full text-left text-sm sm:text-base">
                <thead className="bg-emerald-950/50 border-b border-emerald-800/40 text-emerald-200 font-serif-maritime">
                  <tr>
                    <th className="py-3 px-4 font-bold">Английское слово</th>
                    <th className="py-3 px-4 font-bold">Русское значение</th>
                    <th className="py-3 px-4 font-bold text-center">Попыток найти предмет</th>
                    <th className="py-3 px-4 font-bold text-center">Произношение</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800 font-medium">
                  {resultsList.map((row) => (
                    <tr key={row.itemId} className="hover:bg-stone-900/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-300 uppercase">
                        {row.english}
                      </td>
                      <td className="py-3 px-4 text-stone-200 capitalize">
                        {row.russian}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${
                            row.attempts === 1
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-700/60'
                          }`}
                        >
                          {row.attempts}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${
                            row.pronunciationScore >= 85
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                              : row.pronunciationScore >= 70
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-600'
                              : 'bg-rose-950 text-rose-300 border border-rose-500'
                          }`}
                        >
                          {row.pronunciationScore} / 100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Overall Score KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-2xl bg-black/40 border border-emerald-900/40 text-center">
                <span className="text-xs text-stone-400 block mb-1">Слов найдено</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-300">
                  {resultsList.length} из {vocabulary.length}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-emerald-900/40 text-center">
                <span className="text-xs text-stone-400 block mb-1">С первой попытки</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {totalFirstTry} ({Math.round((totalFirstTry / (resultsList.length || 1)) * 100)}%)
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-black/40 border border-emerald-900/40 text-center">
                <span className="text-xs text-stone-400 block mb-1">Среднее произношение</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-200">
                  {avgPronunciation} / 100
                </span>
              </div>
            </div>

            {/* Action Buttons: Photo/Diploma ready & Start New Session */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-4 px-6 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 font-bold text-base active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-5 h-5 text-emerald-400" />
                <span>Печать / Сохранить сертификат</span>
              </button>

              <button
                type="button"
                onClick={handleFullReset}
                className="py-4 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-stone-950 font-black text-lg uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Пройти испытание снова</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
