import React from 'react';
import { X, BrainCircuit, LineChart, History } from 'lucide-react';

export default function EbbinghausModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="card-icon">
              <BrainCircuit size={20} />
            </div>
            <h2>The Science of Memory</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="info-section">
            <h3>Who was Hermann Ebbinghaus?</h3>
            <p>
              Hermann Ebbinghaus (1850–1909) was a pioneering German psychologist who pioneered the experimental study of memory.
              He is most famous for discovering the <strong>Forgetting Curve</strong> and the <strong>Spacing Effect</strong>.
              He performed intensive self-experiments, memorizing lists of nonsense syllables to track exactly how fast humans forget new information.
            </p>
          </div>

          <div className="info-grid">
            <div className="info-card">
              <div className="info-card-header">
                <LineChart size={18} className="text-accent" />
                <h4>The Forgetting Curve</h4>
              </div>
              <p>
                The curve shows how information is exponentially lost over time when there is no attempt to retain it.
                Humans typically halve their memory of newly learned knowledge in a matter of days or weeks unless they consciously review the learned material.
              </p>
              <div className="formula-box">
                <code>R = e<sup>−t/S</sup></code>
                <span className="formula-caption">R = Retention, t = Time, S = Stability</span>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <History size={18} className="text-accent" />
                <h4>Spaced Repetition</h4>
              </div>
              <p>
                The <strong>Spacing Effect</strong> is the phenomenon whereby learning is greater when studying is spread out over time, as opposed to studying the same amount of content in a single session.
                Reviewing information just as you are about to forget it completely resets the curve and flattens it out.
              </p>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>Understood</button>
        </div>
      </div>
    </div>
  );
}
