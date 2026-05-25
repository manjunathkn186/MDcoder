type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const THRESHOLD: Level = (import.meta.env.VITE_LOG_LEVEL ?? "info") as Level;

function emit(level: Level, args: unknown[]): void {
  if (ORDER[level] < ORDER[THRESHOLD]) return;
  const fn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(`[${level}]`, ...args);
}

export const logger = {
  debug: (...a: unknown[]) => emit("debug", a),
  info: (...a: unknown[]) => emit("info", a),
  warn: (...a: unknown[]) => emit("warn", a),
  error: (...a: unknown[]) => emit("error", a),
};
