import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, ChevronLeft, ChevronRight, RotateCcw, Star,
  Check, X, Zap, ArrowLeft, ArrowRight, Shuffle, Filter
} from 'lucide-react';
import { updateFlashcardProgress } from '../firebase/firestoreService';
import { useAuth } from '../contexts/AuthContext';

export default function FlashcardViewer({ studyMaterials, onXPEarned }) {
  const { currentUser } = useAuth();
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState({});
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [shuffled, setShuffled] = useState(false);
  const [displayCards, setDisplayCards] = useState([]);

  const selectedMaterial = selectedMaterialId
    ? studyMaterials.find((m) => m.id === selectedMaterialId)
    : null;

  // Auto-select the most recent material if one isn't selected
  useEffect(() => {
    if (!selectedMaterialId && studyMaterials.length > 0) {
      setSelectedMaterialId(studyMaterials[0].id);
    }
  }, [studyMaterials, selectedMaterialId]);

  const allCards = selectedMaterial?.flashcards || [];

  // Filter and shuffle
  useEffect(() => {
    let cards = [...allCards];
    if (filterDifficulty !== 'all') {
      cards = cards.filter((c) => c.difficulty === filterDifficulty);
    }
    if (shuffled) {
      cards = cards.sort(() => Math.random() - 0.5);
    }
    setDisplayCards(cards);
    setCurrentIndex(0);
    setFlipped(false);
  }, [selectedMaterialId, filterDifficulty, shuffled, allCards.length]);

  const currentCard = displayCards[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < displayCards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }
  }, [currentIndex, displayCards.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setFlipped(false);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setFlipped((f) => !f);
  }, []);

  const rateCard = async (rating) => {
    setReviewed((prev) => ({
      ...prev,
      [currentIndex]: rating,
    }));

    // Persist to Firestore
    if (selectedMaterialId && currentUser) {
      try {
        await updateFlashcardProgress(selectedMaterialId, currentIndex, rating);
      } catch (e) {
        console.warn('Failed to save flashcard progress:', e);
      }
    }

    // Award XP (+5 per card reviewed)
    if (onXPEarned) {
      onXPEarned(5, 'flashcard');
    }

    // Auto advance after rating
    setTimeout(goNext, 300);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, handleFlip]);

  const reviewedCount = Object.keys(reviewed).length;
  const progressPercent = displayCards.length > 0 ? Math.round((reviewedCount / displayCards.length) * 100) : 0;

  // Empty state
  if (studyMaterials.length === 0) {
    return (
      <div className="page-container">
        <div className="glass-card empty-page">
          <Layers size={56} strokeWidth={1} />
          <h2>No Flashcards Yet</h2>
          <p>Upload study material first to generate flashcards.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container flashcard-page">
      <div className="page-header">
        <h1>🃏 Flashcards</h1>
        <p>Master your concepts with interactive flip cards — rate your confidence and track progress.</p>
      </div>

      {/* Controls */}
      <div className="flashcard-controls">
        <select
          className="material-select"
          value={selectedMaterialId}
          onChange={(e) => { setSelectedMaterialId(e.target.value); setReviewed({}); }}
        >
          <option value="">Select Study Material</option>
          {studyMaterials.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>

        {selectedMaterial && (
          <div className="flashcard-toolbar">
            <div className="filter-group">
              <Filter size={14} />
              {['all', 'easy', 'medium', 'hard'].map((d) => (
                <button
                  key={d}
                  className={`filter-btn ${filterDifficulty === d ? 'active' : ''}`}
                  onClick={() => setFilterDifficulty(d)}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
            <button
              className={`tool-btn ${shuffled ? 'active' : ''}`}
              onClick={() => setShuffled(!shuffled)}
              title="Shuffle cards"
            >
              <Shuffle size={16} />
            </button>
            <button
              className="tool-btn"
              onClick={() => { setReviewed({}); setCurrentIndex(0); setFlipped(false); }}
              title="Reset progress"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        )}
      </div>

      {!selectedMaterial ? (
        <div className="glass-card empty-page">
          <p>Select a study material above to start reviewing flashcards.</p>
        </div>
      ) : displayCards.length === 0 ? (
        <div className="glass-card empty-page">
          <p>No flashcards match the current filter.</p>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="flashcard-progress">
            <div className="progress-info">
              <span>{reviewedCount} / {displayCards.length} reviewed</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          {/* Card */}
          <div className="flashcard-stage">
            <button
              className="flashcard-nav-btn"
              onClick={goPrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={24} />
            </button>

            <div
              className={`flashcard-3d ${flipped ? 'flipped' : ''}`}
              onClick={handleFlip}
            >
              <div className="flashcard-inner">
                <div className="flashcard-face flashcard-front">
                  <span className="flashcard-label">QUESTION</span>
                  <p className="flashcard-text">{currentCard?.front}</p>
                  <span className={`flashcard-diff ${currentCard?.difficulty}`}>
                    {currentCard?.difficulty}
                  </span>
                  {currentCard?.category && (
                    <span className="flashcard-category">{currentCard.category}</span>
                  )}
                  <span className="flashcard-hint">Click or press Space to flip</span>
                </div>
                <div className="flashcard-face flashcard-back">
                  <span className="flashcard-label">ANSWER</span>
                  <p className="flashcard-text">{currentCard?.back}</p>
                  <span className="flashcard-hint">Rate your recall below</span>
                </div>
              </div>
            </div>

            <button
              className="flashcard-nav-btn"
              onClick={goNext}
              disabled={currentIndex === displayCards.length - 1}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Card Counter */}
          <div className="flashcard-counter">
            Card {currentIndex + 1} of {displayCards.length}
          </div>

          {/* Rating Buttons */}
          <div className="flashcard-rating">
            <button
              className={`rate-btn rate-hard ${reviewed[currentIndex] === 'hard' ? 'selected' : ''}`}
              onClick={() => rateCard('hard')}
            >
              <X size={18} />
              <span>Hard</span>
              <small>Review soon</small>
            </button>
            <button
              className={`rate-btn rate-medium ${reviewed[currentIndex] === 'medium' ? 'selected' : ''}`}
              onClick={() => rateCard('medium')}
            >
              <Zap size={18} />
              <span>Medium</span>
              <small>Got it partially</small>
            </button>
            <button
              className={`rate-btn rate-easy ${reviewed[currentIndex] === 'easy' ? 'selected' : ''}`}
              onClick={() => rateCard('easy')}
            >
              <Check size={18} />
              <span>Easy</span>
              <small>Nailed it!</small>
            </button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="flashcard-shortcuts">
            <span><kbd>←</kbd> Previous</span>
            <span><kbd>Space</kbd> Flip</span>
            <span><kbd>→</kbd> Next</span>
          </div>
        </>
      )}
    </div>
  );
}
