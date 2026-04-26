import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { registerUser, loginUser, resetPassword, loginWithGoogle } from '../../firebase/authService';
import { Brain, Mail, Lock, LogIn, UserPlus, KeyRound, Sparkles, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [animateState, setAnimateState] = useState('fade-in');

  // Trigger animation on form switch
  useEffect(() => {
    setAnimateState('fade-out');
    const timer = setTimeout(() => {
      setAnimateState('fade-in');
    }, 300);
    return () => clearTimeout(timer);
  }, [isLogin, isReset]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || (!isReset && !password.trim())) return;

    setLoading(true);
    try {
      if (isReset) {
        await resetPassword(email);
        toast.success('Password reset email sent! Check your inbox.');
        setIsReset(false);
      } else if (isLogin) {
        await loginUser(email, password);
        toast.success('Welcome back to MemoryCurve! 🧠');
      } else {
        await registerUser(email, password);
        toast.success('Account created successfully! Let\'s boost your memory.');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      toast.success('Logged in with Google! 🚀');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Dynamic Animated Background */}
      <div className="auth-bg-animation">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* Left / Branding Screen */}
      <div className="auth-branding">
        <div className="branding-content">
          <div className="branding-logo">
            <Brain size={42} className="logo-icon-large" />
            <h2>MemoryCurve</h2>
          </div>
          <h1 className="branding-title">Welcome to the future of learning.</h1>
          <p className="branding-subtitle">
            Harness the power of AI to generate spaced-repetition flashcards, adaptive quizzes, and visual diagrams. Retain 10x more information with zero extra effort.
          </p>

          <div className="feature-badges">
            <span className="feat-badge"><Sparkles size={16} /> AI Flashcards</span>
            <span className="feat-badge"><Zap size={16} /> Spaced Repetition</span>
            <span className="feat-badge"><CheckCircle2 size={16} /> Exam Prep</span>
          </div>
        </div>
      </div>

      {/* Right / Interaction Screen */}
      <div className="auth-interaction">
        <div className={`auth-card glass-card ${animateState}`}>
          
          <div className="auth-header text-center">
            <h2 className="auth-title">
              {isReset ? 'Reset Password' : isLogin ? 'Sign In to MemoryCurve' : 'Create an Account'}
            </h2>
            <p className="auth-desc">
              {isReset
                ? 'Enter your email to receive reset instructions.'
                : isLogin
                ? 'Resume your personalized learning journey today.'
                : 'Join MemoryCurve and never forget a topic again.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-with-icon">
              <Mail size={20} className="input-icon" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {!isReset && (
              <div className="input-with-icon">
                <Lock size={20} className="input-icon" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}

            {isLogin && !isReset && (
              <div className="auth-form-extras">
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  Remember me
                </label>
                <button type="button" className="text-accent-link text-sm font-semibold" onClick={() => setIsReset(true)}>
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : isReset ? (
                <>Send Reset Link <ArrowRight size={18} /></>
              ) : isLogin ? (
                <>Log In <ArrowRight size={18} /></>
              ) : (
                <>Sign Up <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          {!isReset && (
            <>
              <div className="auth-divider">
                <span>Or continue with</span>
              </div>
              <button 
                type="button" 
                className="oauth-btn" 
                onClick={handleGoogleLogin} 
                disabled={loading}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </>
          )}

          <div className="auth-footer text-center">
            {isReset ? (
              <button type="button" className="text-secondary-link text-sm font-semibold mt-4" onClick={() => setIsReset(false)}>
                Back to Login
              </button>
            ) : (
              <p className="mt-6 text-sm text-muted">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  className="text-accent-link font-semibold ml-2"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? 'Create one now' : 'Sign in instead'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
