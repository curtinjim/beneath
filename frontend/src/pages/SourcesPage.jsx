// BD-307 — SourcesPage redesign
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const EVENT_TYPES = [
  'claim', 'commitment', 'admission', 'denial', 'action', 'silence', 'position',
  'affiliation_change', 'communication', 'signal', 'meeting', 'operator_note',
]

// Badge style per source type
function sourceTypeBadge(type) {
  switch (type) {
    case 'url':          return { className: 'badge badge--navy' }
    case 'file':         return { className: 'badge', style: { background: '#374151', color: '#fff' } }
    case 'meeting_note': return { className: 'badge', style: { background: '#4B5563', color: '#fff' } }
    case 'observation':  return { className: 'badge badge--slate' }
    case 'voice':        return { className: 'badge', style: { background: '#5B21B6', color: '#fff' } }
    default:             return { className: 'badge' }
  }
}

// Badge style per distil status
function distilBadge(status) {
  switch (status) {
    case 'done':             return { className: 'badge badge--done' }
    case 'processing':       return { className: 'badge badge--processing' }
    case 'review_required':  return { className: 'badge badge--review_required', style: { background: 'var(--color-alert)', color: '#fff' } }
    case 'pending':          return { className: 'badge badge--pending' }
    default:                 return { className: 'badge' }
  }
}

// ─── Add Source Modal ────────────────────────────────────────────────────────

function AddSourceModal({ onClose, onSuccess }) {
  const [mode, setMode]       = useState('url')
  const [url, setUrl]         = useState('')
  const [title, setTitle]     = useState('')
  const [pool, setPool]       = useState('commons')
  const [file, setFile]       = useState(null)
  const [audio, setAudio]     = useState(null)
  const [body, setBody]       = useState('')
  const [actorId, setActorId] = useState('')
  const [summary, setSummary] = useState('')
  const [eventType, setEventType]    = useState('operator_note')
  const [reliabilityGrade, setGrade] = useState('sand')
  const [eventDate, setEventDate]    = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState(null)
  const fileRef  = useRef(null)
  const audioRef = useRef(null)

  const MODES = ['url', 'file', 'meeting_note', 'observation', 'voice']
  const MODE_LABEL = {
    url: 'URL', file: 'File', meeting_note: 'Meeting note',
    observation: 'Observation', voice: 'Voice note',
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'url') {
        const res = await api.post('/sources/ingest-url', { url, title: title || undefined, pool })
        onSuccess(res.data.data)
      } else if (mode === 'file') {
        if (!file) { setError('Select a file.'); setBusy(false); return }
        const fd = new FormData()
        fd.append('file', file)
        fd.append('pool', pool)
        if (title)   fd.append('title', title)
        if (actorId) fd.append('actor_id', actorId)
        const res = await api.post('/sources/ingest-file', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        onSuccess(res.data.data)
      } else if (mode === 'meeting_note') {
        if (!body.trim()) { setError('Body is required.'); setBusy(false); return }
        const res = await api.post('/sources/meeting-note', {
          body, title: title || undefined, pool, actor_id: actorId || undefined,
        })
        onSuccess(res.data.data)
      } else if (mode === 'observation') {
        if (!summary.trim()) { setError('Summary is required.'); setBusy(false); return }
        if (!actorId.trim()) { setError('Actor ID is required.'); setBusy(false); return }
        await api.post('/sources/observation', {
          summary, actor_id: actorId, pool,
          event_type: eventType, reliability_grade: reliabilityGrade,
          event_date: eventDate || undefined,
        })
        onSuccess(null)
      } else if (mode === 'voice') {
        if (!audio) { setError('Select an audio file.'); setBusy(false); return }
        const fd = new FormData()
        fd.append('audio', audio)
        fd.append('pool', pool)
        if (title)   fd.append('title', title)
        if (actorId) fd.append('actor_id', actorId)
        const res = await api.post('/sources/ingest-voice', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        onSuccess(res.data.data)
      }
    } catch (err) {
      setError(err.response?.data?.message ?? 'Submission failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '28px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '20px' }}>
          Add Source
        </h2>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={mode === m ? 'btn' : 'btn-outline'}
              style={{ fontSize: '12px' }}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          {/* URL */}
          {mode === 'url' && (
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">URL</label>
              <input
                type="url"
                className="input"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://…"
                required
                style={{ width: '100%', marginTop: '6px' }}
              />
            </div>
          )}

          {/* File */}
          {mode === 'file' && (
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">File</label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ marginTop: '6px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius)', padding: '20px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-secondary)' }}
              >
                {file ? file.name : 'Click to select (txt, pdf, html — max 10MB)'}
                <input
                  ref={fileRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept=".txt,.md,.html,.htm,.pdf,.csv"
                  onChange={e => setFile(e.target.files[0] ?? null)}
                />
              </div>
            </div>
          )}

          {/* Meeting note */}
          {mode === 'meeting_note' && (
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Notes</label>
              <textarea
                className="textarea"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Paste or type meeting notes…"
                rows={8}
                style={{ width: '100%', marginTop: '6px' }}
              />
            </div>
          )}

          {/* Observation */}
          {mode === 'observation' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Summary</label>
                <textarea
                  className="textarea"
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="Describe the observation…"
                  rows={4}
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Event type</label>
                  <select
                    className="select"
                    value={eventType}
                    onChange={e => setEventType(e.target.value)}
                    style={{ width: '100%', marginTop: '6px' }}
                  >
                    {EVENT_TYPES.map(t => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Grade</label>
                  <select
                    className="select"
                    value={reliabilityGrade}
                    onChange={e => setGrade(e.target.value)}
                    style={{ width: '100%', marginTop: '6px' }}
                  >
                    {['bedrock', 'rock', 'sand', 'mud', 'fog'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Event date (optional)</label>
                <input
                  type="date"
                  className="input"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  style={{ marginTop: '6px' }}
                />
              </div>
            </>
          )}

          {/* Voice */}
          {mode === 'voice' && (
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Audio file</label>
              <div
                onClick={() => audioRef.current?.click()}
                style={{ marginTop: '6px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius)', padding: '20px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-secondary)' }}
              >
                {audio ? audio.name : 'Click to select audio (mp3, wav, m4a, webm — max 25MB)'}
                <input
                  ref={audioRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,.ogg"
                  onChange={e => setAudio(e.target.files[0] ?? null)}
                />
              </div>
            </div>
          )}

          {/* Title — all except observation */}
          {mode !== 'observation' && (
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Title (optional)</label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={mode === 'meeting_note' ? 'e.g. Budget review 2026-04-28' : 'Auto-detected if blank'}
                style={{ width: '100%', marginTop: '6px' }}
              />
            </div>
          )}

          {/* Actor ID — all except URL */}
          {mode !== 'url' && (
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">
                Actor ID {mode === 'observation' ? '(required)' : '(optional)'}
              </label>
              <input
                type="text"
                className="input"
                value={actorId}
                onChange={e => setActorId(e.target.value)}
                placeholder="Paste actor UUID to link…"
                style={{ width: '100%', marginTop: '6px', fontFamily: 'Courier New, monospace' }}
              />
            </div>
          )}

          {/* Pool */}
          <div style={{ marginBottom: '24px' }}>
            <label className="form-label">Pool</label>
            <select
              className="select"
              value={pool}
              onChange={e => setPool(e.target.value)}
              style={{ marginTop: '6px' }}
            >
              <option value="commons">Commons</option>
              <option value="vault">Vault</option>
            </select>
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: 'var(--color-alert)', marginBottom: '12px' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'Submitting…' : mode === 'observation' ? 'Record observation' : 'Ingest source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Source Detail ───────────────────────────────────────────────────────────

function SourceDetail({ sourceId, onDeleted }) {
  const qc = useQueryClient()
  const [tab, setTab]             = useState('entities')
  const [commitResult, setCommitResult] = useState(null)

  const { data: source, isLoading } = useQuery({
    queryKey: ['source', sourceId],
    queryFn: () => api.get(`/sources/${sourceId}`).then(r => r.data.data),
    refetchInterval: (data) => {
      if (!data) return 5000
      if (data.status === 'processing' || data.distil_status === 'processing') return 5000
      return false
    },
    enabled: !!sourceId,
  })

  const commit = useMutation({
    mutationFn: () => api.post(`/sources/${sourceId}/commit`),
    onSuccess: (res) => {
      setCommitResult(res.data.data)
      qc.invalidateQueries(['source', sourceId])
      qc.invalidateQueries(['sources'])
    },
  })

  const revert = useMutation({
    mutationFn: (commitId) => api.delete(`/intelligence-commits/${commitId}`),
    onSuccess: () => qc.invalidateQueries(['source', sourceId]),
  })

  const destroy = useMutation({
    mutationFn: () => api.delete(`/sources/${sourceId}`),
    onSuccess: () => { qc.invalidateQueries(['sources']); onDeleted() },
  })

  if (!sourceId) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <p className="empty-state__text">Select a source</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="state-loading" style={{ padding: '32px', textAlign: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading…</span>
      </div>
    )
  }

  if (!source) return null

  const entities          = source.entities ?? []
  const events            = source.events   ?? []
  const claims            = source.claims   ?? []
  const uncommittedEvents   = events.filter(e => !e.committed && e.confidence === 'high')
  const uncommittedEntities = entities.filter(e => !e.committed && e.match_type === 'candidate' && e.confidence === 'high')
  const canCommit = source.distil_status === 'done' && (uncommittedEvents.length > 0 || uncommittedEntities.length > 0)

  const stBadge = distilBadge(source.distil_status)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px', wordBreak: 'break-word' }}>
          {source.title ?? source.url ?? 'Untitled'}
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span {...(sourceTypeBadge(source.source_type))} style={{ textTransform: 'capitalize', ...sourceTypeBadge(source.source_type).style }}>
            {source.source_type?.replace(/_/g, ' ')}
          </span>
          <span
            className={stBadge.className}
            style={{ textTransform: 'capitalize', ...stBadge.style }}
          >
            {source.distil_status?.replace(/_/g, ' ')}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>
            {new Date(source.created_at).toLocaleDateString()}
          </span>
        </div>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '12px', color: 'var(--color-navy)', textDecoration: 'none', display: 'block', marginTop: '6px', wordBreak: 'break-all' }}
          >
            {source.url.length > 80 ? source.url.slice(0, 80) + '…' : source.url}
          </a>
        )}
        {source.distil_error && (
          <p style={{ fontSize: '12px', color: 'var(--color-alert)', marginTop: '6px', padding: '8px 10px', background: 'rgba(0,0,0,0.03)', borderRadius: 'var(--radius)' }}>
            {source.distil_error}
          </p>
        )}
        {source.source_type === 'voice' && source.status === 'pending' && (
          <p style={{ fontSize: '12px', color: 'var(--color-caution)', marginTop: '6px', fontStyle: 'italic' }}>
            Transcription queued — audio will be processed by Whisper.
          </p>
        )}
      </div>

      {canCommit && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-gold)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-gold)', fontWeight: 600 }}>Ready to commit</p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              {uncommittedEvents.length} high-confidence events · {uncommittedEntities.length} new actors
            </p>
          </div>
          <button className="btn" disabled={commit.isPending} onClick={() => commit.mutate()}>
            {commit.isPending ? 'Committing…' : 'Commit all'}
          </button>
        </div>
      )}

      {commitResult && (
        <div style={{ padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--color-positive)', background: 'var(--color-surface)', border: '1px solid var(--color-positive)', borderRadius: 'var(--radius)' }}>
          Committed: {commitResult.events_created} events, {commitResult.actors_created} actors created.
        </div>
      )}

      {source.distil_status === 'done' && (
        <>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
            {['entities', 'events', 'claims'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '6px 14px', fontSize: '12px',
                  fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  background: 'none', border: 'none',
                  borderBottom: tab === t ? '2px solid var(--color-navy)' : '2px solid transparent',
                  cursor: 'pointer', marginBottom: '-1px',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                <span style={{ marginLeft: '5px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {t === 'entities' ? entities.length : t === 'events' ? events.length : claims.length}
                </span>
              </button>
            ))}
          </div>

          {tab === 'entities' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {entities.length === 0 && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No entities extracted.</p>}
              {entities.map(e => (
                <div key={e.id} style={{ padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{e.entity_name}</span>
                    <span className="badge" style={{ textTransform: 'uppercase' }}>{e.match_type}</span>
                    {e.actor_type && <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{e.actor_type}</span>}
                    {e.committed && <span style={{ fontSize: '12px', color: 'var(--color-positive)', marginLeft: 'auto' }}>committed</span>}
                  </div>
                  {e.context && <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>{e.context}</p>}
                </div>
              ))}
            </div>
          )}

          {tab === 'events' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {events.length === 0 && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No events extracted.</p>}
              {events.map(e => (
                <div key={e.id} style={{ padding: '12px 14px', borderRadius: 'var(--radius)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span className="badge badge--navy" style={{ textTransform: 'uppercase' }}>
                      {e.event_type?.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{e.reliability_grade}</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{e.confidence}</span>
                    {e.attributed_actor_name && <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{e.attributed_actor_name}</span>}
                    {e.event_date && <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>{e.event_date}</span>}
                    {e.committed && <span style={{ fontSize: '12px', color: 'var(--color-positive)' }}>committed</span>}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.5', marginBottom: e.content ? '4px' : 0 }}>
                    {e.summary}
                  </p>
                  {e.content && (
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>{e.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'claims' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {claims.length === 0 && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No claims extracted.</p>}
              {claims.map(c => (
                <div key={c.id} style={{ padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{c.confidence}</span>
                    {c.attributed_actor_name && <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{c.attributed_actor_name}</span>}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.5' }}>{c.claim_text}</p>
                  {c.context && <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>{c.context}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {source.raw_text && (
        <details style={{ marginTop: '16px' }}>
          <summary style={{ fontSize: '12px', color: 'var(--color-text-secondary)', cursor: 'pointer', marginBottom: '8px' }}>
            Raw text
          </summary>
          <pre style={{ fontSize: '12px', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '12px', borderRadius: 'var(--radius)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '200px', overflowY: 'auto', lineHeight: '1.5' }}>
            {source.raw_text.slice(0, 2000)}{source.raw_text.length > 2000 ? '…' : ''}
          </pre>
        </details>
      )}

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
        <button
          className="btn-ghost"
          style={{ fontSize: '13px', color: 'var(--color-alert)' }}
          disabled={destroy.isPending}
          onClick={() => destroy.mutate()}
        >
          Delete source
        </button>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SourcesPage() {
  const qc = useQueryClient()
  const [selected,  setSelected]  = useState(null)
  const [showModal, setShowModal] = useState(null) // null | 'url' | 'file' | 'meeting_note' | 'observation'

  const { data, isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: () => api.get('/sources', { params: { per_page: 100 } }).then(r => r.data),
    refetchInterval: (data) => {
      const sources = data?.data ?? []
      const hasProcessing = sources.some(s =>
        s.status === 'processing' || s.distil_status === 'processing'
      )
      return hasProcessing ? 5000 : false
    },
  })

  const sources = data?.data ?? []

  function handleAdded(source) {
    qc.invalidateQueries(['sources'])
    setShowModal(null)
    if (source) setSelected(source.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Sources</h1>
      </div>

      {/* Ingest bar */}
      <div className="ingest-bar">
        <button className="btn-outline" onClick={() => setShowModal('url')}>Ingest URL</button>
        <button className="btn-outline" onClick={() => setShowModal('file')}>Upload File</button>
        <button className="btn-outline" onClick={() => setShowModal('meeting_note')}>Meeting Note</button>
        <button className="btn-outline" onClick={() => setShowModal('observation')}>Observation</button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Source list */}
        <div style={{ width: '340px', flexShrink: 0, borderRight: '1px solid var(--color-border)', overflowY: 'auto' }}>
          {isLoading && (
            <div className="state-loading" style={{ padding: '32px', textAlign: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading…</span>
            </div>
          )}

          {!isLoading && sources.length === 0 && (
            <div className="empty-state">
              <p className="empty-state__text">No sources ingested yet.</p>
            </div>
          )}

          {sources.map(s => {
            const typeBadge  = sourceTypeBadge(s.source_type)
            const dBadge     = distilBadge(s.distil_status)
            const isSelected = selected === s.id
            return (
              <div
                key={s.id}
                className="list-row"
                style={{ cursor: 'pointer', background: isSelected ? 'var(--color-surface)' : undefined }}
                onClick={() => setSelected(s.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{ fontSize: '14px', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                    >
                      {s.title ?? s.url ?? 'Untitled'}
                    </span>
                    <span
                      className={typeBadge.className}
                      style={{ flexShrink: 0, textTransform: 'capitalize', ...typeBadge.style }}
                    >
                      {s.source_type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <span
                      className={dBadge.className}
                      style={{ textTransform: 'capitalize', ...dBadge.style }}
                    >
                      {s.distil_status?.replace(/_/g, ' ')}
                    </span>
                    {s.actor_id && (
                      <span style={{ fontSize: '13px', color: 'var(--color-navy)' }}>
                        {s.actor?.display_name ?? s.actor_id}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', flexShrink: 0, marginLeft: '12px' }}>
                  {new Date(s.created_at).toLocaleDateString()}
                </span>

                {/* Row hover actions */}
                <div className="row-actions">
                  <a
                    href={`/sources/${s.id}`}
                    style={{ fontSize: '13px', color: 'var(--color-navy)', textDecoration: 'none' }}
                    onClick={e => { e.preventDefault(); setSelected(s.id) }}
                  >
                    View
                  </a>
                  {s.distil_status === 'review_required' && (
                    <button
                      className="btn-row-action"
                      style={{ color: 'var(--color-positive)' }}
                      onClick={e => { e.stopPropagation(); setSelected(s.id) }}
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Source detail */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <SourceDetail
            sourceId={selected}
            onDeleted={() => { setSelected(null); qc.invalidateQueries(['sources']) }}
          />
        </div>
      </div>

      {showModal && (
        <AddSourceModal
          initialMode={showModal}
          onClose={() => setShowModal(null)}
          onSuccess={handleAdded}
        />
      )}
    </div>
  )
}
