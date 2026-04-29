import { useState } from 'react'
import api from '../lib/api'

export default function SynthesisPanel({ sessionId, projectId, onDispatched }) {
  const [open, setOpen]       = useState(false)
  const [actorId, setActorId] = useState('')
  const [busy, setBusy]       = useState(false)
  const [status, setStatus]   = useState(null)
  const [error, setError]     = useState(null)

  async function dispatch(operation, extra = {}) {
    setBusy(true)
    setStatus(null)
    setError(null)
    try {
      await api.post(`/chat/sessions/${sessionId}/synthesise`, { operation, ...extra })
      setStatus('Queued — result will appear in this thread shortly.')
      onDispatched?.()
      if (operation === 'actor_briefing') setActorId('')
    } catch (err) {
      setError(err.response?.data?.message ?? 'Request failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ flexShrink: 0 }}>
      <button
        onClick={() => { setOpen(o => !o); setStatus(null); setError(null) }}
        style={{
          fontSize: '10px',
          color: open ? 'var(--gold)' : 'var(--mgrey)',
          background: 'transparent',
          border: `1px solid ${open ? 'rgba(201,168,76,0.4)' : 'var(--rule)'}`,
          borderRadius: '2px',
          padding: '3px 10px',
          cursor: 'pointer',
          letterSpacing: '0.08em',
          transition: 'all 0.1s',
          whiteSpace: 'nowrap',
        }}
      >
        ⚡ Synthesise
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          zIndex: 100,
          marginTop: '6px',
          width: '320px',
          background: 'var(--s2)',
          border: '1px solid var(--br-border-subtle)',
          borderRadius: '3px',
          padding: '14px 16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <p style={{ fontSize: '10px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Synthesis Operations
          </p>

          {/* Actor briefing */}
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Actor briefing
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                value={actorId}
                onChange={e => setActorId(e.target.value)}
                placeholder="Actor ID…"
                disabled={busy}
                style={{
                  flex: 1,
                  background: 'var(--s1)',
                  border: '1px solid var(--rule)',
                  borderRadius: '2px',
                  color: 'var(--br-bone-white)',
                  fontSize: '11px',
                  padding: '5px 8px',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => dispatch('actor_briefing', { actor_id: actorId.trim() })}
                disabled={busy || !actorId.trim()}
                className="br-btn-outline"
                style={{ fontSize: '11px', padding: '5px 10px', flexShrink: 0 }}
              >
                {busy ? '…' : 'Brief →'}
              </button>
            </div>
          </div>

          {/* Narrative synthesis — only when session has a linked project */}
          {projectId && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Project narrative synthesis
              </p>
              <button
                onClick={() => dispatch('narrative_synthesis', { project_id: projectId })}
                disabled={busy}
                className="br-btn-outline"
                style={{ fontSize: '11px', padding: '5px 10px', width: '100%' }}
              >
                {busy ? '…' : 'Synthesise narrative →'}
              </button>
            </div>
          )}

          {status && (
            <p style={{ fontSize: '11px', color: 'var(--bedrock)', marginTop: '8px' }}>{status}</p>
          )}
          {error && (
            <p style={{ fontSize: '11px', color: 'var(--crimson)', marginTop: '8px' }}>{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
