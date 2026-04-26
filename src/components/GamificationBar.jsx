import React from 'react';
import { Trophy, Flame, Star, Zap, TrendingUp } from 'lucide-react';

const LEVELS = [
  { name: 'Beginner', minXP: 0, emoji: '🌱', color: '#4ECDC4' },
  { name: 'Learner', minXP: 200, emoji: '📖', color: '#6CB4EE' },
  { name: 'Scholar', minXP: 500, emoji: '🎓', color: '#FFD93D' },
  { name: 'Expert', minXP: 1000, emoji: '⭐', color: '#E8736C' },
  { name: 'Master', minXP: 2000, emoji: '🏆', color: '#F0918B' },
  { name: 'Genius', minXP: 5000, emoji: '🧠', color: '#D45A52' },
];

export function getLevel(xp) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXP) level = l;
  }
  return level;
}

export function getNextLevel(xp) {
  for (const l of LEVELS) {
    if (xp < l.minXP) return l;
  }
  return null;
}

export function getLevelProgress(xp) {
  const current = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 100; // Max level
  const range = next.minXP - current.minXP;
  const progress = xp - current.minXP;
  return Math.round((progress / range) * 100);
}

export default function GamificationBar({ xp = 0, streak = 0, collapsed = false }) {
  const level = getLevel(xp);
  const nextLevel = getNextLevel(xp);
  const progress = getLevelProgress(xp);

  if (collapsed) {
    return (
      <div className="gamification-collapsed">
        <div className="gami-mini" title={`Level: ${level.name} | ${xp} XP`}>
          <span>{level.emoji}</span>
        </div>
        {streak > 0 && (
          <div className="gami-mini streak-mini" title={`${streak} day streak`}>
            <Flame size={14} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="gamification-bar">
      {/* Level Info */}
      <div className="gami-level-row">
        <span className="gami-level-emoji">{level.emoji}</span>
        <div className="gami-level-info">
          <span className="gami-level-name">{level.name}</span>
          <span className="gami-xp">{xp} XP</span>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="gami-progress">
        <div className="gami-progress-bar">
          <div
            className="gami-progress-fill"
            style={{ width: `${progress}%`, background: level.color }}
          ></div>
        </div>
        {nextLevel && (
          <span className="gami-next-level">
            {nextLevel.emoji} {nextLevel.minXP - xp} XP to {nextLevel.name}
          </span>
        )}
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="gami-streak">
          <Flame size={14} className="streak-flame" />
          <span>{streak} day streak</span>
        </div>
      )}
    </div>
  );
}
