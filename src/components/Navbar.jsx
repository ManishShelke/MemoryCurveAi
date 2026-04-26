import React from 'react';
import { Brain, Sun, Moon, LogOut } from 'lucide-react';
import { logoutUser } from '../firebase/authService';
import { getLevel } from './GamificationBar';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  upload: 'Study Upload',
  flashcards: 'Flashcards',
  quiz: 'Quiz Mode',
  pomodoro: 'Pomodoro',
  exam: 'Exam Prep',
  reminders: 'Reminders',
  concepts: 'Concept Breakdown',
  analysis: 'Analysis Mode',
  revision: 'Revision Plan',
  tips: 'Study Tips',
};

export default function Navbar({ theme, toggleTheme, demoMode, activePage, userProgress }) {
  const level = getLevel(userProgress?.xp || 0);

  return (
    <nav className="navbar" id="navbar">
      <div className="navbar-left">
        <h2 className="navbar-page-title">{PAGE_TITLES[activePage] || 'MemoryCurve'}</h2>
      </div>

      <div className="navbar-right">
        {/* XP display */}
        <div className="navbar-xp" title={`${level.name} — ${userProgress?.xp || 0} XP`}>
          <span className="navbar-xp-emoji">{level.emoji}</span>
          <span className="navbar-xp-value">{userProgress?.xp || 0} XP</span>
        </div>

        {demoMode && (
          <div className="demo-indicator pulse">
            <span>⚡ Demo</span>
          </div>
        )}

        <button onClick={toggleTheme} className="nav-btn" title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}>
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <button onClick={logoutUser} className="nav-btn nav-btn-danger" title="Logout">
          <LogOut size={17} />
        </button>
      </div>
    </nav>
  );
}
