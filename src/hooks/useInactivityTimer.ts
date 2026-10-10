import { useEffect, useRef, useState, useCallback } from 'react';

interface InactivityTimerOptions {
  timeoutSeconds?: number; // default 180 (3 min)
  warningSeconds?: number; // default 30 (appears at 2:30 mark)
  onReset: () => void;
  enabled?: boolean;
}

export function useInactivityTimer({
  timeoutSeconds = 180,
  warningSeconds = 30,
  onReset,
  enabled = true
}: InactivityTimerOptions) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(timeoutSeconds);
  const [isWarningActive, setIsWarningActive] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsRemaining(timeoutSeconds);
    setIsWarningActive(false);
  }, [timeoutSeconds]);

  useEffect(() => {
    if (!enabled) return;

    const handleUserInteraction = () => {
      lastActivityRef.current = Date.now();
      if (isWarningActive) {
        setIsWarningActive(false);
      }
    };

    const events = ['pointerdown', 'touchstart', 'click', 'keydown'];
    events.forEach((ev) => window.addEventListener(ev, handleUserInteraction, { passive: true }));

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, timeoutSeconds - elapsed);
      setSecondsRemaining(remaining);

      if (remaining <= warningSeconds && remaining > 0) {
        setIsWarningActive(true);
      } else if (remaining > warningSeconds) {
        setIsWarningActive(false);
      }

      if (remaining === 0) {
        setIsWarningActive(false);
        lastActivityRef.current = Date.now();
        onReset();
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserInteraction));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, timeoutSeconds, warningSeconds, onReset, isWarningActive]);

  return {
    secondsRemaining,
    isWarningActive,
    resetTimer
  };
}
