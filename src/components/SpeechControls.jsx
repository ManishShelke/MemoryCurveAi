import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Languages, Play, Pause, Square } from 'lucide-react';

/**
 * SpeechControls — Text-to-Speech & Speech-to-Text
 * Can be embedded in any page.
 */
export default function SpeechControls({ text, onSpeechResult, mode = 'tts' }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState([]);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const LANGUAGES = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'hi-IN', label: 'Hindi' },
    { code: 'kn-IN', label: 'Kannada' },
    { code: 'te-IN', label: 'Telugu' },
    { code: 'ta-IN', label: 'Tamil' },
    { code: 'es-ES', label: 'Spanish' },
    { code: 'fr-FR', label: 'French' },
    { code: 'de-DE', label: 'German' },
    { code: 'ja-JP', label: 'Japanese' },
    { code: 'zh-CN', label: 'Chinese' },
  ];

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      setVoices(v);
    };
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // ── Text-to-Speech ──
  const speak = () => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLang;
    utterance.rate = rate;

    const voice = voices.find((v) => v.lang.startsWith(selectedLang.split('-')[0]));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const pauseSpeech = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else {
      window.speechSynthesis.pause();
    }
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // ── Speech-to-Text ──
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (e) => {
      let finalTranscript = '';
      for (let i = 0; i < e.results.length; i++) {
        finalTranscript += e.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
      if (onSpeechResult) onSpeechResult(finalTranscript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="speech-controls">
      {/* Language selector */}
      <div className="speech-lang">
        <Languages size={16} />
        <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* TTS Controls */}
      {(mode === 'tts' || mode === 'both') && (
        <div className="speech-tts">
          {!isSpeaking ? (
            <button className="speech-btn" onClick={speak} title="Read aloud" disabled={!text}>
              <Volume2 size={18} /> Speak
            </button>
          ) : (
            <>
              <button className="speech-btn" onClick={pauseSpeech} title="Pause/Resume">
                <Pause size={18} />
              </button>
              <button className="speech-btn speech-btn-stop" onClick={stopSpeech} title="Stop">
                <Square size={18} />
              </button>
            </>
          )}
          <div className="speech-rate">
            <label>Speed</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
            />
            <span>{rate}x</span>
          </div>
        </div>
      )}

      {/* STT Controls */}
      {(mode === 'stt' || mode === 'both') && (
        <div className="speech-stt">
          <button
            className={`speech-btn ${isListening ? 'listening' : ''}`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            {isListening ? 'Stop' : 'Dictate'}
          </button>
          {transcript && (
            <div className="speech-transcript">
              <p>{transcript}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
