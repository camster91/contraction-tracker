import { Component, type ReactNode } from 'react';
import { downloadBackup, type BackupData } from '../lib/backup';
import { recoverCrashBackup } from '../lib/crashRecovery';

type State = { hasError: boolean; checking: boolean; backup: BackupData | null; exportError: boolean };

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, checking: false, backup: null, exportError: false };
  static getDerivedStateFromError(): Partial<State> { return { hasError: true, checking: true }; }
  componentDidCatch() {
    // Never put user-authored data or raw error messages into logs or support UI.
    void recoverCrashBackup().then((backup) => this.setState({ backup, checking: false }))
      .catch(() => this.setState({ checking: false }));
  }
  exportBackup = async () => {
    try { if (this.state.backup) await downloadBackup(this.state.backup); }
    catch { this.setState({ exportError: true }); }
  };
  render() {
    if (!this.state.hasError) return this.props.children;
    const backup = this.state.backup;
    const current = backup?.current as { start?: string } | null;
    const start = current?.start && Number.isFinite(Date.parse(current.start)) ? current.start : null;
    const button = { background: '#E8AD8B', color: '#26382C', border: 'none', borderRadius: 12,
      padding: '14px 24px', fontSize: 16, fontWeight: 600, cursor: 'pointer', minHeight: 48 };
    return <main style={{ minHeight: '100dvh', background: '#26382C', color: '#F5F1E7', padding: 24,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', textAlign: 'center', gap: 16 }}>
      <span aria-hidden="true" style={{ fontSize: 48 }}>🫒</span>
      <h1>Olive needs to reload</h1>
      <p style={{ maxWidth: 360 }}>The app could not finish displaying this screen. Check the recovered information below and save a backup before reloading.</p>
      <div role="status">
        {this.state.checking ? 'Checking saved data on this device…' : backup ?
          <><p>Recovered {backup.contractions.length} saved contractions.</p>
            <p>{start ? `Last saved timer started at ${new Date(start).toLocaleString()}.` : 'No active timer was found in the saved data.'}</p>
            <p>This is saved information, not a live timer or medical advice.</p></> :
          <p>No readable saved data was found. This does not confirm that storage is empty.</p>}
      </div>
      {backup && <button style={button} onClick={this.exportBackup}>Export recovered backup</button>}
      {this.state.exportError && <p role="alert">The backup could not be exported. Keep Olive installed and try reloading.</p>}
      <button style={button} onClick={() => window.location.reload()}>Reload Olive</button>
      <p style={{ maxWidth: 360 }}>If the problem continues, keep the app installed and contact support. An exported backup can be imported through Settings after Olive opens again.</p>
      <a href="https://olive.ashbi.ca/support/" style={{ color: '#E8AD8B', padding: 12 }}>Contact Olive support</a>
    </main>;
  }
}
