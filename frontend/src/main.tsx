import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', background: '#0a0f1d', color: '#f87171', minHeight: '100vh' }}>
          <h1 style={{ color: '#fca5a5', fontSize: '20px', marginBottom: '16px' }}>⚠ React Error — {this.state.error.message}</h1>
          <pre style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', color: '#fcd34d', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
