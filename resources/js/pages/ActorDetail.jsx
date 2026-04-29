import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import RelationshipsTab from '../components/RelationshipsTab'
import IntelligenceTab  from '../components/IntelligenceTab'
import EnrichmentPanel  from '../components/EnrichmentPanel'
import TimelineCanvas   from '../components/TimelineCanvas'
import TerrainTab              from '../components/TerrainTab'
import EventProvenanceSlider  from '../components/EventProvenanceSlider'
import DocumentsTab            from '../components/DocumentsTab'

const GRADE_CLASS = { bedrock:'br-event-row--bedrock', rock:'br-event-row--rock', sand:'br-event-row--sand', mud:'br-event-row--mud', fog:'br-event-row--fog' }
const GRADE_COLOUR = { bedrock:'var(--bedrock)', rock:'var(--rock)', sand:'var(--sand)', mud:'var(--mud)', fog:'var(--fog)' }

const EVENT_STYLE = {
  claim:              { background:'var(--rock-bg)',     color:'var(--rock)'              },
  commitment:         { background:'var(--bedrock-bg)',  color:'var(--bedrock)'           },
  admission:          { background:'#1a1030',            color:'#9a70d0'                  },
  denial:             { background:'#2a0a0a',            color:'#d06060'                  },
  action:             { background:'var(--sand-bg)',     color:'var(--sand)'              },
  silence:            { background:'var(--fog-bg)',      color:'var(--fog)'               },
  position:           { background:'#0a1030',            color:'#5070c0'                  },
  affiliation_change: { background:'#1a0a1a',            color:'#b060b0'                  },
  communication:      { background:'#0a1a1a',            color:'#4090a0'                  },
  signal:             { background:'var(--divergent-bg)',color:'var(--br-divergent-text)' },
  meeting:            { background:'#0a1a14',            color:'#408060'                  },
  operator_note:      { background:'var(--s3)',          color:'var(--mgrey)'             },
}

const TYPE_LABEL = {
  contacts:    { singular: 'Person',     plural: 'People'      },
  companies:   { singular: 'Company',    plural: 'Companies'   },
  governments: { singular: 'Government', plural: 'Governments' },
}

function FieldRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display:'flex', gap:'24px', padding:'10px 0', borderBottom:'1px solid var(--br-border-subtle)' }}>
      <span style={{ width:'140px', flexShrink:0, fontSize:'10px', color:'var(--gold)', letterSpacing:'0.12em', textTransform:'uppercase', paddingTop:'2px' }}>
        {label}
      </span>
      <span style={{ fontSize:'13px', color:'var(--br-bone-white)' }}>{value}</span>
    </div>
  )
}

const TRAJ_STYLE = {
  ascending: { color:'var(--bedrock)', label:'Ascending'  },
  stable:    { color:'var(--rock)',    label:'Stable'     },
  declining: { color:'var(--crimson)', label:'Declining'  },
  unclear:   { color:'var(--mgrey)',   label:'Unclear'    },
}

function ComparePanel({ currentEvents, currentName }) {
  const [actorId, setActorId]     = useState('')
  const [submitted, setSubmitted] = useState('')

  const { data: compareData, isLoading } = useQuery({
    queryKey: ['events-compare', submitted],
    queryFn: () => submitted
      ? api.get(`/actors/${submitted}/events`, { params: { page: 1, per_page: 200 } }).then(r => r.data)
      : Promise.resolve(null),
    enabled: !!submitted,
    staleTime: 60000,
  })

  const compareActor = useQuery({
    queryKey: ['actor-compare', submitted],
    queryFn: () => submitted
      ? api.get(`/contacts/${submitted}`).then(r => r.data.data)
        .catch(() => api.get(`/companies/${submitted}`).then(r => r.data.data))
        .catch(() => api.get(`/governments/${submitted}`).then(r => r.data.data))
        .catch(() => null)
      : Promise.resolve(null),
    enabled: !!submitted,
  })

  const compareEvents = compareData?.data ?? []
  const compareName   = compareActor.data?.display_name ?? submitted

  return (
    <div style={{ marginBottom:'20px', padding:'14px 16px', background:'var(--s1)', border:'1px solid var(--rule)', borderRadius:'2px' }}>
      <p style={{ fontSize:'10px', color:'var(--gold)', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'10px' }}>
        Timeline Comparison
      </p>
      {!submitted && (
        <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
          <input
            value={actorId}
            onChange={e => setActorId(e.target.value)}
            placeholder="Paste actor ID to compare…"
            style={{ flex:1, background:'var(--s0)', border:'1px solid var(--rule)', borderRadius:'2px', color:'var(--br-bone-white)', fontSize:'12px', padding:'6px 10px', fontFamily:'var(--font-mono)' }}
          />
          <button
            onClick={() => { if (actorId.trim()) setSubmitted(actorId.trim()) }}
            className="br-btn-outline"
            style={{ fontSize:'12px' }}>
            Load →
          </button>
        </div>
      )}
      {submitted && isLoading && <p style={{ fontSize:'12px', color:'var(--mgrey)' }}>Loading…</p>}
      {submitted && !isLoading && (
        <div>
          <div style={{ marginBottom:'14px' }}>
            <TimelineCanvas events={currentEvents} actorName={currentName} />
          </div>
          <div style={{ borderTop:'1px solid var(--rule)', paddingTop:'14px' }}>
            <TimelineCanvas events={compareEvents} actorName={compareName} />
          </div>
          <button onClick={() => { setSubmitted(''); setActorId('') }} className="br-btn-ghost" style={{ fontSize:'11px', marginTop:'10px' }}>
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

export default function ActorDetail({ type, id: propId, onBack }) {
  const params   = useParams()
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const id       = propId ?? params.id
  const [tab, setTab]           = useState('timeline')
  const [timelineView, setTimelineView] = useState('list')
  const [showCompare, setShowCompare]   = useState(false)
  const [events, setEvents] = useState([])
  const [page, setPage]     = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [provenanceEventId, setProvenanceEventId] = useState(null)

  const typeLabel = TYPE_LABEL[type] ?? { singular: 'Record', plural: 'Records' }

  const { data: actor, isLoading } = useQuery({
    queryKey: [type, id],
    queryFn: () => api.get(`/${type}/${id}`).then(r => r.data.data),
  })

  const { data: trajectoryData, isLoading: trajLoading } = useQuery({
    queryKey: ['trajectory', id],
    queryFn: () => api.get(`/actors/${id}/trajectory`).then(r => r.data.data).catch(() => null),
    enabled: tab === 'timeline',
    staleTime: 60000,
  })

  const computeTrajectory = useMutation({
    mutationFn: () => api.post(`/actors/${id}/trajectory`),
    onSuccess: () => setTimeout(() => qc.invalidateQueries(['trajectory', id]), 4000),
  })

  const computeSplit = useMutation({
    mutationFn: () => api.post(`/actors/${id}/split`),
    onSuccess: () => setTimeout(() => qc.invalidateQueries([type, id]), 5000),
  })
  const confirmSplit = useMutation({
    mutationFn: () => api.post(`/actors/${id}/split/confirm`),
    onSuccess: (res) => {
      qc.invalidateQueries([type, id])
      navigate(`/${type}/${res.data.data.new_actor_id}`)
    },
  })
  const dismissSplit = useMutation({
    mutationFn: () => api.delete(`/actors/${id}/split`),
    onSuccess: () => qc.invalidateQueries([type, id]),
  })

  const computeCanary = useMutation({
    mutationFn: () => api.post(`/actors/${id}/canary`),
    onSuccess: () => setTimeout(() => qc.invalidateQueries([type, id]), 5000),
  })
  const setCanary = useMutation({
    mutationFn: () => api.post(`/actors/${id}/canary/confirm`),
    onSuccess: () => qc.invalidateQueries([type, id]),
  })
  const clearCanary = useMutation({
    mutationFn: () => api.delete(`/actors/${id}/canary`),
    onSuccess: () => qc.invalidateQueries([type, id]),
  })

  const { isLoading: eventsLoading } = useQuery({
    queryKey: ['events', id, 1],
    queryFn: () => api.get(`/actors/${id}/events`, { params: { page: 1 } }).then(r => {
      setEvents(r.data.data)
      setPage(1)
      setLastPage(r.data.meta?.last_page ?? 1)
      return r.data
    }),
    enabled: tab === 'timeline',
    staleTime: 30000,
  })

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= lastPage) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const res = await api.get(`/actors/${id}/events`, { params: { page: next } })
      setEvents(prev => [...prev, ...res.data.data])
      setPage(next)
      setLastPage(res.data.meta?.last_page ?? next)
    } finally {
      setLoadingMore(false)
    }
  }, [id, page, lastPage, loadingMore])

  if (isLoading) return <div style={{ padding:'32px', color:'var(--mgrey)', fontSize:'13px' }}>Loading…</div>
  if (!actor)   return <div style={{ padding:'32px', color:'var(--crimson)', fontSize:'13px' }}>{typeLabel.singular} not found.</div>

  const tabs = ['profile','timeline','relationships','intelligence','terrain','documents']

  return (
    <div>
      {/* Header */}
      <div className="br-actor-header">
        <button
          onClick={() => onBack ? onBack() : navigate(`/${type}`)}
          className="br-btn-ghost"
          style={{ marginBottom:'14px', display:'block' }}
        >
          ← Back
        </button>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <h1 className="br-actor-name">{actor.display_name}</h1>
            {actor.primary_email && <p className="br-actor-role">{actor.primary_email}</p>}
            <div className="br-actor-meta">
              <span className={`br-badge br-badge--${actor.pool}`}>{actor.pool}</span>
              {actor.importance_tier && actor.importance_tier !== 'unclassified' && (
                <span>{actor.importance_tier.replace('_',' ')}</span>
              )}
              {actor.last_enriched_at && (
                <span>enriched {new Date(actor.last_enriched_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' }}>
            {actor.reliability_profile && (
              <span style={{ color:`var(--br-${actor.reliability_profile})`, fontSize:'11px', fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase' }}>
                {actor.reliability_profile}
              </span>
            )}
            {actor.canary_marker ? (
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <span style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.12em', color:'var(--gold)', background:'rgba(201,168,76,0.12)', border:'1px solid rgba(201,168,76,0.3)', padding:'2px 8px', borderRadius:'2px' }}>
                  CANARY
                </span>
                <button onClick={() => clearCanary.mutate()} className="br-btn-ghost" style={{ fontSize:'10px', padding:'2px 6px' }}>
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => computeCanary.mutate()}
                disabled={computeCanary.isPending}
                className="br-arrow-link"
                style={{ fontSize:'10px' }}>
                {computeCanary.isPending ? 'Assessing…' : 'Assess canary →'}
              </button>
            )}
            {!actor.canary_marker && actor.canary_rationale && (
              <div style={{ maxWidth:'240px', padding:'6px 10px', background:'var(--s1)', border:'1px solid var(--rule)', borderRadius:'2px' }}>
                <p style={{ fontSize:'11px', color:'var(--text-secondary)', lineHeight:'1.4', marginBottom:'6px' }}>{actor.canary_rationale}</p>
                <button onClick={() => setCanary.mutate()} className="br-arrow-link" style={{ fontSize:'11px' }}>
                  Confirm canary marker →
                </button>
              </div>
            )}
          </div>
        </div>

        {actor.split_suggested && (
          <div style={{ margin:'12px 0', padding:'10px 14px', background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.3)', borderLeft:'3px solid var(--gold)', borderRadius:'2px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px' }}>
              <div>
                <p style={{ fontSize:'11px', fontWeight:700, color:'var(--gold)', letterSpacing:'0.08em', marginBottom:'4px' }}>
                  POSSIBLE SPLIT DETECTED
                </p>
                {actor.split_rationale && (
                  <p style={{ fontSize:'12px', color:'var(--text-secondary)', lineHeight:'1.5' }}>{actor.split_rationale}</p>
                )}
              </div>
              <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
                <button onClick={() => confirmSplit.mutate()} disabled={confirmSplit.isPending} className="br-arrow-link" style={{ fontSize:'11px' }}>
                  {confirmSplit.isPending ? 'Splitting…' : 'Confirm split →'}
                </button>
                <button onClick={() => dismissSplit.mutate()} className="br-btn-ghost" style={{ fontSize:'11px' }}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        {!actor.split_suggested && (
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'4px' }}>
            <button
              onClick={() => computeSplit.mutate()}
              disabled={computeSplit.isPending}
              className="br-arrow-link"
              style={{ fontSize:'10px', opacity:0.5 }}>
              {computeSplit.isPending ? 'Detecting…' : 'Detect split →'}
            </button>
          </div>
        )}

        <div className="br-tabs">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`br-tab${tab===t?' active':''}`}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:'24px' }}>

        {tab === 'profile' && (
          <div>
            <FieldRow label="Trajectory" value={actor.trajectory} />
            <FieldRow label="Importance" value={actor.importance_tier?.replace('_',' ')} />
            <FieldRow label="Dormancy"   value={actor.dormancy_state} />
            {actor.aliases?.length > 0 && <FieldRow label="Aliases" value={actor.aliases.join(', ')} />}
            {actor.tags?.length > 0 && (
              <div style={{ display:'flex', gap:'24px', padding:'10px 0', borderBottom:'1px solid var(--br-border-subtle)' }}>
                <span style={{ width:'140px', flexShrink:0, fontSize:'10px', color:'var(--gold)', letterSpacing:'0.12em', textTransform:'uppercase', paddingTop:'2px' }}>Tags</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {actor.tags.map(t => (
                    <span key={t} style={{ fontSize:'11px', color:'var(--text-secondary)', background:'var(--s3)', border:'1px solid var(--br-border-subtle)', padding:'2px 8px', borderRadius:'2px' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {actor.notes && (
              <div style={{ marginTop:'20px', padding:'16px', background:'var(--s1)', borderLeft:'3px solid rgba(201,168,76,0.35)' }}>
                <p style={{ fontSize:'10px', color:'var(--gold)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'8px' }}>Notes</p>
                <p style={{ fontSize:'13px', color:'var(--text-secondary)', whiteSpace:'pre-wrap', lineHeight:'1.6' }}>{actor.notes}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'profile' && <EnrichmentPanel actorId={id} onApplied={() => {}} />}

        {tab === 'timeline' && (
          <div>
            <div style={{ marginBottom:'20px', padding:'14px 16px', background:'var(--s1)',
              border:'1px solid var(--rule)',
              borderLeft:`3px solid ${trajectoryData?.trajectory ? (TRAJ_STYLE[trajectoryData.trajectory]?.color ?? 'var(--rule)') : 'var(--rule)'}` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: trajectoryData?.rationale ? '8px' : 0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span className="br-text-label">Trajectory</span>
                  {trajectoryData?.trajectory && (
                    <span style={{ fontSize:'13px', fontWeight:600,
                      color: TRAJ_STYLE[trajectoryData.trajectory]?.color ?? 'var(--mgrey)',
                      fontFamily:'var(--font-sans)' }}>
                      {TRAJ_STYLE[trajectoryData.trajectory]?.label ?? trajectoryData.trajectory}
                    </span>
                  )}
                  {!trajectoryData?.trajectory && !trajLoading && (
                    <span style={{ fontSize:'12px', color:'var(--mgrey)' }}>Not computed</span>
                  )}
                  {trajLoading && (
                    <span style={{ fontSize:'12px', color:'var(--mgrey)' }}>Loading…</span>
                  )}
                </div>
                <button
                  onClick={() => computeTrajectory.mutate()}
                  disabled={computeTrajectory.isPending}
                  className="br-arrow-link"
                  style={{ fontSize:'11px' }}>
                  {computeTrajectory.isPending ? 'Computing…' : trajectoryData?.trajectory ? 'Recompute' : 'Compute'}
                </button>
              </div>
              {trajectoryData?.rationale && (
                <p style={{ fontSize:'12px', color:'var(--text-secondary)', lineHeight:'1.5' }}>
                  {trajectoryData.rationale}
                </p>
              )}
              {computeTrajectory.isPending && (
                <p style={{ fontSize:'11px', color:'var(--mgrey)', marginTop:'6px', fontStyle:'italic' }}>
                  Analysis queued — result will appear in a few seconds.
                </p>
              )}
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
              <div style={{ display:'flex', gap:'6px' }}>
                <button
                  onClick={() => setTimelineView('list')}
                  className={`br-tab${timelineView==='list'?' active':''}`}
                  style={{ fontSize:'11px', padding:'3px 10px' }}>
                  List
                </button>
                <button
                  onClick={() => setTimelineView('canvas')}
                  className={`br-tab${timelineView==='canvas'?' active':''}`}
                  style={{ fontSize:'11px', padding:'3px 10px' }}>
                  Canvas
                </button>
              </div>
              <button
                onClick={() => setShowCompare(v => !v)}
                className="br-arrow-link"
                style={{ fontSize:'11px' }}>
                {showCompare ? 'Close compare' : 'Compare →'}
              </button>
            </div>

            {showCompare && (
              <ComparePanel currentEvents={events} currentName={actor.display_name} />
            )}

            {eventsLoading && events.length === 0 && (
              <p style={{ color:'var(--mgrey)', fontSize:'13px' }}>Loading events…</p>
            )}
            {!eventsLoading && events.length === 0 && (
              <p style={{ color:'var(--mgrey)', fontSize:'13px' }}>No events recorded.</p>
            )}

            {timelineView === 'canvas' && events.length > 0 && (
              <TimelineCanvas events={events} actorName={actor.display_name} />
            )}

            {timelineView === 'list' && events.map(event => (
              <div key={event.id} className={`br-event-row ${GRADE_CLASS[event.reliability_grade]??''}`}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                  <span style={{ ...(EVENT_STYLE[event.event_type]??{}), fontSize:'10px', fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', padding:'2px 6px', borderRadius:'2px' }}>
                    {event.event_type.replace('_',' ')}
                  </span>
                  <span style={{ color: GRADE_COLOUR[event.reliability_grade]??'var(--mgrey)', fontSize:'11px' }}>
                    {event.reliability_grade}
                  </span>
                  {event.event_date && (
                    <span style={{ fontSize:'11px', color:'var(--mgrey)' }}>{event.event_date}</span>
                  )}
                  <button
                    onClick={() => setProvenanceEventId(event.id)}
                    className="br-arrow-link"
                    style={{ fontSize:'10px', marginLeft:'auto', opacity:0.6 }}>
                    Provenance →
                  </button>
                </div>
                <p className="br-event-summary">{event.summary}</p>
                {event.content && (
                  <p style={{ fontSize:'12px', color:'var(--text-secondary)', marginTop:'4px', lineHeight:'1.5' }}>{event.content}</p>
                )}
                {event.operator_annotation && (
                  <p style={{ fontSize:'11px', color:'var(--mgrey)', marginTop:'6px', fontStyle:'italic' }}>{event.operator_annotation}</p>
                )}
              </div>
            ))}
            {timelineView === 'list' && page < lastPage && (
              <div style={{ textAlign:'center', paddingTop:'16px' }}>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="br-btn-outline"
                  style={{ fontSize:'12px' }}
                >
                  {loadingMore ? 'Loading…' : `Load more (page ${page + 1} of ${lastPage})`}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'relationships' && <RelationshipsTab actorId={id} actor={actor} />}
        {tab === 'intelligence'  && <IntelligenceTab  actorId={id} />}
        {tab === 'terrain'       && <TerrainTab       actorId={id} actor={actor} />}
        {tab === 'documents'     && <DocumentsTab     actorId={id} />}
      </div>

      {/* BD-74: evidentiary chain slide-over */}
      {provenanceEventId && (
        <EventProvenanceSlider
          eventId={provenanceEventId}
          onClose={() => setProvenanceEventId(null)}
        />
      )}
    </div>
  )
}
