import React, { useState, useRef, useEffect } from 'react';
import { READING_TEXTS } from '../../data/readingTexts';
import { WordAssistance, RussianToken, WordScore } from '../../types';
import { speakEnglish, playWoodClick, playSuccessChime, stopSpeech } from '../../services/audioService';
import { recordAndAssessReading, PronunciationResult } from '../../services/pronunciationService';
import { Volume2, Pause, Play, RotateCcw, CheckCircle, HelpCircle, BookOpen, X, Home, Mic, Square, RefreshCw } from 'lucide-react';

interface Task2ReadingProps {
  onBackToSelection: () => void;
  onOpenInstructions: () => void;
  onOpenMicCheck?: (errorMessage?: string) => void;
}

interface RussianChunk {
  text: string;
  isMatch: boolean;
  firstToken: RussianToken;
  key: string;
}

function getGroupedRussianChunks(
  tokens: RussianToken[],
  selectedWordIndex: number | null
): RussianChunk[] {
  const result: RussianChunk[] = [];
  let currentGroup: {
    words: string[];
    firstToken: RussianToken;
    key: string;
  } | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const isMatch = selectedWordIndex !== null && tok.enIndices.includes(selectedWordIndex);

    if (isMatch) {
      if (currentGroup) {
        currentGroup.words.push(tok.text);
      } else {
        currentGroup = {
          words: [tok.text],
          firstToken: tok,
          key: `match-${i}`,
        };
      }
    } else {
      if (currentGroup) {
        result.push({
          text: currentGroup.words.join(' '),
          isMatch: true,
          firstToken: currentGroup.firstToken,
          key: currentGroup.key,
        });
        currentGroup = null;
      }
      result.push({
        text: tok.text,
        isMatch: false,
        firstToken: tok,
        key: `tok-${i}`,
      });
    }
  }

  if (currentGroup) {
    result.push({
      text: currentGroup.words.join(' '),
      isMatch: true,
      firstToken: currentGroup.firstToken,
      key: currentGroup.key,
    });
  }

  return result;
}

export const Task2Reading: React.FC<Task2ReadingProps> = ({
  onBackToSelection,
  onOpenInstructions,
  onOpenMicCheck,
}) => {
  const [currentExcerptIndex, setCurrentExcerptIndex] = useState(0);
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [spokenWordIndex, setSpokenWordIndex] = useState<number | null>(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [selectedWordHelp, setSelectedWordHelp] = useState<WordAssistance | null>(null);
  const [memorizedExcerptIds, setMemorizedExcerptIds] = useState<number[]>([]);

  // Practice reading aloud states
  const [isPracticingReading, setIsPracticingReading] = useState(false);
  const [isAssessingReading, setIsAssessingReading] = useState(false);
  const [interimSpeechText, setInterimSpeechText] = useState('');
  const [practiceResult, setPracticeResult] = useState<PronunciationResult | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const readingRecorderRef = useRef<{ stop: () => Promise<PronunciationResult> } | null>(null);

  const currentExcerpt = READING_TEXTS[currentExcerptIndex];
  const isCurrentMemorized = memorizedExcerptIds.includes(currentExcerpt.id);

  // Clean up audio playback on unmount or slide change
  useEffect(() => {
    return () => {
      stopExcerptAudio();
      if (readingRecorderRef.current) {
        try {
          readingRecorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const stopExcerptAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioState('idle');
    setSpokenWordIndex(null);
    stopSpeech();
  };

  const handleStartReadingPractice = () => {
    playWoodClick();
    stopExcerptAudio();
    setPracticeResult(null);
    setInterimSpeechText('');
    setIsPracticingReading(true);

    const recorder = recordAndAssessReading(
      currentExcerpt.english,
      (interim) => {
        setInterimSpeechText(interim);
      },
      (errorMsg) => {
        setIsPracticingReading(false);
        if (onOpenMicCheck) {
          onOpenMicCheck(errorMsg);
        }
      }
    );
    readingRecorderRef.current = recorder;
  };

  const handleStopReadingPractice = async () => {
    playWoodClick();
    if (!readingRecorderRef.current) {
      setIsPracticingReading(false);
      return;
    }

    setIsPracticingReading(false);
    setIsAssessingReading(true);

    try {
      const result = await readingRecorderRef.current.stop();
      readingRecorderRef.current = null;
      setIsAssessingReading(false);
      setPracticeResult(result);

      if (result.score >= 70) {
        playSuccessChime();
      } else {
        playWoodClick();
      }
    } catch {
      setIsAssessingReading(false);
    }
  };

  const handleNextExcerpt = () => {
    if (currentExcerptIndex < READING_TEXTS.length - 1) {
      playWoodClick();
      stopExcerptAudio();
      setCurrentExcerptIndex((prev) => prev + 1);
      setSelectedWordIndex(null);
      setSelectedWordHelp(null);
    }
  };

  const handlePrevExcerpt = () => {
    if (currentExcerptIndex > 0) {
      playWoodClick();
      stopExcerptAudio();
      setCurrentExcerptIndex((prev) => prev - 1);
      setSelectedWordIndex(null);
      setSelectedWordHelp(null);
    }
  };

  const startAnimationLoop = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const loop = () => {
      if (!audioRef.current || audioRef.current.paused || audioRef.current.ended) {
        return;
      }
      const t = audioRef.current.currentTime;
      const timings = currentExcerpt.wordTimings;
      const foundIdx = timings.findIndex((tw) => t >= tw.start && t < tw.end);
      setSpokenWordIndex(foundIdx !== -1 ? foundIdx : null);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  // Toggle playback / pause of current excerpt
  const handleTogglePlayPause = () => {
    playWoodClick();

    if (audioState === 'playing') {
      // Pause current playback
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setAudioState('paused');
      return;
    }

    if (audioState === 'paused' && audioRef.current) {
      // Resume playback from paused time
      audioRef.current.play().then(() => {
        setAudioState('playing');
        startAnimationLoop();
      }).catch(() => {
        setAudioState('idle');
      });
      return;
    }

    // audioState is 'idle': start fresh from beginning
    stopSpeech();
    setSelectedWordHelp(null);
    setSelectedWordIndex(null);

    const audio = new Audio(`/assets/audio/excerpt_${currentExcerpt.id}.wav`);
    audioRef.current = audio;
    audio.currentTime = 0;

    audio.onended = () => {
      setAudioState('idle');
      setSpokenWordIndex(null);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };

    audio.onerror = () => {
      setAudioState('idle');
      setSpokenWordIndex(null);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      speakEnglish(currentExcerpt.english, 0.85);
    };

    audio.play().then(() => {
      setAudioState('playing');
      startAnimationLoop();
    }).catch(() => {
      setAudioState('idle');
      setSpokenWordIndex(null);
      speakEnglish(currentExcerpt.english, 0.85);
    });
  };

  // Restart playback from beginning
  const handleRestartFromBeginning = () => {
    playWoodClick();
    if (!audioRef.current) {
      handleTogglePlayPause();
      return;
    }

    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => {
      setAudioState('playing');
      startAnimationLoop();
    }).catch(() => {
      setAudioState('idle');
    });
  };

  // Word tap helper: plays individual word pronunciation and highlights Russian counterpart
  const handleTapEnglishWord = (wordWithPunct: string, index: number) => {
    // If recorded excerpt is currently playing, pause it so visitor can hear the word
    if (audioState === 'playing' && audioRef.current) {
      audioRef.current.pause();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setAudioState('paused');
    }

    playWoodClick();
    setSelectedWordIndex(index);

    const cleanWord = wordWithPunct.toLowerCase().replace(/[^a-z]/g, '');
    const entry = currentExcerpt.dictionary[cleanWord];

    if (entry) {
      setSelectedWordHelp(entry);
      speakEnglish(entry.word);
    } else {
      const fallbackClean = wordWithPunct.replace(/[^a-zA-Z]/g, '');
      setSelectedWordHelp({
        word: fallbackClean,
        transcription: '',
        translation: 'Слово из текста',
      });
      speakEnglish(fallbackClean);
    }
  };

  // Russian token tap helper: highlights matching English word and plays it
  const handleTapRussianToken = (tok: RussianToken) => {
    if (tok.enIndices && tok.enIndices.length > 0) {
      const firstEnIdx = tok.enIndices[0];
      const enWord = currentExcerpt.wordTimings[firstEnIdx]?.word || '';
      handleTapEnglishWord(enWord, firstEnIdx);
    }
  };

  // Memorize current excerpt and advance
  const handleMemorizeExcerpt = () => {
    if (isCurrentMemorized) return;
    playWoodClick();
    playSuccessChime();

    setMemorizedExcerptIds((prev) =>
      prev.includes(currentExcerpt.id) ? prev : [...prev, currentExcerpt.id]
    );

    // Auto-advance to next excerpt if one remains
    if (currentExcerptIndex < READING_TEXTS.length - 1) {
      stopExcerptAudio();
      setCurrentExcerptIndex((prev) => prev + 1);
      setSelectedWordIndex(null);
      setSelectedWordHelp(null);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-5 select-none overflow-hidden">
      {/* Background Cave Image with Dark Atmospheric Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/assets/cave.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/75 pointer-events-none backdrop-blur-[1px]" />

      {/* Top Navigation Bar */}
      <div className="relative flex items-center justify-between z-10 px-2">
        <button
          type="button"
          onClick={() => {
            playWoodClick();
            stopExcerptAudio();
            onBackToSelection();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-600/70 text-amber-200 text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md cursor-pointer"
          title="Вернуться на главную страницу"
        >
          <Home className="w-4 h-4 text-amber-400" />
          <span>На главную страницу</span>
        </button>

        {/* Top-right corner is left clean */}
        <div />
      </div>

      {/* Main Parchment Diary Area (2px border, clean zero-jitter typography) */}
      <div className="relative flex-1 flex items-center justify-center my-1.5 max-w-5xl mx-auto w-full z-10">
        <div className="relative w-full rounded-3xl p-6 sm:p-8 md:p-9 shadow-2xl border-2 border-amber-900/60 bg-[#1c1815] bg-opacity-95 text-stone-200 flex flex-col justify-between max-h-[70vh] overflow-y-auto">
          {/* Decorative Parchment Header with Инструкция pressed against Отрывок badge */}
          <div className="flex items-center justify-between border-b border-amber-900/50 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-serif-maritime text-amber-200">
                  {currentExcerpt.title}
                </h2>
                <p className="text-xs text-amber-400/80">
                  {currentExcerpt.subtitle} • {currentExcerpt.period}
                </p>
              </div>
            </div>

            {/* Right Group: «Инструкция» pressed next to «Отрывок Х из Y» */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => {
                  playWoodClick();
                  onOpenInstructions();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-200 text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md cursor-pointer"
                title="Открыть инструкцию к заданию"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Инструкция</span>
              </button>

              <div className="px-3.5 py-1.5 rounded-xl bg-amber-950/70 border border-amber-600/60 text-amber-200 text-xs sm:text-sm font-semibold tracking-wide shadow-inner whitespace-nowrap">
                Отрывок {currentExcerptIndex + 1} из {READING_TEXTS.length}
              </div>
            </div>
          </div>

          {/* Interactive English Text: ZERO-JITTER STABLE HIGHLIGHTING (No scale, fixed spacing) */}
          <div className="my-2">
            <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed sm:leading-loose font-parchment tracking-wide text-amber-100/95 font-medium">
              {currentExcerpt.wordTimings.map((wt, i) => {
                const isCurrentlySpoken = spokenWordIndex === i;
                const isUserSelected = selectedWordIndex === i;

                let highlightClass = 'text-amber-100/90';
                if (isCurrentlySpoken) {
                  // Rock-solid highlight without layout shift or bold widening
                  highlightClass = 'bg-amber-400 text-stone-950 shadow-sm';
                } else if (isUserSelected) {
                  highlightClass = 'bg-amber-500/30 text-amber-200 ring-1 ring-amber-400/60';
                }

                return (
                  <span
                    key={i}
                    onClick={() => handleTapEnglishWord(wt.word, i)}
                    className={`inline-block mr-2 px-1 py-0.5 rounded cursor-pointer transition-colors duration-75 select-none ${highlightClass}`}
                    title="Нажмите, чтобы услышать слово и увидеть его перевод"
                  >
                    {wt.word}
                  </span>
                );
              })}
            </p>
          </div>

          {/* Small subtle divider line under English text */}
          <div className="w-full flex items-center justify-center my-3 sm:my-4">
            <div className="w-28 sm:w-36 h-[1.5px] bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />
          </div>

          {/* Russian text: NEVER highlights during dictation; ONLY highlights on manual word tap */}
          {/* Multiple adjacent Russian words corresponding to one English word are highlighted in ONE unified rectangle */}
          <div className="text-base sm:text-lg md:text-xl font-parchment leading-relaxed text-amber-200/90 italic px-1">
            {getGroupedRussianChunks(currentExcerpt.russianTokens, selectedWordIndex).map((chunk) => {
              const highlightClass = chunk.isMatch
                ? 'bg-amber-400 text-stone-950 shadow-sm not-italic px-1.5'
                : 'text-amber-200/85 hover:text-amber-100 italic px-0.5';

              return (
                <span
                  key={chunk.key}
                  onClick={() => handleTapRussianToken(chunk.firstToken)}
                  className={`inline-block mr-1.5 py-0.5 rounded cursor-pointer transition-colors duration-75 select-none ${highlightClass}`}
                  title="Нажмите для подсветки и озвучивания английского слова"
                >
                  {chunk.text}
                </span>
              );
            })}
          </div>

          {/* Word Help Popover: Compact, centered, speaker icon clickable, no "Перевод:" label, pure sans-serif font */}
          {selectedWordHelp && (
            <div className="mt-4 mx-auto w-fit max-w-xl p-2.5 sm:p-3 px-4 rounded-2xl bg-amber-950/85 border border-amber-500/70 shadow-xl flex items-center justify-between gap-4 sm:gap-6 animate-fade-in font-sans">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playWoodClick();
                    speakEnglish(selectedWordHelp.word);
                  }}
                  className="p-2 sm:p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 active:scale-95 transition-all cursor-pointer shadow-md"
                  title="Нажмите, чтобы прослушать произношение"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-bold font-sans text-amber-100 tracking-wide">
                      {selectedWordHelp.word}
                    </span>
                    {selectedWordHelp.transcription && (
                      <span className="text-xs font-mono text-amber-300/90 bg-black/40 px-2 py-0.5 rounded">
                        {selectedWordHelp.transcription}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-sans font-medium text-amber-200 mt-0.5">
                    {selectedWordHelp.translation}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playWoodClick();
                    speakEnglish(selectedWordHelp.word);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-200 hover:text-stone-950 border border-amber-500/50 font-bold text-xs uppercase active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  Послушать ещё раз
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playWoodClick();
                    setSelectedWordHelp(null);
                    setSelectedWordIndex(null);
                  }}
                  className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
                  title="Закрыть подсказку"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Practice speech interim text or evaluated result */}
          {isPracticingReading && (
            <div className="mt-3 p-3 rounded-2xl bg-rose-950/70 border border-rose-500/70 text-center animate-fade-in">
              <div className="flex items-center justify-center gap-2 text-rose-300 font-bold text-xs sm:text-sm mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
                <span>Идёт запись речи... Читайте текст вслух в микрофон</span>
              </div>
              {interimSpeechText ? (
                <p className="text-xs text-rose-100 font-serif italic max-w-lg mx-auto">
                  «{interimSpeechText}»
                </p>
              ) : (
                <p className="text-[11px] text-rose-300/80">
                  Говорите в микрофон — слова будут появляться здесь
                </p>
              )}
            </div>
          )}

          {practiceResult && !isPracticingReading && (
            <div className="mt-3 p-3.5 rounded-2xl bg-amber-950/70 border border-amber-600/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm animate-fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle
                  className={`w-5 h-5 shrink-0 ${
                    practiceResult.score >= 70 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                />
                <span className="text-stone-200 font-medium">
                  Оценка чтения отрывка:{' '}
                  <span
                    className={`font-black text-base ${
                      practiceResult.score >= 80
                        ? 'text-emerald-300'
                        : practiceResult.score >= 65
                        ? 'text-amber-300'
                        : 'text-rose-300'
                    }`}
                  >
                    {practiceResult.score} / 100
                  </span>
                </span>
              </div>
              {practiceResult.recognizedText && (
                <span className="text-xs text-stone-300 italic truncate max-w-xs">
                  «{practiceResult.recognizedText}»
                </span>
              )}
            </div>
          )}

          {/* Audio & Mic Practice Controls inside Parchment Frame */}
          <div className="mt-4 pt-1 flex flex-wrap items-center justify-center gap-3">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={handleTogglePlayPause}
              disabled={isPracticingReading}
              className={`w-48 py-3 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-colors shadow-xl active:scale-95 cursor-pointer disabled:opacity-50
                ${
                  audioState === 'playing'
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 border-2 border-amber-300 ring-4 ring-amber-400/30'
                    : 'bg-gradient-to-r from-amber-900 via-amber-850 to-amber-900 hover:from-amber-800 hover:to-amber-800 text-amber-100 border-2 border-amber-600/70 hover:border-amber-400'
                }
              `}
            >
              {audioState === 'playing' ? (
                <>
                  <Pause className="w-4 h-4 fill-stone-950 text-stone-950" />
                  <span>Пауза</span>
                </>
              ) : audioState === 'paused' ? (
                <>
                  <Play className="w-4 h-4 fill-amber-300 text-amber-300" />
                  <span>Продолжить</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-amber-300" />
                  <span>Прослушать</span>
                </>
              )}
            </button>

            {/* Practice Reading in Microphone Button */}
            <button
              type="button"
              onClick={
                isPracticingReading ? handleStopReadingPractice : handleStartReadingPractice
              }
              disabled={isAssessingReading}
              className={`w-52 py-3 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 cursor-pointer border-2
                ${
                  isPracticingReading
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 animate-pulse'
                    : isAssessingReading
                    ? 'bg-stone-800 text-stone-400 border-stone-700'
                    : 'bg-stone-900/90 hover:bg-stone-800 text-amber-200 border-amber-600/70'
                }
              `}
            >
              {isPracticingReading ? (
                <>
                  <Square className="w-4 h-4 fill-white text-white" />
                  <span>Завершить чтение</span>
                </>
              ) : isAssessingReading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Оценка...</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-amber-300" />
                  <span>
                    {practiceResult ? 'Прочитать ещё раз' : 'Прочитать вслух'}
                  </span>
                </>
              )}
            </button>

            {/* Button «Сначала» appears if paused */}
            {audioState === 'paused' && (
              <button
                type="button"
                onClick={handleRestartFromBeginning}
                className="px-4 py-3 rounded-2xl font-bold text-sm sm:text-base flex items-center gap-2 bg-stone-900/90 hover:bg-stone-800 text-amber-200 border-2 border-amber-600/60 shadow-lg active:scale-95 transition-all cursor-pointer whitespace-nowrap animate-fade-in"
                title="Начать прослушивание сначала"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Сначала</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: ЗАПОМНИЛ Button & Excerpt Selectors */}
      <div className="relative z-10 flex flex-col items-center gap-2.5 pb-1">
        {/* Central Action Button: ЗАПОМНИЛ / ЗАПОМНЕНО */}
        <div className="flex justify-center w-full">
          <button
            type="button"
            onClick={handleMemorizeExcerpt}
            disabled={isCurrentMemorized}
            className={`w-56 py-3.5 rounded-2xl font-black text-base sm:text-xl uppercase tracking-wider shadow-2xl transition-all flex items-center justify-center gap-3 whitespace-nowrap
              ${
                isCurrentMemorized
                  ? 'bg-emerald-950/80 border-2 border-emerald-600/70 text-emerald-300 opacity-90 cursor-default'
                  : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 active:scale-95 cursor-pointer ring-2 ring-amber-400/40'
              }
            `}
          >
            <CheckCircle
              className={`w-6 h-6 ${isCurrentMemorized ? 'text-emerald-400' : 'text-stone-950'}`}
            />
            <span>{isCurrentMemorized ? 'Запомнено' : 'Запомнил'}</span>
          </button>
        </div>

        {/* Excerpt Selector Buttons at the VERY BOTTOM with completed green state */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 px-2 pt-0.5 max-w-4xl mx-auto">
          {READING_TEXTS.map((t, idx) => {
            const isMemorized = memorizedExcerptIds.includes(t.id);
            const isCurrent = idx === currentExcerptIndex;

            let btnStyle =
              'bg-stone-900/85 text-stone-300 border-stone-700 hover:bg-stone-800 hover:text-stone-100';
            if (isMemorized && isCurrent) {
              btnStyle =
                'bg-emerald-800 text-white border-2 border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg';
            } else if (isMemorized) {
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
                    playWoodClick();
                    stopExcerptAudio();
                    setCurrentExcerptIndex(idx);
                    setSelectedWordIndex(null);
                    setSelectedWordHelp(null);
                  }
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 rounded-2xl font-bold text-xs sm:text-sm border transition-all active:scale-95 cursor-pointer shadow-md whitespace-nowrap ${btnStyle}`}
              >
                {isMemorized && <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />}
                <span>Отрывок {idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
