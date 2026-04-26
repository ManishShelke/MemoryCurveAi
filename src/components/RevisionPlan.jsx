import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, Circle, Target, Sparkles } from 'lucide-react';
import { updateRevisionDayProgress } from '../firebase/firestoreService';
import toast from 'react-hot-toast';

export default function RevisionPlan({ studyMaterials, onXPEarned }) {
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [completedDays, setCompletedDays] = useState({});

  const selectedMaterial = selectedMaterialId
    ? studyMaterials.find((m) => m.id === selectedMaterialId)
    : null;

  // Auto-select the most recent material if one isn't selected
  useEffect(() => {
    if (!selectedMaterialId && studyMaterials.length > 0) {
      setSelectedMaterialId(studyMaterials[0].id);
    }
  }, [studyMaterials, selectedMaterialId]);

  // Load persisted completion data when material changes
  useEffect(() => {
    if (selectedMaterial?.revisionCompletedDays) {
      setCompletedDays((prev) => ({
        ...prev,
        ...selectedMaterial.revisionCompletedDays,
      }));
    }
  }, [selectedMaterial]);

  const revisionData = selectedMaterial?.revisionPlan || null;
  const schedule = revisionData?.schedule || [];

  const toggleDay = async (dayIndex) => {
    const key = `${selectedMaterialId}-${dayIndex}`;
    const newCompleted = !completedDays[key];

    setCompletedDays((prev) => ({
      ...prev,
      [key]: newCompleted,
    }));

    // Persist to Firestore
    try {
      const updatedDays = { ...completedDays, [key]: newCompleted };
      await updateRevisionDayProgress(selectedMaterialId, updatedDays);

      if (newCompleted) {
        // Award XP (+15 per revision day completed)
        if (onXPEarned) {
          onXPEarned(15, 'general');
        }
        toast.success(`Day ${dayIndex + 1} completed! +15 XP 🎯`);
      }
    } catch (e) {
      console.warn('Failed to save revision progress:', e);
    }
  };

  const isDayComplete = (dayIndex) => completedDays[`${selectedMaterialId}-${dayIndex}`];

  const completedCount = schedule.filter((_, i) => isDayComplete(i)).length;
  const progress = schedule.length > 0 ? Math.round((completedCount / schedule.length) * 100) : 0;

  if (studyMaterials.length === 0) {
    return (
      <div className="page-container">
        <div className="glass-card empty-page">
          <Calendar size={56} strokeWidth={1} />
          <h2>No Revision Plans Yet</h2>
          <p>Upload study material first to get a spaced repetition plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container revision-page">
      <div className="page-header">
        <h1>🔁 Revision Plan</h1>
        <p>Follow the Ebbinghaus Forgetting Curve — a scientifically-backed 7-day schedule to lock in your learning.</p>
      </div>

      <div className="revision-controls">
        <select
          className="material-select"
          value={selectedMaterialId}
          onChange={(e) => setSelectedMaterialId(e.target.value)}
        >
          <option value="">Select Study Material</option>
          {studyMaterials.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      </div>

      {!selectedMaterial || !revisionData ? (
        <div className="glass-card empty-page">
          <p>Select a study material to view its revision plan.</p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="glass-card revision-progress-card">
            <div className="revision-progress-header">
              <div>
                <h3>📈 Your Progress</h3>
                <p>{completedCount} of {schedule.length} sessions complete</p>
              </div>
              <div className="revision-progress-pct">{progress}%</div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            {revisionData.totalEstimatedTime && (
              <div className="revision-total-time">
                <Clock size={14} /> Total estimated time: {revisionData.totalEstimatedTime}
              </div>
            )}
          </div>

          {/* Motivation */}
          {revisionData.motivation && (
            <div className="glass-card revision-motivation">
              <Sparkles size={18} />
              <p>{revisionData.motivation}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="revision-timeline">
            {schedule.map((day, i) => {
              const complete = isDayComplete(i);
              return (
                <div key={i} className={`revision-day-card glass-card ${complete ? 'completed' : ''}`}>
                  <div className="revision-day-header" onClick={() => toggleDay(i)}>
                    <div className="revision-day-check">
                      {complete ? (
                        <CheckCircle size={22} className="check-done" />
                      ) : (
                        <Circle size={22} className="check-pending" />
                      )}
                    </div>
                    <div className="revision-day-info">
                      <span className="revision-day-emoji">{day.emoji}</span>
                      <div>
                        <h3>{day.label}</h3>
                        <div className="revision-day-meta">
                          <span><Clock size={12} /> {day.duration}</span>
                          <span className="revision-technique">{day.technique}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="revision-day-body">
                    {/* Activities */}
                    <div className="revision-activities">
                      <h4>Activities</h4>
                      <ul>
                        {day.activities.map((act, j) => (
                          <li key={j}>{act}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Focus Areas */}
                    {day.focusAreas?.length > 0 && (
                      <div className="revision-focus">
                        <h4><Target size={14} /> Focus Areas</h4>
                        <div className="focus-tags">
                          {day.focusAreas.map((area, j) => (
                            <span key={j} className="focus-tag">{area}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
