import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 6000,
          style: {
            background: 'var(--glass-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(20px)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
          },
          success: {
            iconTheme: { primary: '#E8736C', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#FF6B8A', secondary: '#fff' },
          },
        }}
      />
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
