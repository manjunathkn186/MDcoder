import { useMemo } from "react";

export interface DocMetrics {
  characters: number;
  words: number;
  /** Reading time in minutes (rounded up, min 1). */
  readingMinutes: number;
}

const WPM = 220;

export function computeMetrics(text: string): DocMetrics {
  const characters = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readingMinutes = Math.max(1, Math.ceil(words / WPM));
  return { characters, words, readingMinutes };
}

export function useDocMetrics(text: string): DocMetrics {
  return useMemo(() => computeMetrics(text), [text]);
}
