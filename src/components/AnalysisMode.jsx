import React, { useState } from 'react';
import { Brain, Target, AlertTriangle, Link2, TrendingUp, BookOpen } from 'lucide-react';

export default function AnalysisMode({ studyMaterials }) {
  const [selectedMaterialId, setSelectedMaterialId] = useState('');

  const selectedMaterial = selectedMaterialId
    ? studyMaterials.find((m) => m.id === selectedMaterialId)
    : null;

  // Auto-select the most recent material if one isn't selected
  React.useEffect(() => {
    if (!selectedMaterialId && studyMaterials.length > 0) {
      setSelectedMaterialId(studyMaterials[0].id);
    }
  }, [studyMaterials, selectedMaterialId]);

  const analysis = selectedMaterial?.analysis || null;

  if (studyMaterials.length === 0) {
    return (
      <div className="page-container">
        <div className="glass-card empty-page">
          <Brain size={56} strokeWidth={1} />
          <h2>No Analysis Yet</h2>
          <p>Upload study material first to get AI analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container analysis-page">
      <div className="page-header">
        <h1>🧪 Analysis Mode</h1>
        <p>Understand what to study deeply, what to memorize, and where your weak areas are.</p>
      </div>

      <div className="analysis-controls">
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

      {!selectedMaterial || !analysis ? (
        <div className="glass-card empty-page">
          <p>Select a study material to view its analysis.</p>
        </div>
      ) : (
        <div className="analysis-grid">
          {/* Overall Complexity */}
          <div className="glass-card analysis-complexity-card">
            <div className="complexity-badge">
              <Target size={20} />
              <span>Overall Complexity: </span>
              <strong className={`complexity-${analysis.overallComplexity}`}>
                {analysis.overallComplexity?.toUpperCase()}
              </strong>
            </div>
          </div>

          {/* Core Ideas */}
          {analysis.coreIdeas?.length > 0 && (
            <div className="glass-card analysis-section-card">
              <div className="card-header">
                <div className="card-icon"><Target size={20} /></div>
                <h2>Core Ideas</h2>
              </div>
              <div className="analysis-items">
                {analysis.coreIdeas.map((item, i) => (
                  <div key={i} className={`analysis-item importance-${item.importance}`}>
                    <div className="analysis-item-header">
                      <span className={`importance-badge ${item.importance}`}>{item.importance}</span>
                      <h4>{item.idea}</h4>
                    </div>
                    <p>{item.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Understand Deeply vs Memorize */}
          <div className="analysis-two-col">
            {/* Understand Deeply */}
            {analysis.understandDeeply?.length > 0 && (
              <div className="glass-card analysis-section-card understand-card">
                <div className="card-header">
                  <div className="card-icon" style={{ background: 'linear-gradient(135deg, #6CB4EE, #4A9BD9)' }}>
                    <Brain size={20} />
                  </div>
                  <h2>Understand Deeply</h2>
                </div>
                <ul className="analysis-list understand-list">
                  {analysis.understandDeeply.map((item, i) => (
                    <li key={i}>
                      <span className="list-icon">🧠</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Memorize This */}
            {analysis.memorizeThis?.length > 0 && (
              <div className="glass-card analysis-section-card memorize-card">
                <div className="card-header">
                  <div className="card-icon" style={{ background: 'linear-gradient(135deg, #FFD93D, #F0C040)' }}>
                    <BookOpen size={20} />
                  </div>
                  <h2>Memorize This</h2>
                </div>
                <ul className="analysis-list memorize-list">
                  {analysis.memorizeThis.map((item, i) => (
                    <li key={i}>
                      <span className="list-icon">📝</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Weak Areas */}
          {analysis.weakAreas?.length > 0 && (
            <div className="glass-card analysis-section-card weak-card">
              <div className="card-header">
                <div className="card-icon" style={{ background: 'linear-gradient(135deg, #FF6B8A, #E85D75)' }}>
                  <AlertTriangle size={20} />
                </div>
                <h2>Weak Areas — Need Extra Attention</h2>
              </div>
              <div className="weak-areas-grid">
                {analysis.weakAreas.map((item, i) => (
                  <div key={i} className="weak-area-card">
                    <h4>⚠️ {item.area}</h4>
                    <p className="weak-reason">{item.reason}</p>
                    <p className="weak-suggestion">💡 {item.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connections */}
          {analysis.connections?.length > 0 && (
            <div className="glass-card analysis-section-card">
              <div className="card-header">
                <div className="card-icon" style={{ background: 'linear-gradient(135deg, #4ECDC4, #2EAD9E)' }}>
                  <Link2 size={20} />
                </div>
                <h2>Concept Connections</h2>
              </div>
              <div className="connections-grid">
                {analysis.connections.map((conn, i) => (
                  <div key={i} className="connection-card">
                    <div className="connection-nodes">
                      <span className="conn-node">{conn.from}</span>
                      <span className="conn-arrow">→</span>
                      <span className="conn-node">{conn.to}</span>
                    </div>
                    <p className="conn-rel">{conn.relationship}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Study Priority */}
          {analysis.studyPriority?.length > 0 && (
            <div className="glass-card analysis-section-card">
              <div className="card-header">
                <div className="card-icon"><TrendingUp size={20} /></div>
                <h2>Study Priority Order</h2>
              </div>
              <div className="priority-list">
                {analysis.studyPriority.map((item, i) => (
                  <div key={i} className="priority-item">
                    <span className="priority-num">#{item.priority}</span>
                    <div className="priority-info">
                      <h4>{item.topic}</h4>
                      <p>{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
