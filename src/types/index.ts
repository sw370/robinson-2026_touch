export type KioskMode = 'learn' | 'check';

export type LearnTask = 'selection' | 'task1_memorize' | 'task2_reading';

export type CheckTask = 'selection' | 'check_words' | 'check_reading';

export interface HitboxCoordinates {
  // Percentages relative to image container (0 to 100)
  x: number;
  y: number;
  width: number;
  height: number;
  labelPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export interface VocabularyItem {
  id: string;
  english: string;
  russian: string;
  transcription: string;
  imageObject: string;
  description: string;
  hitbox: HitboxCoordinates;
}

export interface WordAssistance {
  word: string;
  transcription: string;
  translation: string;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface RussianToken {
  text: string;
  enIndices: number[];
}

export interface ReadingText {
  id: number;
  title: string;
  subtitle: string;
  period: string;
  english: string;
  russian: string;
  dictionary: Record<string, WordAssistance>;
  wordTimings: WordTiming[];
  russianTokens: RussianToken[];
  enToRuMapping: Record<number, number[]>;
}

export interface WordScore {
  word: string;
  score: number; // 0 to 100
  status: 'good' | 'medium' | 'weak';
}

export interface PhonemeEvent {
  phoneme: string;
  label: 'correct' | 'minor_error' | 'incorrect';
  score: number;
}

export interface ExamWordResult {
  itemId: string;
  english: string;
  russian: string;
  attempts: number;
  pronunciationScore: number;
  pronouncedText?: string;
  passed: boolean;
  events?: PhonemeEvent[];
}
