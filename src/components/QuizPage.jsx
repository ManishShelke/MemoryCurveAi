import React, { useState } from 'react';
import {
  FileQuestion, CheckCircle, XCircle, Award,
  RotateCcw, ChevronRight, BarChart3, Clock
} from 'lucide-react';
import { addQuizAttempt } from '../firebase/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function QuizPage({ studyMaterials, onXPEarned }) {
  const { currentUser } = useAuth();
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState({});
  const [quizComplete, setQuizComplete] = useState(false);
  const [score, setScore] = useState(0);

  // Auto-select the most recent material if one isn't selected
  React.useEffect(() => {
    if (!selectedMaterialId && studyMaterials.length > 0) {
      setSelectedMaterialId(studyMaterials[0].id);
    }
  }, [studyMaterials, selectedMaterialId]);

  const selectedMaterial = selectedMaterialId
    ? studyMaterials.find((m) => m.id === selectedMaterialId)
    : null;

  const questions = selectedMaterial?.quizQuestions || [];
  const currentQuestion = questions[currentQ];

  const handleSelectAnswer = (optionIdx) => {
    if (showExplanation) return; // Already answered
    setSelectedAnswer(optionIdx);
  };

  const handleConfirm = () => {
    if (selectedAnswer === null) {
      toast.error('Please select an answer.');
      return;
    }

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setAnswers((prev) => ({
      ...prev,
      [currentQ]: { selected: selectedAnswer, correct: isCorrect },
    }));

    if (isCorrect) {
      setScore((s) => s + 1);
    }

    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Quiz complete
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    // Score is already correct — handleConfirm increments it before we get here
    const finalScore = score;
    setQuizComplete(true);

    // Save attempt
    if (currentUser) {
      try {
        await addQuizAttempt({
          materialId: selectedMaterialId,
          materialTitle: selectedMaterial.title,
          score: finalScore,
          totalQuestions: questions.length,
          percentage: Math.round((finalScore / questions.length) * 100),
          answers,
        }, currentUser.uid);

        // XP for completing quiz
        const xpEarned = Math.round((finalScore / questions.length) * 100);
        if (onXPEarned) onXPEarned(xpEarned, 'quiz');
        toast.success(`Quiz complete! +${xpEarned} XP earned! 🎉`);
      } catch (err) {
        console.error('Failed to save quiz attempt:', err);
      }
    }
  };

  const resetQuiz = () => {
    setCurrentQ(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAnswers({});
    setQuizComplete(false);
    setScore(0);
  };

  const getScoreColor = (pct) => {
    if (pct >= 80) return 'var(--success)';
    if (pct >= 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  // Empty state
  if (studyMaterials.length === 0) {
    return (
      <div className="page-container">
        <div className="glass-card empty-page">
          <FileQuestion size={56} strokeWidth={1} />
          <h2>No Quizzes Yet</h2>
          <p>Upload study material first to generate quizzes.</p>
        </div>
      </div>
    );
  }

  // Quiz complete — results screen
  if (quizComplete) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="page-container quiz-page">
        <div className="glass-card quiz-results-card">
          <div className="quiz-results-header">
            <Award size={64} style={{ color: getScoreColor(pct) }} />
            <h2>Quiz Complete!</h2>
            <p className="quiz-results-title">{selectedMaterial.title}</p>
          </div>

          <div className="quiz-score-circle" style={{ '--score-color': getScoreColor(pct) }}>
            <svg viewBox="0 0 100 100">
              <circle className="score-bg" cx="50" cy="50" r="42" />
              <circle
                className="score-fill"
                cx="50" cy="50" r="42"
                style={{ strokeDashoffset: 264 - (264 * pct / 100) }}
              />
            </svg>
            <div className="score-text">
              <span className="score-pct">{pct}%</span>
              <span className="score-fraction">{score}/{questions.length}</span>
            </div>
          </div>

          <div className="quiz-results-feedback">
            {pct >= 80 && <p className="feedback-great">🌟 Excellent! You've mastered this material!</p>}
            {pct >= 60 && pct < 80 && <p className="feedback-good">👍 Good job! Review the missed questions.</p>}
            {pct < 60 && <p className="feedback-retry">💪 Keep studying! Review the material and try again.</p>}
          </div>

          {/* Question review */}
          <div className="quiz-review-list">
            <h3>Review Answers</h3>
            {questions.map((q, i) => {
              const ans = answers[i];
              const isCorrect = ans?.correct;
              return (
                <div key={i} className={`quiz-review-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="review-icon">
                    {isCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  </div>
                  <div className="review-content">
                    <p className="review-question">Q{i + 1}: {q.question}</p>
                    <p className="review-answer">
                      Your answer: {q.options[ans?.selected]} 
                      {!isCorrect && <span className="review-correct"> → Correct: {q.options[q.correctAnswer]}</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="quiz-results-actions">
            <button className="btn-primary" onClick={resetQuiz}>
              <RotateCcw size={16} /> Retry Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container quiz-page">
      <div className="page-header">
        <h1>❓ Quiz Mode</h1>
        <p>Test your knowledge with AI-generated MCQs — track your scores and improve.</p>
      </div>

      {/* Material selector */}
      <div className="quiz-controls">
        <select
          className="material-select"
          value={selectedMaterialId}
          onChange={(e) => { setSelectedMaterialId(e.target.value); resetQuiz(); }}
        >
          <option value="">Select Study Material</option>
          {studyMaterials.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      </div>

      {!selectedMaterial ? (
        <div className="glass-card empty-page">
          <p>Select a study material above to start a quiz.</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="glass-card empty-page">
          <p>No quiz questions available for this material.</p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="quiz-progress">
            <div className="progress-info">
              <span>Question {currentQ + 1} of {questions.length}</span>
              <span className="quiz-score-live">Score: {score}/{currentQ + (showExplanation ? 1 : 0)}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((currentQ + (showExplanation ? 1 : 0)) / questions.length) * 100}%` }}></div>
            </div>
          </div>

          {/* Question Card */}
          <div className="glass-card quiz-question-card">
            <div className="quiz-q-header">
              <span className="quiz-q-num">Q{currentQ + 1}</span>
              <span className={`quiz-q-diff diff-${currentQuestion?.difficulty}`}>
                {currentQuestion?.difficulty}
              </span>
            </div>

            <h3 className="quiz-q-text">{currentQuestion?.question}</h3>

            <div className="quiz-options">
              {currentQuestion?.options.map((opt, i) => {
                let optClass = 'quiz-option';
                if (showExplanation) {
                  if (i === currentQuestion.correctAnswer) optClass += ' correct';
                  else if (i === selectedAnswer) optClass += ' incorrect';
                } else if (i === selectedAnswer) {
                  optClass += ' selected';
                }

                return (
                  <button
                    key={i}
                    className={optClass}
                    onClick={() => handleSelectAnswer(i)}
                    disabled={showExplanation}
                  >
                    <span className="option-letter">{'ABCD'[i]}</span>
                    <span className="option-text">{opt}</span>
                    {showExplanation && i === currentQuestion.correctAnswer && <CheckCircle size={18} className="option-check" />}
                    {showExplanation && i === selectedAnswer && i !== currentQuestion.correctAnswer && <XCircle size={18} className="option-x" />}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div className={`quiz-explanation ${answers[currentQ]?.correct ? 'correct' : 'incorrect'}`}>
                <div className="explanation-header">
                  {answers[currentQ]?.correct ? (
                    <><CheckCircle size={18} /> <span>Correct! 🎉</span></>
                  ) : (
                    <><XCircle size={18} /> <span>Not quite 😅</span></>
                  )}
                </div>
                <p>{currentQuestion?.explanation}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="quiz-actions">
              {!showExplanation ? (
                <button className="btn-primary" onClick={handleConfirm} disabled={selectedAnswer === null}>
                  Confirm Answer
                </button>
              ) : (
                <button className="btn-primary" onClick={handleNext}>
                  {currentQ < questions.length - 1 ? (
                    <><span>Next Question</span> <ChevronRight size={16} /></>
                  ) : (
                    <><span>Finish Quiz</span> <Award size={16} /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
