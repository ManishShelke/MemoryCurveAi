// ─────────────────────────────────────────────────────────────
// Ebbinghaus Forgetting Curve – Scheduling Engine
// ─────────────────────────────────────────────────────────────
//
// The Ebbinghaus forgetting curve models memory retention as:
//   R = e^(-t / S)
// where:
//   R = retention (0–1)
//   t = time since learning
//   S = stability (how strong the memory is)
//
// After each successful review, stability increases (memory
// gets stronger), so the next review can be scheduled further
// out. If the user forgets, stability decreases and the next
// review comes sooner.
//
// This module provides:
// 1. Default & demo interval sets
// 2. computeReminders() – generates scheduled reminder times
// 3. getRetention()     – calculates current retention %
// 4. adjustInterval()   – adaptive interval based on feedback
// ─────────────────────────────────────────────────────────────

/**
 * Default spaced-repetition intervals in MILLISECONDS.
 * Based on Ebbinghaus research: review at expanding intervals.
 */
export const DEFAULT_INTERVALS = [
  { label: 'Immediate',  ms: 0 },
  { label: '1 Day',      ms: 1  * 24 * 60 * 60 * 1000 },
  { label: '3 Days',     ms: 3  * 24 * 60 * 60 * 1000 },
  { label: '7 Days',     ms: 7  * 24 * 60 * 60 * 1000 },
  { label: '14 Days',    ms: 14 * 24 * 60 * 60 * 1000 },
  { label: '30 Days',    ms: 30 * 24 * 60 * 60 * 1000 },
];

/**
 * Demo-mode intervals: compressed to MINUTES so judges can
 * see reminders fire in real-time during a hackathon demo.
 *   1 day  → 1 min
 *   3 days → 3 min
 *   7 days → 7 min  (etc.)
 */
export const DEMO_INTERVALS = [
  { label: 'Immediate',   ms: 0 },
  { label: '1 min  (1d)', ms: 1  * 60 * 1000 },
  { label: '3 min  (3d)', ms: 3  * 60 * 1000 },
  { label: '7 min  (7d)', ms: 7  * 60 * 1000 },
  { label: '10 min (14d)', ms: 10 * 60 * 1000 },
  { label: '15 min (30d)', ms: 15 * 60 * 1000 },
];

/**
 * Compute all reminder timestamps for a given lesson.
 *
 * @param {string|Date} lessonTimestamp – when the lesson was learned
 * @param {boolean} demoMode – true → use compressed intervals
 * @returns {Array<{label: string, time: Date, ms: number}>}
 */
export function computeReminders(lessonTimestamp, demoMode = false) {
  const base = new Date(lessonTimestamp).getTime();
  const intervals = demoMode ? DEMO_INTERVALS : DEFAULT_INTERVALS;

  return intervals.map((interval) => ({
    label: interval.label,
    time: new Date(base + interval.ms),
    ms: interval.ms,
  }));
}

/**
 * Calculate current retention level using the forgetting curve.
 *
 * @param {number} elapsedMs – time since last review in ms
 * @param {number} stability – memory stability factor (default 1)
 * @returns {number} retention between 0 and 1
 */
export function getRetention(elapsedMs, stability = 1) {
  // Convert to days for the formula
  const t = elapsedMs / (24 * 60 * 60 * 1000);
  // S is the stability in "days" – higher = slow forgetting
  const S = stability;
  return Math.exp(-t / S);
}

/**
 * Adjust the next interval based on user feedback.
 * - "remembered" → 1.5× the base interval (user is retaining well)
 * - "forgot"     → 0.5× the base interval (user needs sooner review)
 *
 * @param {number} baseIntervalMs – the current interval in ms
 * @param {'remembered'|'forgot'} feedback
 * @returns {number} adjusted interval in ms
 */
export function adjustInterval(baseIntervalMs, feedback) {
  if (feedback === 'remembered') {
    return Math.round(baseIntervalMs * 1.5);
  } else if (feedback === 'forgot') {
    return Math.round(baseIntervalMs * 0.5);
  }
  return baseIntervalMs;
}

/**
 * Get a human-readable time-until string.
 *
 * @param {Date|string} targetTime
 * @returns {string} e.g. "2m 30s", "1h 15m", "Due now!"
 */
export function getTimeUntil(targetTime) {
  const now = Date.now();
  const target = new Date(targetTime).getTime();
  const diff = target - now;

  if (diff <= 0) return 'Due now!';

  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours   = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0)    return `${days}d ${hours}h`;
  if (hours > 0)   return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
