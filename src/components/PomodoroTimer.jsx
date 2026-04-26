import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, RotateCcw, Coffee, BookOpen, Settings } from 'lucide-react';
import { addPomodoroSession } from '../firebase/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const MODES = {
  work: { label: 'Focus', duration: 25 * 60, color: 'var(--accent)' },
  shortBreak: { label: 'Short Break', duration: 5 * 60, color: 'var(--success)' },
  longBreak: { label: 'Long Break', duration: 15 * 60, color: 'var(--info)' },
};

export default function PomodoroTimer({ studyMaterials, pomodoroSessions, onXPEarned }) {
  const { currentUser } = useAuth();
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(MODES.work.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [customDurations, setCustomDurations] = useState({
    work: 25, shortBreak: 5, longBreak: 15,
  });
  const intervalRef = useRef(null);

  const totalDuration = mode === 'work'
    ? customDurations.work * 60
    : mode === 'shortBreak'
    ? customDurations.shortBreak * 60
    : customDurations.longBreak * 60;

  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const handleTimerComplete = useCallback(async () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);

    // Play notification sound
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => { oscillator.stop(); audioCtx.close(); }, 500);
    } catch (e) {}

    if (mode === 'work') {
      const newSessions = sessions + 1;
      setSessions(newSessions);

      // Save session to Firestore
      try {
        await addPomodoroSession({
          mode: 'work',
          duration: customDurations.work * 60,
          materialId: selectedMaterial || null,
          materialTitle: studyMaterials.find((m) => m.id === selectedMaterial)?.title || 'General Study',
          sessionNumber: newSessions,
        }, currentUser.uid);
      } catch (e) {
        console.warn('Failed to save pomodoro session:', e);
      }

      // Award XP for completing a focus session
      if (onXPEarned) {
        onXPEarned(30, 'pomodoro');
      }

      toast.success(`Focus session ${newSessions} complete! +30 XP 🎉 Time for a break.`);

      // Auto switch to break
      if (newSessions % 4 === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }
    } else {
      // Save break session too for complete analytics
      try {
        await addPomodoroSession({
          mode: mode,
          duration: mode === 'shortBreak' ? customDurations.shortBreak * 60 : customDurations.longBreak * 60,
          materialId: selectedMaterial || null,
          materialTitle: studyMaterials.find((m) => m.id === selectedMaterial)?.title || 'General Study',
          sessionNumber: sessions,
        }, currentUser.uid);
      } catch (e) {
        console.warn('Failed to save break session:', e);
      }
      toast('Break over! Ready for another focus session? 💪', { icon: '📚' });
      switchMode('work');
    }
  }, [mode, sessions, selectedMaterial, customDurations, currentUser]);

  const switchMode = (newMode) => {
    setMode(newMode);
    const dur = newMode === 'work'
      ? customDurations.work * 60
      : newMode === 'shortBreak'
      ? customDurations.shortBreak * 60
      : customDurations.longBreak * 60;
    setTimeLeft(dur);
    setIsRunning(false);
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(totalDuration);
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Today's stats
  const today = new Date().toDateString();
  const todaySessions = pomodoroSessions.filter(
    (s) => s.completedAt && new Date(s.completedAt).toDateString() === today
  );
  const totalMinutesToday = todaySessions.reduce((acc, s) => acc + (s.duration || 0) / 60, 0);

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="page-container pomodoro-page">
      <div className="page-header">
        <h1>⏱️ Pomodoro Timer</h1>
        <p>Stay focused with timed study sessions. Work 25min → Break 5min → Repeat.</p>
      </div>

      <div className="pomodoro-layout">
        <div className="glass-card pomodoro-main">
          {/* Mode selector */}
          <div className="pomodoro-modes">
            {Object.entries(MODES).map(([key, val]) => (
              <button
                key={key}
                className={`mode-btn ${mode === key ? 'active' : ''}`}
                onClick={() => switchMode(key)}
              >
                {key === 'work' ? <BookOpen size={16} /> : <Coffee size={16} />}
                {val.label}
              </button>
            ))}
          </div>

          {/* Circular Timer */}
          <div className="timer-circle-container">
            <svg className="timer-svg" viewBox="0 0 260 260">
              <circle className="timer-bg-ring" cx="130" cy="130" r="120" />
              <circle
                className="timer-progress-ring"
                cx="130" cy="130" r="120"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                  stroke: MODES[mode].color,
                }}
              />
            </svg>
            <div className="timer-display">
              <span className="timer-time">{formatTime(timeLeft)}</span>
              <span className="timer-mode-label">{MODES[mode].label}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="timer-controls">
            <button className="timer-btn timer-btn-reset" onClick={resetTimer} title="Reset">
              <RotateCcw size={20} />
            </button>
            <button
              className={`timer-btn timer-btn-main ${isRunning ? 'running' : ''}`}
              onClick={toggleTimer}
            >
              {isRunning ? <Pause size={28} /> : <Play size={28} />}
            </button>
            <button className="timer-btn timer-btn-settings" onClick={() => setShowSettings(!showSettings)} title="Settings">
              <Settings size={20} />
            </button>
          </div>

          {/* Material selector */}
          <div className="pomodoro-material">
            <label>Studying:</label>
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
            >
              <option value="">General Study</option>
              {studyMaterials.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>

          {/* Settings */}
          {showSettings && (
            <div className="pomodoro-settings">
              <h4>⚙️ Timer Settings (minutes)</h4>
              <div className="settings-grid">
                {Object.entries(customDurations).map(([key, val]) => (
                  <div key={key} className="setting-field">
                    <label>{key === 'work' ? 'Focus' : key === 'shortBreak' ? 'Short Break' : 'Long Break'}</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={val}
                      onChange={(e) => {
                        const newDur = { ...customDurations, [key]: parseInt(e.target.value) || 1 };
                        setCustomDurations(newDur);
                        if (key === mode) setTimeLeft(newDur[key] * 60);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats sidebar */}
        <div className="pomodoro-stats-col">
          <div className="glass-card pomodoro-stat-card">
            <h3>📊 Today's Progress</h3>
            <div className="pomo-stats-grid">
              <div className="pomo-stat">
                <span className="pomo-stat-value">{sessions}</span>
                <span className="pomo-stat-label">Sessions</span>
              </div>
              <div className="pomo-stat">
                <span className="pomo-stat-value">{Math.round(totalMinutesToday)}</span>
                <span className="pomo-stat-label">Minutes</span>
              </div>
              <div className="pomo-stat">
                <span className="pomo-stat-value">{todaySessions.length}</span>
                <span className="pomo-stat-label">Completed</span>
              </div>
            </div>
          </div>

          <div className="glass-card pomodoro-stat-card">
            <h3>💡 Tips</h3>
            <ul className="pomo-tips">
              <li>🎯 Focus on one task per session</li>
              <li>📱 Put your phone on silent</li>
              <li>💧 Stay hydrated during breaks</li>
              <li>🚶 Walk around during long breaks</li>
              <li>📝 Review flashcards during short breaks</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
