import React from 'react';
import {
  LayoutDashboard, Upload, Layers, FileQuestion, Timer,
  Bell, ChevronLeft, ChevronRight, Brain, BookOpen,
  BarChart3, Calendar, Lightbulb, TestTube
} from 'lucide-react';
import GamificationBar from './GamificationBar';

const NAV_SECTIONS = [
  {
    label: 'Learn',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'upload', label: 'Study Upload', icon: Upload },
    ],
  },
  {
    label: 'Practice',
    items: [
      { id: 'flashcards', label: 'Flashcards', icon: Layers },
      { id: 'quiz', label: 'Quiz Mode', icon: FileQuestion },
    ],
  },
  {
    label: 'Understand',
    items: [
      { id: 'concepts', label: 'Concepts', icon: Brain },
      { id: 'analysis', label: 'Analysis', icon: TestTube },
    ],
  },
  {
    label: 'Review',
    items: [
      { id: 'revision', label: 'Revision Plan', icon: Calendar },
      { id: 'pomodoro', label: 'Pomodoro', icon: Timer },
      { id: 'reminders', label: 'Reminders', icon: Bell },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate, collapsed, onToggle, materialCount, userProgress }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} id="sidebar">
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <Brain size={22} />
            </div>
            <span className="sidebar-title">MemoryCurve</span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Gamification */}
      <div className="sidebar-gamification">
        <GamificationBar
          xp={userProgress?.xp || 0}
          streak={userProgress?.streak || 0}
          collapsed={collapsed}
        />
      </div>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="sidebar-section">
            {!collapsed && <span className="sidebar-section-label">{section.label}</span>}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  id={`nav-${item.id}`}
                >
                  <Icon size={20} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-tip">
            <span className="tip-icon">💡</span>
            <p>Upload study material to get AI-generated summaries and exam prep!</p>
          </div>
        </div>
      )}
    </aside>
  );
}
