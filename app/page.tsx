'use client';

import { useMemo, useState } from 'react';
import { DEMO_ARTIST, DEMO_SONGS } from '@/lib/fixtures';
import { buildSupportEmail } from '@/lib/email';
import type { CatalogReport } from '@/lib/verify';

export default function Home() {
  const [artist, setArtist] = useState(DEMO_ARTIST);
  const [songsText, setSongsText] = useState(DEMO_SONGS.join('\n'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'live' | 'demo' | null>(null);
  const [report, setReport] = useState<CatalogReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('');

  async function run() {
    setLoading(true);
    setError('');
    setReport(null);
    setCopied(false);
    setStatus('queued');
    try {
      const titles = songsText.split('\n').map((s) => s.trim()).filter(Boolean);
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ artist, titles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not queue verification.');
      const jobId = data.jobId as string;

      // The web tier only enqueued the job; a worker processes it. Poll for the result so the
      // request never blocks on the slow, rate-limited per-store searching.
      for (let i = 0; i < 150; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const s = await fetch(`/api/verify/${jobId}`);
        const sj = await s.json();
        if (sj.status === 'completed') {
          setMode(sj.mode);
          setReport(sj.report as CatalogReport);
          return;
        }
        if (sj.status === 'failed') throw new Error(sj.error || 'Verification failed.');
        if (sj.status === 'not-found') throw new Error('The verification job expired. Please run it again.');
        setStatus(sj.status === 'active' ? 'active' : 'queued');
      }
      throw new Error('Verification timed out. Please try again.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setLoading(false);
      setStatus('');
    }
  }

  const missingStores = report ? Object.entries(report.missingByStore).filter(([, v]) => v.length > 0) : [];
  const email = useMemo(() => (report ? buildSupportEmail(report) : null), [report]);
  const mailto = email
    ? `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
    : '#';

  return (
    <div className="wrap">
      <h1>StoreProof</h1>
      <p className="muted">
        Is your music actually on the stores? Get the per-store list of missing songs your distributor cannot
        generate for you, then send support the exact re-distribution request in one click.
      </p>

      <div className="panel" style={{ marginTop: 16 }}>
        <label className="muted">Artist</label>
        <input value={artist} onChange={(e) => setArtist(e.target.value)} style={{ marginTop: 4 }} />
        <label className="muted" style={{ display: 'block', marginTop: 14 }}>Song titles (one per line)</label>
        <textarea value={songsText} onChange={(e) => setSongsText(e.target.value)} rows={5} style={{ marginTop: 4 }} />
        <div style={{ marginTop: 12 }}>
          <button className="primary" onClick={run} disabled={loading}>
            {loading ? (status === 'active' ? 'Verifying across stores…' : 'Queued, waiting for a worker…') : 'Verify my catalogue'}
          </button>
        </div>
        {error ? <p className="pill missing" style={{ marginTop: 12 }}>{error}</p> : null}
      </div>

      {report ? (
        <>
          <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
            {mode === 'live'
              ? 'Live results from real per-store searches.'
              : 'Demo mode (no SERPER_API_KEY set): served from a built-in sample catalogue so you can try it instantly. Add a Serper key for live checks.'}
          </p>

          <h2>Missing songs by store</h2>
          {missingStores.length === 0 ? (
            <div className="panel"><span className="pill live">Every song is live on every store checked.</span></div>
          ) : (
            <div className="panel" style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Store</th><th style={{ whiteSpace: 'normal' }}>Missing songs</th></tr></thead>
                <tbody>
                  {missingStores.map(([store, titles]) => (
                    <tr key={store}>
                      <td>{store}</td>
                      <td style={{ whiteSpace: 'normal' }}>
                        {titles.map((t) => (
                          <span key={t} className="pill missing" style={{ marginRight: 6, marginBottom: 4, display: 'inline-block' }}>{t}</span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>Per-song detail</h2>
          <div className="panel" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Song</th>
                  {report.songs[0]?.stores.map((s) => <th key={s.store}>{s.store}</th>)}
                </tr>
              </thead>
              <tbody>
                {report.songs.map((song) => (
                  <tr key={song.title}>
                    <td>{song.title}</td>
                    {song.stores.map((v) => (
                      <td key={v.store}>
                        {v.evidenceUrl ? (
                          <a className="pill live" href={v.evidenceUrl} target="_blank" rel="noreferrer">live</a>
                        ) : (
                          <span className={`pill ${v.status}`}>{v.status}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
            {report.summary.live} live · {report.summary.missing} missing · {report.summary.unverified} unverified,
            across {report.summary.songs} songs and {report.summary.stores} stores.
          </p>

          {email ? (
            <>
              <h2>Send support the re-distribution request</h2>
              <div className="panel">
                <p className="muted" style={{ marginTop: 0 }}>
                  Auto-generated from the gaps above. Copy it into your distributor&apos;s support form, or open it in your email client.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <button
                    className="ghost"
                    onClick={() => { void navigator.clipboard?.writeText(`${email.subject}\n\n${email.body}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
                  >
                    {copied ? 'Copied' : 'Copy email'}
                  </button>
                  <a className="ghost" href={mailto} style={{ textDecoration: 'none', display: 'inline-block' }}>Open in email app</a>
                </div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Subject</div>
                <pre style={{ marginTop: 0 }}>{email.subject}</pre>
                <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Body</div>
                <pre style={{ marginTop: 0 }}>{email.body}</pre>
              </div>
            </>
          ) : null}
        </>
      ) : null}

      <p className="muted" style={{ marginTop: 44, fontSize: 12 }}>
        Built for the micro1 Frontier Engineering Challenge. Verification uses web-search evidence with a
        precision-over-recall rule: a store is only reported &quot;missing&quot; when a targeted search finds no live
        page, and a search that fails is &quot;unverified&quot;, never a false alarm.
      </p>
    </div>
  );
}
