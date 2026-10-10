import React, { useState, useEffect, useCallback } from 'react';
import { KioskMode, LearnTask, CheckTask } from './types';
import { VOCABULARY_LIST } from './data/vocabulary';
import { HeaderBar } from './components/HeaderBar';
import { InstructionModal } from './components/InstructionModal';
import { StaffSettingsModal } from './components/admin/StaffSettingsModal';
import { MicrophonePermissionModal } from './components/common/MicrophonePermissionModal';
import { PronounceAssessTestModal } from './components/test/PronounceAssessTestModal';
import { KioskResetCountdown } from './components/common/KioskResetCountdown';
import { LearnModeStart } from './components/learn/LearnModeStart';
import { Task1WordMemorize } from './components/learn/Task1WordMemorize';
import { Task2Reading } from './components/learn/Task2Reading';
import { CheckModeStart } from './components/check/CheckModeStart';
import { CheckModeExam } from './components/check/CheckModeExam';
import { CheckReadingExam } from './components/check/CheckReadingExam';
import { useInactivityTimer } from './hooks/useInactivityTimer';

export default function App() {
  // Read initial mode from URL (Section 25: ?mode=learn vs ?mode=check)
  const getInitialMode = (): KioskMode => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('mode');
      if (m === 'check') return 'check';
    }
    return 'learn';
  };

  const [mode, setMode] = useState<KioskMode>(getInitialMode);
  const [learnTask, setLearnTask] = useState<LearnTask>('selection');
  const [checkTask, setCheckTask] = useState<CheckTask>('selection');
  const [studiedWordIds, setStudiedWordIds] = useState<string[]>([]);
  const [isModeLocked, setIsModeLocked] = useState<boolean>(false);
  const [inactivityTimeout, setInactivityTimeout] = useState<number>(180); // 3 minutes

  // Modals
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(false);
  const [isStaffSettingsOpen, setIsStaffSettingsOpen] = useState<boolean>(false);
  const [isMicModalOpen, setIsMicModalOpen] = useState<boolean>(false);
  const [micModalError, setMicModalError] = useState<string | null>(null);
  const [isPronounceTestOpen, setIsPronounceTestOpen] = useState<boolean>(false);

  const handleOpenMicCheck = useCallback((errorMsg?: string) => {
    setMicModalError(errorMsg || null);
    setIsMicModalOpen(true);
  }, []);

  // Kiosk Inactivity Reset Handler (Forget learned words & return to start page at 3 min)
  const handleInactivityReset = useCallback(() => {
    setLearnTask('selection');
    setCheckTask('selection');
    setStudiedWordIds([]); // Forget words learned in incomplete session
    setIsInstructionsOpen(false);
    setIsStaffSettingsOpen(false);
  }, []);

  const { secondsRemaining, isWarningActive, resetTimer } = useInactivityTimer({
    timeoutSeconds: inactivityTimeout,
    warningSeconds: 30, // Appears at 2:30 (30 seconds remaining)
    onReset: handleInactivityReset,
    enabled: true,
  });

  // Switch mode and update browser URL without page reload
  const handleSwitchMode = (newMode: KioskMode) => {
    setMode(newMode);
    setLearnTask('selection');
    setCheckTask('selection');
    const url = new URL(window.location.href);
    url.searchParams.set('mode', newMode);
    window.history.replaceState({}, '', url.toString());
  };

  const handleMarkWordStudied = (itemId: string) => {
    if (!studiedWordIds.includes(itemId)) {
      setStudiedWordIds((prev) => [...prev, itemId]);
    }
  };

  const handleResetToHome = () => {
    setLearnTask('selection');
    setCheckTask('selection');
    resetTimer();
  };

  const handleFullReset = () => {
    setLearnTask('selection');
    setCheckTask('selection');
    setStudiedWordIds([]);
    resetTimer();
  };

  const isHomeButtonVisible =
    (mode === 'learn' && learnTask !== 'selection') ||
    (mode === 'check' && checkTask !== 'selection');

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 text-stone-100 flex flex-col font-sans select-none touch-manipulation">
      {/* Top Header Bar */}
      <HeaderBar
        mode={mode}
        onSwitchMode={handleSwitchMode}
        onOpenInstructions={() => setIsInstructionsOpen(true)}
        onResetToHome={handleResetToHome}
        onOpenSettings={() => setIsStaffSettingsOpen(true)}
        onOpenMicCheck={() => handleOpenMicCheck()}
        onOpenPronounceTest={() => setIsPronounceTestOpen(true)}
        showHomeButton={isHomeButtonVisible}
      />

      {/* Main Kiosk Content Area */}
      <main className="relative flex-1 w-full h-[calc(100vh-64px)] overflow-hidden">
        {mode === 'learn' ? (
          /* ================= SCREEN 1: ENTRANCE / LEARNING ================= */
          learnTask === 'selection' ? (
            <LearnModeStart
              onSelectTask1={() => setLearnTask('task1_memorize')}
              onSelectTask2={() => setLearnTask('task2_reading')}
              onOpenInstructions={() => setIsInstructionsOpen(true)}
              onResetProgress={handleFullReset}
              studiedCount={studiedWordIds.length}
              totalWords={VOCABULARY_LIST.length}
            />
          ) : learnTask === 'task1_memorize' ? (
            <Task1WordMemorize
              vocabulary={VOCABULARY_LIST}
              studiedIds={studiedWordIds}
              onMarkStudied={handleMarkWordStudied}
              onGoToTask2={() => setLearnTask('task2_reading')}
              onFinishTask={() => setLearnTask('selection')}
              onOpenInstructions={() => setIsInstructionsOpen(true)}
              onOpenMicCheck={handleOpenMicCheck}
            />
          ) : (
            <Task2Reading
              onBackToSelection={() => setLearnTask('selection')}
              onOpenInstructions={() => setIsInstructionsOpen(true)}
              onOpenMicCheck={handleOpenMicCheck}
            />
          )
        ) : (
          /* ================= SCREEN 2: EXIT / CHECK ================= */
          checkTask === 'selection' ? (
            <CheckModeStart
              onSelectCheckWords={() => setCheckTask('check_words')}
              onSelectCheckReading={() => setCheckTask('check_reading')}
              onOpenInstructions={() => setIsInstructionsOpen(true)}
            />
          ) : checkTask === 'check_words' ? (
            <CheckModeExam
              vocabulary={VOCABULARY_LIST}
              onOpenInstructions={() => setIsInstructionsOpen(true)}
              onRestartExam={() => resetTimer()}
              onResetToHome={() => setCheckTask('selection')}
              onOpenMicCheck={handleOpenMicCheck}
            />
          ) : (
            <CheckReadingExam
              onOpenInstructions={() => setIsInstructionsOpen(true)}
              onResetToHome={() => setCheckTask('selection')}
              onOpenMicCheck={handleOpenMicCheck}
            />
          )
        )}
      </main>

      {/* Inactivity Warning Countdown (15 sec prompt) */}
      {isWarningActive && (
        <KioskResetCountdown
          secondsRemaining={secondsRemaining}
          onKeepActive={resetTimer}
        />
      )}

      {/* Instruction Modal */}
      <InstructionModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        context={
          mode === 'check'
            ? checkTask === 'check_reading'
              ? 'check_reading'
              : checkTask === 'check_words'
              ? 'check_words'
              : 'check'
            : learnTask === 'task2_reading'
            ? 'task2'
            : 'task1'
        }
      />

      {/* Staff Settings Modal */}
      <StaffSettingsModal
        isOpen={isStaffSettingsOpen}
        onClose={() => setIsStaffSettingsOpen(false)}
        currentMode={mode}
        onSetMode={handleSwitchMode}
        isModeLocked={isModeLocked}
        onToggleModeLock={setIsModeLocked}
        inactivityTimeout={inactivityTimeout}
        onSetInactivityTimeout={setInactivityTimeout}
        onFullReset={handleFullReset}
        onOpenMicCheck={() => handleOpenMicCheck()}
        onOpenPronounceTest={() => setIsPronounceTestOpen(true)}
      />

      {/* Microphone Permission & Live Audio Diagnostic Modal */}
      <MicrophonePermissionModal
        isOpen={isMicModalOpen}
        onClose={() => setIsMicModalOpen(false)}
        initialError={micModalError}
      />

      {/* 3 Sentences Testing Modal using pronounce-assess */}
      <PronounceAssessTestModal
        isOpen={isPronounceTestOpen}
        onClose={() => setIsPronounceTestOpen(false)}
        onOpenMicCheck={() => handleOpenMicCheck()}
      />
    </div>
  );
}
