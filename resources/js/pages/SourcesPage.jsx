import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const STATUS_STYLE = {
  pending:    { color:'var(--mgrey)',   label:'Pending'    },
  processing: { color:'var(--sand)',    label:'Processing' },
  done:       { color:'var(--bedrock)', label:'Done'       },
  failed:     { color:'var(--crimson)', label:'Failed'     },
}

const DISTIL_STYLE = {
  pending:    { color:'var(--mgrey)',   label:'—'              },
  processing: { color:'var(--sand)',    label:'Processing…'    },
  done:       { color:'var(--bedrock)', label:'DISTIL done'    },
  failed:     { color:'var(--crimson)', label:'DISTIL failed'  },
  skipped:    { color:'var(--mgrey)',   label:'No text'        },
}

const CONF_COLOUR  = { high:'var(--bedrock)', medium:'var(--sand)', low:'var(--fog)' }
const GRADE_COLOUR = { bedrock:'var(--bedrock)', rock:'var(--rock)', sand:'var(--sand)', mud:'var(--mud)', fog:'var(--fog)' }
const TYPE_ICON    = { url:'⬡', file:'▣', meeting_note:'◈', observation:'◉', voice:'◎' }

const EVENT_TYPES = [
  'claim','commitment','admission','denial','action','silence','position',
  'affiliation_change','communication','signal','meeting','operator_note',
]

// ─── Add source modal ────────────────────────────────────────────────────────

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
  const [eventType, setEventType]         = useState('operator_note')
  const [reliabilityGrade, setGrade]      = useState('sand')
  const [eventDate, setEventDate]         = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState(null)
  const fileRef               = useRef(null)
  const audioRef              = useRef(null)

  const MODES = ['url','file','meeting_note','observation','voice']
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
          body,
          title:    title || undefined,
          pool,
          actor_id: actorId || undefined,
        })
        onSuccess(res.data.data)

      } else if (mode === 'observation') {
        if (!summary.trim()) { setError('Summary is required.'); setBusy(false); return }
        if (!actorId.trim()) { setError('Actor ID is required.'); setBusy(false); return }
        const res = await api.post('/sources/observation', {
          summary,
          actor_id:          actorId,
          pool,
          event_type:        eventType,
          reliability_grade: reliabilityGrade,
          event_date:        eventDate || undefined,
        })
        // observation returns a BehaviouralEvent, not a Source — close modal
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
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'var(--s2)', border:'1px solid var(--rule)', borderRadius:'4px',
        padding:'28px', width:'460px', maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto' }}>
        <h2 style={{ fontFamily:'var(--font-sans)', fontSize:'16px', fontWeight:500,
          color:'var(--white)', marginBottom:'20px' }}>
          Add Source
        </h2>

        {/* Mode tabs */}
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'20px' }}>
          {MODES.map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ padding:'5px 12px', fontSize:'10px', fontWeight:600,
                letterSpacing:'0.08em', textTransform:'uppercase',
                background: mode === m ? 'var(--gold)' : 'transparent',
                color: mode === m ? 'var(--dnavy)' : 'var(--mgrey)',
                border: mode === m ? 'none' : '1px solid var(--rule)',
                borderRadius:'2px', cursor:'pointer' }}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>

          {/* URL mode */}
          {mode === 'url' && (
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em',
                textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'6px' }}>
                URL
              </label>
              <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://…" required
                style={{ width:'100%', padding:'8px 12px', background:'var(--s3)',
                  border:'1px solid var(--rule)', color:'var(--white)', fontSize:'13px',
                  borderRadius:'2px', fontFamily:'var(--font-sans)' }} />
            </div>
          )}

          {/* File mode */}
          {mode === 'file' && (
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em',
                textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'6px' }}>
                File
              </label>
              <div onClick={() => fileRef.current?.click()}
                style={{ border:'1px dashed var(--rule)', borderRadius:'2px', padding:'20px',
                  textAlign:'center', cursor:'pointer', color:'var(--mgrey)', fontSize:'12px' }}>
                {file ? file.name : 'Click to select (txt, pdf, html — max 10MB)'}
                <input ref={fileRef} type="file" style={{ display:'none' }}
                  accept=".txt,.md,.html,.htm,.pdf,.csv"
                  onChange={e => setFile(e.target.files[0] ?? null)} />
              </div>
            </div>
          )}

          {/* Meeting note mode */}
          {mode === 'meeting_note' && (
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em',
                textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'6px' }}>
                Notes
              </label>
              <textarea value={body} onChange={e => setBody(e.target.value)}
                placeholder="Paste or type meeting notes…"
                rows={8}
                style={{ width:'100%', padding:'8px 12px', background:'var(--s3)',
                  border:'1px solid var(--rule)', color:'var(--white)', fontSize:'12px',
                  borderRadius:'2px', fontFamily:'var(--font-sans)', resize:'vertical',
                  lineHeight:'1.6' }} />
            </div>
          )}

          {/* Observation mode */}
          {mode === 'observation' && (
            <>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em',
                  textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'6px' }}>
                  Summary
                </label>
                <textarea value={summary} onChange={e => setSummary(e.target.value)}
                  placeholder="Describe the observation…"
                  rows={4}
                  style={{ width:'100%', padding:'8px 12px', background:'var(--s3)',
                    border:'1px solid var(--rule)', color:'var(--white)', fontSize:'12px',
                    borderRadius:'2px', fontFamily:'var(--font-sans)', resize:'vertical' }} />
              </div>
              <div style={{ display:'flex', gap:'12px', marginBottom:'16px' }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em',
                    textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'6px' }}>
                    Event type
                  </label>
                  <select value={eventType} onChange={e => setEventType(e.target.value)}
                    style={{ width:'100%', padding:'8px 10px', background:'var(--s3)',
                      border:'1px solid var(--rule)', color:'var(--white)', fontSize:'12px',
                      borderRadius:'2px', cursor:'pointer' }}>
                    {EVENT_TYPES.map(t => (
                      <option key={t} value={t}>{t.replace('_',' ')}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em',
                    textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'6px' }}>
                    Grade
                  </label>
                  <select value={reliabilityGrade} onChange={e => setGrade(e.target.value)}
                    style={{ width:'100%', padding:'8px 10px', background:'var(--s3)',
                      border:'1px solid var(--rule)', color:'var(--white)', fontSize:'12px',
                      borderRadius:'2px', cursor:'pointer' }}>
                    {['bedrock','rock','sand','mud','fog'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em',
                  textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'6px' }}>
                  Event date (optional)
                </label>
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                  style={{ padding:'8px 10px', background:'var(--s3)',
                    border:'1px solid var(--rule)', color:'var(--white)', fontSize:'12px',
                    borderRadius:'2px', cursor:'pointer' }} />
              </div>
            </>
          )}

          {/* Voice mode */}
          {mode === 'voice' && (
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em',
                textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'6px' }}>
                Audio file
              </label>
              <div onClick={() => audioRef.current?.click()}
                style={{ border:'1px dashed var(--rule)', borderRadius:'2px', padding:'20px',
                  textAlign:'center', cursor:'pointer', color:'var(--mgrey)', fontSize:'12px' }}>
                {audio ? audio.name : 'Click to select audio (mp3, wav, m4a, webm — max 25MB)'}
                <input ref={audioRef} type="file" style={{ display:'none' }}
                  accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,.ogg"
                  onChange={e => setAudio(e.target.files[0] ?? null)} />
              </div>
            </div>
          )}

          {/* Title — shown for all except observation */}
          {mode !== 'observation' && (
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em',
                textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'6px' }}>
                Title (optional)
              </label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder={mode === 'meeting_note' ? 'e.g. Budget review 2026-04-28' : 'Auto-detected if blank'}
                style={{ width:'100%', padding:'8px 12px', background:'var(--s3)',
                  border:'1px solid var(--rule)', color:'var(--white)', fontSize:'13px',
                  borderRadius:'2px', fontFamily:'var(--font-sans)' }} />
            </div>
          )}

          {/* Actor ID — shown for all except URL */}
          {mode !== 'url' && (
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em',
                textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'6px' }}>
                Actor ID {mode === 'observation' ? '(required)' : '(optional)'}
              </label>
              <input type="text" value={actorId} onChange={e => setActorId(e.target.value)}
                placeholder="Paste actor UUID to link…"
                style={{ width:'100%', padding:'8px 12px', background:'var(--s3)',
                  border:'1px solid var(--rule)', color:'var(--white)', fontSize:'12px',
                  borderRadius:'2px', fontFamily:'var(--font-mono)' }} />
            </div>
          )}

          {/* Pool — not shown for observation */}
          {mode !== 'observation' && (
            <div style={{ marginBottom:'24px' }}>
              <label style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em',
                textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'6px' }}>
                Pool
              </label>
              <select value={pool} onChange={e => setPool(e.target.value)}
                style={{ padding:'8px 12px', background:'var(--s3)', border:'1px solid var(--rule)',
                  color:'var(--white)', fontSize:'13px', borderRadius:'2px', cursor:'pointer' }}>
                <option value="commons">Commons</option>
                <option value="vault">Vault</option>
              </select>
            </div>
          )}

          {/* Pool for observation */}
          {mode === 'observation' && (
            <div style={{ marginBottom:'24px' }}>
              <label style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em',
                textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'6px' }}>
                Pool
              </label>
              <select value={pool} onChange={e => setPool(e.target.value)}
                style={{ padding:'8px 12px', background:'var(--s3)', border:'1px solid var(--rule)',
                  color:'var(--white)', fontSize:'13px', borderRadius:'2px', cursor:'pointer' }}>
                <option value="commons">Commons</option>
                <option value="vault">Vault</option>
              </select>
            </div>
          )}

          {error && (
            <p style={{ fontSize:'12px', color:'var(--crimson)', marginBottom:'12px' }}>{error}</p>
          )}

          <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} className="br-btn-ghost">Cancel</button>
            <button type="submit" className="br-btn" disabled={busy}>
              {busy ? 'Submitting…' : mode === 'observation' ? 'Record observation →' : 'Ingest source →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Source list row ─────────────────────────────────────────────────────────

function SourceListRow({ source, selected, onSelect }) {
  const st = STATUS_STYLE[source.status] ?? STATUS_STYLE.pending
  const dt = DISTIL_STYLE[source.distil_status] ?? DISTIL_STYLE.pending
  return (
    <div
      onClick={() => onSelect(source)}
      style={{
        padding:'12px 16px', cursor:'pointer',
        background: selected ? 'var(--s4)' : 'transparent',
        borderBottom:'1px solid var(--rule)',
      }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
        <span style={{ fontSize:'10px', color:'var(--mgrey)', flexShrink:0 }}>
          {TYPE_ICON[source.source_type] ?? '○'}
        </span>
        <span style={{ fontSize:'12px', color:'var(--white)', fontWeight:500,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
          {source.title ?? source.url ?? 'Untitled'}
        </span>
        <span style={{ fontSize:'10px', fontWeight:600, color: st.color, flexShrink:0 }}>
          {st.label}
        </span>
      </div>
      <div style={{ display:'flex', gap:'12px', paddingLeft:'18px' }}>
        <span style={{ fontSize:'10px', color: dt.color }}>{dt.label}</span>
        <span style={{ fontSize:'10px', color:'var(--mgrey)', marginLeft:'auto' }}>
          {new Date(source.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

// ─── Source detail ───────────────────────────────────────────────────────────

function SourceDetail({ sourceId, onDeleted }) {
  const qc   = useQueryClient()
  const [tab, setTab]   = useState('entities')
  const [commitResult, setCommitResult] = useState(null)

  const { data: resp, isLoading } = useQuery({
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
    onSuccess: () => {
      qc.invalidateQueries(['sources'])
      onDeleted()
    },
  })

  if (!sourceId) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%',
        color:'var(--mgrey)', fontSize:'13px' }}>
        Select a source
      </div>
    )
  }

  if (isLoading) {
    return <div style={{ padding:'24px', color:'var(--mgrey)', fontSize:'13px' }}>Loading…</div>
  }

  const source = resp
  if (!source) return null

  const st = STATUS_STYLE[source.status] ?? STATUS_STYLE.pending
  const dt = DISTIL_STYLE[source.distil_status] ?? DISTIL_STYLE.pending

  const entities = source.entities ?? []
  const events   = source.events   ?? []
  const claims   = source.claims   ?? []

  const uncommittedEvents   = events.filter(e => !e.committed && e.confidence === 'high')
  const uncommittedEntities = entities.filter(e => !e.committed && e.match_type === 'candidate' && e.confidence === 'high')
  const canCommit = source.distil_status === 'done' && (uncommittedEvents.length > 0 || uncommittedEntities.length > 0)

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'20px' }}>
      <div style={{ marginBottom:'16px' }}>
        <h2 style={{ fontFamily:'var(--font-sans)', fontSize:'15px', fontWeight:500,
          color:'var(--white)', marginBottom:'8px', wordBreak:'break-word' }}>
          {source.title ?? source.url ?? 'Untitled'}
        </h2>
        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:'10px', fontWeight:700, color: st.color,
            letterSpacing:'0.10em', textTransform:'uppercase' }}>
            {st.label}
          </span>
          <span style={{ fontSize:'10px', color: dt.color }}>
            {dt.label}
          </span>
          <span style={{ fontSize:'10px', color:'var(--mgrey)',
            background:'var(--s3)', padding:'2px 8px', borderRadius:'2px' }}>
            {source.source_type}
          </span>
          <span style={{ fontSize:'10px', color:'var(--mgrey)', marginLeft:'auto' }}>
            {new Date(source.created_at).toLocaleDateString()}
          </span>
        </div>
        {source.url && (
          <a href={source.url} target="_blank" rel="noreferrer"
            style={{ fontSize:'11px', color:'var(--gold)', textDecoration:'none',
              display:'block', marginTop:'6px', wordBreak:'break-all' }}>
            {source.url.length > 80 ? source.url.slice(0, 80) + '…' : source.url}
          </a>
        )}
        {source.distil_error && (
          <p style={{ fontSize:'11px', color:'var(--crimson)', marginTop:'6px',
            background:'rgba(180,0,0,0.08)', padding:'8px', borderRadius:'2px' }}>
            {source.distil_error}
          </p>
        )}
        {/* Voice: show transcription-pending state */}
        {source.source_type === 'voice' && source.status === 'pending' && (
          <p style={{ fontSize:'11px', color:'var(--sand)', marginTop:'6px', fontStyle:'italic' }}>
            Transcription queued — audio will be processed by Whisper.
          </p>
        )}
      </div>

      {canCommit && (
        <div style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)',
          borderRadius:'2px', padding:'12px 16px', marginBottom:'16px',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'12px', color:'var(--gold)', fontWeight:600 }}>
              Ready to commit
            </p>
            <p style={{ fontSize:'11px', color:'var(--mgrey)', marginTop:'2px' }}>
              {uncommittedEvents.length} high-confidence events · {uncommittedEntities.length} new actors
            </p>
          </div>
          <button onClick={() => commit.mutate()} className="br-btn"
            style={{ fontSize:'11px', whiteSpace:'nowrap' }}
            disabled={commit.isPending}>
            {commit.isPending ? 'Committing…' : 'Commit all →'}
          </button>
        </div>
      )}

      {commitResult && (
        <div style={{ background:'rgba(0,180,60,0.08)', border:'1px solid rgba(0,180,60,0.2)',
          borderRadius:'2px', padding:'10px 16px', marginBottom:'16px', fontSize:'12px', color:'var(--bedrock)' }}>
          Committed: {commitResult.events_created} events, {commitResult.actors_created} actors created.
        </div>
      )}

      {source.distil_status === 'done' && (
        <>
          <div style={{ display:'flex', gap:'4px', marginBottom:'16px', borderBottom:'1px solid var(--rule)',
            paddingBottom:'0' }}>
            {['entities','events','claims'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:'6px 14px', fontSize:'11px', fontWeight: tab===t ? 600 : 400,
                  letterSpacing:'0.08em', textTransform:'uppercase',
                  color: tab===t ? 'var(--white)' : 'var(--mgrey)',
                  background:'none', border:'none',
                  borderBottom: tab===t ? '2px solid var(--gold)' : '2px solid transparent',
                  cursor:'pointer', marginBottom:'-1px' }}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
                <span style={{ marginLeft:'6px', fontSize:'10px', color:'var(--mgrey)' }}>
                  {t==='entities' ? entities.length : t==='events' ? events.length : claims.length}
                </span>
              </button>
            ))}
          </div>

          {tab === 'entities' && (
            <div>
              {entities.length === 0 && <p style={{ color:'var(--mgrey)', fontSize:'12px' }}>No entities extracted.</p>}
              {entities.map(e => (
                <div key={e.id} style={{ padding:'10px 14px', marginBottom:'6px', borderRadius:'2px',
                  background:'var(--s1)', border:`1px solid ${e.committed ? 'rgba(0,180,60,0.2)' : 'var(--rule)'}`,
                  borderLeft:`3px solid ${e.match_type==='matched' ? CONF_COLOUR.high : CONF_COLOUR[e.confidence]??'var(--rule)'}` }}>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'3px' }}>
                    <span style={{ fontSize:'12px', color:'var(--white)', fontWeight:500 }}>{e.entity_name}</span>
                    <span style={{ fontSize:'9px', fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase',
                      color: e.match_type==='matched' ? 'var(--bedrock)' : CONF_COLOUR[e.confidence]??'var(--mgrey)',
                      background:'var(--s3)', padding:'1px 5px', borderRadius:'2px' }}>
                      {e.match_type}
                    </span>
                    {e.actor_type && <span style={{ fontSize:'9px', color:'var(--mgrey)' }}>{e.actor_type}</span>}
                    {e.committed && <span style={{ fontSize:'9px', color:'var(--bedrock)', marginLeft:'auto' }}>✓ committed</span>}
                  </div>
                  {e.context && <p style={{ fontSize:'11px', color:'var(--mgrey)', lineHeight:'1.4' }}>{e.context}</p>}
                </div>
              ))}
            </div>
          )}

          {tab === 'events' && (
            <div>
              {events.length === 0 && <p style={{ color:'var(--mgrey)', fontSize:'12px' }}>No events extracted.</p>}
              {events.map(e => (
                <div key={e.id} style={{ padding:'12px 14px', marginBottom:'6px', borderRadius:'2px',
                  background:'var(--s1)', border:`1px solid ${e.committed ? 'rgba(0,180,60,0.2)' : 'var(--rule)'}`,
                  borderLeft:`3px solid ${GRADE_COLOUR[e.reliability_grade]??'var(--rule)'}` }}>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'6px', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'9px', fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase',
                      background:'var(--s3)', color:'var(--white)', padding:'2px 6px', borderRadius:'2px' }}>
                      {e.event_type.replace('_',' ')}
                    </span>
                    <span style={{ fontSize:'10px', color: GRADE_COLOUR[e.reliability_grade]??'var(--mgrey)' }}>
                      {e.reliability_grade}
                    </span>
                    <span style={{ fontSize:'10px', color: CONF_COLOUR[e.confidence]??'var(--mgrey)' }}>
                      {e.confidence}
                    </span>
                    {e.attributed_actor_name && <span style={{ fontSize:'10px', color:'var(--mgrey)' }}>{e.attributed_actor_name}</span>}
                    {e.event_date && <span style={{ fontSize:'10px', color:'var(--mgrey)', marginLeft:'auto' }}>{e.event_date}</span>}
                    {e.committed && <span style={{ fontSize:'9px', color:'var(--bedrock)' }}>✓ committed</span>}
                  </div>
                  <p style={{ fontSize:'12px', color:'var(--white)', lineHeight:'1.5', marginBottom: e.content ? '4px' : 0 }}>
                    {e.summary}
                  </p>
                  {e.content && (
                    <p style={{ fontSize:'11px', color:'var(--text-secondary)', lineHeight:'1.5' }}>{e.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'claims' && (
            <div>
              {claims.length === 0 && <p style={{ color:'var(--mgrey)', fontSize:'12px' }}>No claims extracted.</p>}
              {claims.map(c => (
                <div key={c.id} style={{ padding:'10px 14px', marginBottom:'6px', borderRadius:'2px',
                  background:'var(--s1)', border:'1px solid var(--rule)',
                  borderLeft:`3px solid ${CONF_COLOUR[c.confidence]??'var(--rule)'}` }}>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'4px' }}>
                    <span style={{ fontSize:'10px', color: CONF_COLOUR[c.confidence]??'var(--mgrey)' }}>{c.confidence}</span>
                    {c.attributed_actor_name && <span style={{ fontSize:'10px', color:'var(--mgrey)' }}>{c.attributed_actor_name}</span>}
                  </div>
                  <p style={{ fontSize:'12px', color:'var(--white)', lineHeight:'1.5' }}>{c.claim_text}</p>
                  {c.context && <p style={{ fontSize:'11px', color:'var(--mgrey)', marginTop:'4px', fontStyle:'italic' }}>{c.context}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {source.raw_text && (
        <details style={{ marginTop:'16px' }}>
          <summary style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase',
            color:'var(--mgrey)', cursor:'pointer', marginBottom:'8px' }}>
            Raw text
          </summary>
          <pre style={{ fontSize:'11px', color:'var(--mgrey)', background:'var(--s1)', padding:'12px',
            borderRadius:'2px', whiteSpace:'pre-wrap', wordBreak:'break-word',
            maxHeight:'200px', overflowY:'auto', lineHeight:'1.5' }}>
            {source.raw_text.slice(0, 2000)}{source.raw_text.length > 2000 ? '…' : ''}
          </pre>
        </details>
      )}

      <div style={{ marginTop:'24px', paddingTop:'16px', borderTop:'1px solid var(--rule)' }}>
        <button onClick={() => destroy.mutate()} className="br-btn-ghost"
          style={{ fontSize:'11px', color:'var(--crimson)' }}
          disabled={destroy.isPending}>
          Delete source
        </button>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SourcesPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)

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
    setShowModal(false)
    if (source) setSelected(source.id)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'24px 24px 20px', borderBottom:'1px solid var(--rule)', flexShrink:0 }}>
        <span className="br-text-label" style={{ display:'block', marginBottom:'6px' }}>Intelligence</span>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h1 style={{ fontFamily:'var(--font-sans)', fontWeight:500, fontSize:'22px',
            color:'var(--white)', letterSpacing:'-0.02em' }}>
            Sources
            {sources.length > 0 && (
              <span style={{ marginLeft:'12px', fontSize:'13px', fontWeight:400,
                color:'var(--mgrey)', verticalAlign:'middle' }}>
                {sources.length}
              </span>
            )}
          </h1>
          <button onClick={() => setShowModal(true)} className="br-btn"
            style={{ fontSize:'11px', padding:'6px 16px' }}>
            + Add source
          </button>
        </div>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <div style={{ width:'320px', flexShrink:0, borderRight:'1px solid var(--rule)', overflowY:'auto' }}>
          {isLoading && (
            <p style={{ padding:'24px', color:'var(--mgrey)', fontSize:'13px' }}>Loading…</p>
          )}
          {!isLoading && sources.length === 0 && (
            <div style={{ padding:'32px 24px', textAlign:'center' }}>
              <p style={{ color:'var(--mgrey)', fontSize:'13px', marginBottom:'12px' }}>
                No sources yet.
              </p>
              <button onClick={() => setShowModal(true)} className="br-btn"
                style={{ fontSize:'11px' }}>
                Add your first source
              </button>
            </div>
          )}
          {sources.map(s => (
            <SourceListRow
              key={s.id}
              source={s}
              selected={selected === s.id}
              onSelect={src => setSelected(src.id)}
            />
          ))}
        </div>

        <div style={{ flex:1, overflow:'hidden' }}>
          <SourceDetail
            sourceId={selected}
            onDeleted={() => { setSelected(null); qc.invalidateQueries(['sources']) }}
          />
        </div>
      </div>

      {showModal && (
        <AddSourceModal
          onClose={() => setShowModal(false)}
          onSuccess={handleAdded}
        />
      )}
    </div>
  )
}
