import React, { useState, useEffect, useRef } from 'react';
import {
  FileQuestion, Download, ChevronDown, ChevronUp,
  Star, AlertTriangle, BookOpen, Tag
} from 'lucide-react';
import mermaid from 'mermaid';
import { marked } from 'marked';
import SpeechControls from './SpeechControls';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#E8736C',
    primaryTextColor: '#EAEAF0',
    primaryBorderColor: '#E8736C',
    lineColor: '#A8A5B8',
    secondaryColor: '#161632',
    tertiaryColor: '#111125',
  },
});

function MermaidDiagram({ code, id }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(`mermaid-${id}`, code);
        setSvg(renderedSvg);
        setError(null);
      } catch (e) {
        setError('Diagram could not be rendered');
        console.warn('Mermaid error:', e);
      }
    };
    if (code) renderDiagram();
  }, [code, id]);

  if (error) return <div className="diagram-error"><AlertTriangle size={16} /> {error}</div>;
  return <div className="mermaid-container" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function ExamQuestions({ studyMaterials }) {
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [activeTab, setActiveTab] = useState('questions'); // questions, diagrams, notes
  const [expandedQ, setExpandedQ] = useState(null);

  // Auto-select the most recent material if one isn't selected
  useEffect(() => {
    if (!selectedMaterialId && studyMaterials.length > 0) {
      setSelectedMaterialId(studyMaterials[0].id);
    }
  }, [studyMaterials, selectedMaterialId]);

  const selectedMaterial = selectedMaterialId
    ? studyMaterials.find((m) => m.id === selectedMaterialId)
    : null;

  const handlePrint = () => {
    window.print();
  };

  if (studyMaterials.length === 0) {
    return (
      <div className="page-container">
        <div className="glass-card empty-page">
          <FileQuestion size={56} strokeWidth={1} />
          <h2>No Exam Questions Yet</h2>
          <p>Upload study material first to generate exam-style questions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container exam-page">
      <div className="page-header">
        <h1>🎓 Exam Prep & Visual Notes</h1>
        <p>Review important exam questions, visual diagrams, and interactive notes.</p>
      </div>

      {/* Material selector */}
      <div className="exam-controls">
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

        {selectedMaterial && (
          <div className="exam-tabs">
            <button
              className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
            >📝 Exam Questions</button>
            <button
              className={`tab-btn ${activeTab === 'diagrams' ? 'active' : ''}`}
              onClick={() => setActiveTab('diagrams')}
            >📊 Diagrams</button>
            <button
              className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >📒 Notes</button>
          </div>
        )}
      </div>

      {!selectedMaterial ? (
        <div className="glass-card empty-page">
          <p>Select a study material above to view exam prep content.</p>
        </div>
      ) : (
        <>
          {/* ── Exam Questions Tab ── */}
          {activeTab === 'questions' && (
            <div className="exam-content">
              {selectedMaterial.examTips?.length > 0 && (
                <div className="glass-card exam-tips-card">
                  <h3>💡 Exam Tips</h3>
                  <ul>
                    {selectedMaterial.examTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="exam-questions-list">
                {(selectedMaterial.examQuestions || []).map((q, i) => (
                  <div key={i} className="glass-card exam-q-card">
                    <div
                      className="exam-q-header"
                      onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                    >
                      <div className="exam-q-left">
                        <span className="exam-q-num">Q{i + 1}</span>
                        <div className="exam-q-meta">
                          <span className={`exam-type ${q.type}`}>{q.type}</span>
                          <span className="exam-marks">{q.marks} marks</span>
                          {q.frequency && (
                            <span className={`exam-freq freq-${q.frequency}`}>
                              <Star size={12} /> {q.frequency} frequency
                            </span>
                          )}
                        </div>
                      </div>
                      {expandedQ === i ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                    <p className="exam-q-text">{q.question}</p>

                    {q.keyConceptsTested?.length > 0 && (
                      <div className="exam-concepts">
                        {q.keyConceptsTested.map((c, j) => (
                          <span key={j} className="concept-tag"><Tag size={12} /> {c}</span>
                        ))}
                      </div>
                    )}

                    {expandedQ === i && (
                      <div className="exam-q-answer">
                        <h4>Model Answer</h4>
                        <p>{q.modelAnswer}</p>
                        {q.type === 'mcq' && q.options && (
                          <div className="exam-mcq-options">
                            {q.options.map((opt, j) => (
                              <div
                                key={j}
                                className={`exam-mcq-opt ${j === q.correctAnswer ? 'correct' : ''}`}
                              >
                                <span>{'ABCD'[j]}.</span> {opt}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button className="btn-outline-full" onClick={handlePrint}>
                <Download size={16} /> Print / Download as PDF
              </button>
            </div>
          )}

          {/* ── Diagrams Tab ── */}
          {activeTab === 'diagrams' && (
            <div className="exam-content">
              {(selectedMaterial.diagrams || []).length === 0 ? (
                <div className="glass-card empty-page">
                  <p>No diagrams generated for this material.</p>
                </div>
              ) : (
                (selectedMaterial.diagrams || []).map((d, i) => (
                  <div key={i} className="glass-card diagram-card">
                    <h3>{d.title}</h3>
                    <p className="diagram-desc">{d.description}</p>
                    <MermaidDiagram code={d.mermaidCode} id={`${selectedMaterialId}-${i}`} />
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Notes Tab ── */}
          {activeTab === 'notes' && (
            <div className="exam-content">
              <div className="glass-card notes-card">
                <div className="notes-toolbar">
                  <SpeechControls text={selectedMaterial.notes} mode="tts" />
                </div>
                <div
                  className="notes-content markdown-body"
                  dangerouslySetInnerHTML={{ __html: marked.parse(selectedMaterial.notes || 'No notes generated.') }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
