// ErrorBoundary — catches render errors in production and shows
// a fallback instead of a white screen. Critical for a pregnancy
// contraction timer: if the UI crashes mid-contraction, the user
// should still see something useful.
//
// The boundary doesn't try to recover — it just shows a calm
// "something went wrong" message and offers a reload button.
// Contraction data is in localStorage, so a reload restores it.

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _info: React.ErrorInfo) {
    // Log but don't phone home — Olive has no analytics
    console.error('Olive render error:', error.message);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          background: '#120c10',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          color: '#faf6f4',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 64,
            lineHeight: 1,
            marginBottom: 16,
          }}>
            🫒
          </div>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: 24,
            fontWeight: 500,
            margin: '0 0 8px',
          }}>
            Something went wrong
          </h1>
          <p style={{
            fontSize: 14,
            color: '#b89184',
            lineHeight: 1.6,
            maxWidth: 320,
            marginBottom: 24,
          }}>
            Olive hit a snag. Your contraction data is safe — it's saved on your phone.
            Tap below to reload and pick up where you left off.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background: '#e8957a',
              color: '#120c10',
              border: 'none',
              borderRadius: 12,
              padding: '12px 32px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Reload Olive
          </button>
          {this.state.error && (
            <details style={{ marginTop: 24, color: '#9a6e62', fontSize: 12 }}>
              <summary>Technical details</summary>
              <pre style={{
                marginTop: 8,
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                fontSize: 11,
                maxWidth: 360,
              }}>
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
