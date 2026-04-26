import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, Sparkles } from 'lucide-react';

export default function ConceptBreakdown({ studyMaterials }) {
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [expandedConcept, setExpandedConcept] = useState(null);

  // Auto-select the most recent material if one isn't selected
  React.useEffect(() => {
    if (!selectedMaterialId && studyMaterials.length > 0) {
      setSelectedMaterialId(studyMaterials[0].id);
    }
  }, [studyMaterials, selectedMaterialId]);

  const selectedMaterial = studyMaterials.find((m) => m.id === selectedMaterialId);
  const rawConcepts = selectedMaterial?.conceptBreakdown?.concepts || [];
  const concepts = Array.isArray(rawConcepts) ? rawConcepts : [];
  const overallTheme = selectedMaterial?.conceptBreakdown?.overallTheme || '';

  if (studyMaterials.length === 0) {
    return (
      <div className="page-container">
        <div className="glass-card empty-page">
          <BookOpen size={56} strokeWidth={1} />
          <h2>No Concepts Yet</h2>
          <p>Upload study material first to get concept breakdowns.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container concept-page">
      <div className="page-header">
        <h1>🧩 Concept Breakdown</h1>
        <p>Complex topics explained simply — with analogies, step-by-step breakdowns, and real-life examples.</p>
      </div>

      <div className="concept-controls">
        <select
          className="material-select"
          value={selectedMaterialId}
          onChange={(e) => { setSelectedMaterialId(e.target.value); setExpandedConcept(null); }}
        >
          <option value="">Select Study Material</option>
          {studyMaterials.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      </div>

      {!selectedMaterial ? (
        <div className="glass-card empty-page">
          <p>Select a study material to explore concept breakdowns.</p>
        </div>
      ) : concepts.length === 0 ? (
        <div className="glass-card empty-page">
          <p>No concept breakdowns available for this material.</p>
        </div>
      ) : (
        <>
          {overallTheme && (
            <div className="glass-card concept-theme-card">
              <Sparkles size={18} />
              <span>Theme: <strong>{typeof overallTheme === 'string' ? overallTheme : ''}</strong></span>
            </div>
          )}

          <div className="concept-grid">
            {concepts.map((concept, i) => {
              if (!concept || typeof concept !== 'object') return null;

              const isExpanded = expandedConcept === i;
              const stepsArr = Array.isArray(concept.steps) ? concept.steps : [];
              const mistakesArr = Array.isArray(concept.commonMistakes) ? concept.commonMistakes : [];
              
              return (
                <div key={i} className={`glass-card concept-card ${isExpanded ? 'expanded' : ''}`}>
                  <div
                    className="concept-card-header"
                    onClick={() => setExpandedConcept(isExpanded ? null : i)}
                  >
                    <div className="concept-title-row">
                      <span className="concept-emoji">{concept.emoji || '💡'}</span>
                      <h3>{concept.title}</h3>
                      <span className={`concept-diff ${concept.difficulty || 'medium'}`}>{concept.difficulty || 'medium'}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>

                  <p className="concept-simple">{concept.simpleExplanation}</p>

                  {isExpanded && (
                    <div className="concept-details">
                      {/* Steps */}
                      {stepsArr.length > 0 && (
                        <div className="concept-section">
                          <h4>📋 Step-by-Step</h4>
                          <ol className="concept-steps">
                            {stepsArr.map((step, j) => (
                              <li key={j}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Analogy */}
                      {concept.analogy && (
                        <div className="concept-section concept-analogy">
                          <h4><Lightbulb size={16} /> Real-Life Analogy</h4>
                          <blockquote>{concept.analogy}</blockquote>
                        </div>
                      )}

                      {/* Common Mistakes */}
                      {mistakesArr.length > 0 && (
                        <div className="concept-section concept-mistakes">
                          <h4><AlertTriangle size={16} /> Common Mistakes</h4>
                          <ul>
                            {mistakesArr.map((m, j) => (
                              <li key={j}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
