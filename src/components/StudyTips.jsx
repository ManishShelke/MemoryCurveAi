import React, { useState } from 'react';
import { Lightbulb, Trophy, Target, Zap, Heart, CheckCircle } from 'lucide-react';

export default function StudyTips({ studyMaterials, onXPEarned }) {
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [completedChallenges, setCompletedChallenges] = useState({});

  const selectedMaterial = selectedMaterialId
    ? studyMaterials.find((m) => m.id === selectedMaterialId)
    : null;

  // Auto-select the most recent material if one isn't selected
  React.useEffect(() => {
    if (!selectedMaterialId && studyMaterials.length > 0) {
      setSelectedMaterialId(studyMaterials[0].id);
    }
  }, [studyMaterials, selectedMaterialId]);

  const tipsData = selectedMaterial?.studyTips || null;

  const toggleChallenge = (idx) => {
    const key = `${selectedMaterialId}-${idx}`;
    const wasComplete = completedChallenges[key];
    setCompletedChallenges((prev) => ({ ...prev, [key]: !wasComplete }));

    if (!wasComplete && tipsData?.challenges?.[idx]) {
      const xp = tipsData.challenges[idx].xp || 50;
      if (onXPEarned) onXPEarned(xp, 'challenge');
    }
  };

  const isChallengeComplete = (idx) => completedChallenges[`${selectedMaterialId}-${idx}`];

  const categoryColors = {
    memory: 'linear-gradient(135deg, #6CB4EE, #4A9BD9)',
    focus: 'linear-gradient(135deg, #FFD93D, #F0C040)',
    technique: 'linear-gradient(135deg, #4ECDC4, #2EAD9E)',
    motivation: 'linear-gradient(135deg, #E8736C, #F0918B)',
  };

  if (studyMaterials.length === 0) {
    return (
      <div className="page-container">
        <div className="glass-card empty-page">
          <Lightbulb size={56} strokeWidth={1} />
          <h2>No Study Tips Yet</h2>
          <p>Upload study material first to get personalized tips.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container tips-page">
      <div className="page-header">
        <h1>🧠 Smart Study Tips</h1>
        <p>Personalized learning strategies, mnemonics, and challenges tailored to your content.</p>
      </div>

      <div className="tips-controls">
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

      {!selectedMaterial || !tipsData ? (
        <div className="glass-card empty-page">
          <p>Select a study material to view smart tips.</p>
        </div>
      ) : (
        <div className="tips-grid">
          {/* Subject Type Badge */}
          <div className="glass-card tips-subject-card">
            <Zap size={18} />
            <span>Subject detected: <strong>{tipsData.subjectType}</strong></span>
          </div>

          {/* Motivational Quote */}
          {tipsData.motivationalQuote && (
            <div className="glass-card tips-quote-card">
              <Heart size={18} />
              <blockquote>"{tipsData.motivationalQuote}"</blockquote>
            </div>
          )}

          {/* Tips */}
          {tipsData.tips?.length > 0 && (
            <div className="glass-card tips-section-card">
              <div className="card-header">
                <div className="card-icon"><Lightbulb size={20} /></div>
                <h2>Study Tips</h2>
              </div>
              <div className="tips-list">
                {tipsData.tips.map((tip, i) => (
                  <div key={i} className="tip-item">
                    <div className="tip-icon" style={{ background: categoryColors[tip.category] || categoryColors.technique }}>
                      <span>{tip.emoji}</span>
                    </div>
                    <div className="tip-content">
                      <h4>{tip.title}</h4>
                      <p>{tip.description}</p>
                      <span className={`tip-category cat-${tip.category}`}>{tip.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mnemonics */}
          {tipsData.mnemonics?.length > 0 && (
            <div className="glass-card tips-section-card">
              <div className="card-header">
                <div className="card-icon" style={{ background: 'linear-gradient(135deg, #FFD93D, #F0C040)' }}>
                  <Zap size={20} />
                </div>
                <h2>Memory Tricks & Mnemonics</h2>
              </div>
              <div className="mnemonics-list">
                {tipsData.mnemonics.map((m, i) => (
                  <div key={i} className="mnemonic-card">
                    <div className="mnemonic-concept">{m.concept}</div>
                    <div className="mnemonic-trick">💡 {m.mnemonic}</div>
                    <p className="mnemonic-explain">{m.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Challenges */}
          {tipsData.challenges?.length > 0 && (
            <div className="glass-card tips-section-card">
              <div className="card-header">
                <div className="card-icon" style={{ background: 'linear-gradient(135deg, #4ECDC4, #2EAD9E)' }}>
                  <Trophy size={20} />
                </div>
                <h2>Mini Challenges</h2>
              </div>
              <div className="challenges-list">
                {tipsData.challenges.map((ch, i) => {
                  const done = isChallengeComplete(i);
                  return (
                    <div
                      key={i}
                      className={`challenge-item ${done ? 'completed' : ''}`}
                      onClick={() => toggleChallenge(i)}
                    >
                      <div className="challenge-check">
                        {done ? <CheckCircle size={20} /> : <Target size={20} />}
                      </div>
                      <div className="challenge-info">
                        <p className="challenge-text">{ch.challenge}</p>
                        <div className="challenge-meta">
                          <span className={`challenge-diff diff-${ch.difficulty}`}>{ch.difficulty}</span>
                          <span className="challenge-xp">+{ch.xp} XP</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Focus Strategies */}
          {tipsData.focusStrategies?.length > 0 && (
            <div className="glass-card tips-section-card">
              <div className="card-header">
                <div className="card-icon" style={{ background: 'linear-gradient(135deg, #6CB4EE, #4A9BD9)' }}>
                  <Target size={20} />
                </div>
                <h2>Focus Strategies</h2>
              </div>
              <ul className="focus-strategies-list">
                {tipsData.focusStrategies.map((s, i) => (
                  <li key={i}><Zap size={14} /> {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
