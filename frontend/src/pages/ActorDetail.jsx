import { useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import RelationshipsTab      from '../components/RelationshipsTab'
import IntelligenceTab       from '../components/IntelligenceTab'
import TerrainTab            from '../components/TerrainTab'
import EventProvenanceSlider from '../components/EventProvenanceSlider'
import DocumentsTab          from '../components/DocumentsTab'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const TYPE_LABEL = {
  contacts:    { singular: 'Person',     badgeClass: 'badge--person'       },
  companies:   { singular: 'Company',    badgeClass: 'badge--organisation'  },
  governments: { singular: 'Government', badgeClass: 'badge--government'   },
}

/** Format an ISO date string as a short localised date, or return fallback. */
function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Derive a tier label from the importance_tier field. */
function tierLabel(tier) {
  if (!tier || tier === 'unclassified') return null
  const map = { tier_1: 'P1', tier_2: 'P2', tier_3: 'P3' }
  return map[tier] ?? tier.replace('_', ' ')
}

/* ─── left-panel sections ─────────────────────────────────────────────────── */

function CollapsibleSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="panel-section">
      <button
        className="panel-section__header"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span className="panel-section__title">{title}</span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && <div style={{ marginTop: '12px' }}>{children}</div>}
    </div>
  )
}

function PropPair({ label, value, href }) {
  const [hovered, setHovered] = useState(false)
  if (!value) return null
  return (
    <div
      className="prop-pair"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      <span className="prop-pair__key">{label}</span>
      <span className="prop-pair__value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--color-navy)', textDecoration: 'underline' }}>
            {value}
          </a>
        ) : (
          value
        )}
        {hovered && (
          <button
            className="btn-ghost"
            title="Edit"
            style={{ fontSize: '12px', padding: '0 4px', opacity: 0.6, lineHeight: 1 }}
          >
            ✎
          </button>
        )}
      </span>
    </div>
  )
}

function IntelRow({ label, badge, badgeClass, children }) {
  return (
    <div className="intel-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
      <span className="intel-row__label">{label}</span>
      <div style={{ textAlign: 'right' }}>
        {badge && badgeClass && (
          <span className={`badge ${badgeClass}`}>{badge}</span>
        )}
        {children}
      </div>
    </div>
  )
}

/* ─── right-panel sections ────────────────────────────────────────────────── */

function SignalRow({ signal }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)', position: 'relative', cursor: 'default' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p style={{
        fontSize: '13px',
        color: 'var(--color-text-primary)',
        lineHeight: '1.4',
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 2,
        overflow: 'hidden',
        marginBottom: '2px',
      }}>
        {signal.headline}
      </p>
      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
        {signal.source_label ?? signal.source}
      </p>
      {hovered && (
        <div className="row-actions" style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <button className="btn-row-action" style={{ color: 'var(--color-positive)' }}>Accept</button>
          <button className="btn-row-action" style={{ color: 'var(--color-text-secondary)' }}>Dismiss</button>
          <button className="btn-row-action" style={{ color: 'var(--color-text-secondary)' }}>Snooze</button>
        </div>
      )}
    </div>
  )
}

/* ─── timeline tab ────────────────────────────────────────────────────────── */

function EventRow({ event, onProvenance }) {
  const [hovered, setHovered] = useState(false)
  const isPromoted = !!event.promoted
  return (
    <div
      className={`event-row${isPromoted ? ' event-row--promoted' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span className="event-type-label">
          {event.event_type?.replace(/_/g, ' ')}
        </span>
        {event.reliability_grade && (
          <span className={`badge badge--${event.reliability_grade}`}>
            {event.reliability_grade}
          </span>
        )}
      </div>
      <p
        className="event-summary"
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 3,
          overflow: 'hidden',
        }}
      >
        {event.summary}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
        {event.event_date && (
          <span className="event-meta">{event.event_date}</span>
        )}
        {event.operator_annotation && (
          <span className="event-meta" style={{ fontStyle: 'italic' }}>{event.operator_annotation}</span>
        )}
      </div>
      {hovered && (
        <div className="row-actions" style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <button className="btn-ghost">Edit</button>
          <button className="btn-ghost" onClick={() => onProvenance(event.id)}>Provenance</button>
        </div>
      )}
    </div>
  )
}

/* ─── main component ──────────────────────────────────────────────────────── */

export default function ActorDetail({ type, id: propId, onBack }) {
  const params   = useParams()
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const id       = propId ?? params.id

  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'timeline'
  const setTab = (t) => setSearchParams({ tab: t }, { replace: true })

  const [eventFilter, setEventFilter]       = useState('')
  const [events, setEvents]                 = useState([])
  const [page, setPage]                     = useState(1)
  const [lastPage, setLastPage]             = useState(1)
  const [loadingMore, setLoadingMore]       = useState(false)
  const [provenanceEventId, setProvenanceEventId] = useState(null)

  const typeInfo = TYPE_LABEL[type] ?? { singular: 'Record', badgeClass: '' }

  /* ── actor query ── */
  const { data: actor, isLoading } = useQuery({
    queryKey: [type, id],
    queryFn: () => api.get(`/${type}/${id}`).then(r => r.data.data),
  })

  /* ── trajectory query ── */
  const { data: trajectoryData, isLoading: trajLoading } = useQuery({
    queryKey: ['trajectory', id],
    queryFn: () => api.get(`/actors/${id}/trajectory`).then(r => r.data.data).catch(() => null),
    enabled: tab === 'timeline',
    staleTime: 60000,
  })

  /* ── events query ── */
  const { isLoading: eventsLoading } = useQuery({
    queryKey: ['events', id, 1],
    queryFn: () =>
      api.get(`/actors/${id}/events`, { params: { page: 1 } }).then(r => {
        setEvents(r.data.data)
        setPage(1)
        setLastPage(r.data.meta?.last_page ?? 1)
        return r.data
      }),
    enabled: tab === 'timeline',
    staleTime: 30000,
  })

  /* ── signals query (right panel) ── */
  const { data: signalsData } = useQuery({
    queryKey: ['signals', id, 'pending'],
    queryFn: () => api.get(`/actors/${id}/signals`, { params: { status: 'pending', limit: 3 } }).then(r => r.data),
  })

  /* ── sources query (right panel) ── */
  const { data: sourcesData } = useQuery({
    queryKey: ['sources', id],
    queryFn: () => api.get('/sources', { params: { actor_id: id, limit: 5 } }).then(r => r.data),
  })

  /* ── projects query (right panel) ── */
  const { data: projectsData } = useQuery({
    queryKey: ['projects', id],
    queryFn: () => api.get('/projects', { params: { actor_id: id, limit: 5 } }).then(r => r.data),
  })

  /* ── mutations ── */
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

  const briefActor = useMutation({
    mutationFn: () => api.post(`/actors/${id}/brief`),
    onSuccess: (res) => navigate('/chat', { state: { sessionId: res.data.data.session_id } }),
  })

  /* ── load more events ── */
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

  /* ── loading / error states ── */
  if (isLoading) return <div className="state-loading">Loading…</div>
  if (!actor)   return <div className="state-error">{typeInfo.singular} not found.</div>

  /* ── derived values ── */
  const signals  = signalsData?.data ?? []
  const sources  = sourcesData?.data ?? []
  const projects = projectsData?.data ?? []

  const promotedCount = events.filter(e => e.promoted).length
  const filteredEvents = eventFilter
    ? events.filter(e =>
        e.event_type?.includes(eventFilter) ||
        e.summary?.toLowerCase().includes(eventFilter.toLowerCase())
      )
    : events
  // Promoted float to top
  const sortedEvents = [
    ...filteredEvents.filter(e => e.promoted),
    ...filteredEvents.filter(e => !e.promoted),
  ]

  const TABS = ['timeline', 'relationships', 'intelligence', 'terrain', 'documents']

  /* ── render ── */
  return (
    <div className="actor-detail-shell">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
      <aside className="actor-panel-left">

        {/* About — collapsible */}
        <CollapsibleSection title="About" defaultOpen>
          <PropPair label="Display name"   value={actor.display_name} />
          <PropPair label="Aliases"        value={actor.known_aliases?.join(', ') ?? actor.aliases?.join(', ')} />
          <PropPair label="Website"        value={actor.website_url}   href={actor.website_url} />
          <PropPair label="LinkedIn"       value={actor.linkedin_url ? 'Profile' : null} href={actor.linkedin_url} />
          <PropPair label="Primary email"  value={actor.primary_email} />
        </CollapsibleSection>

        {/* Intelligence Summary — always visible */}
        <div className="panel-section">
          <div className="panel-section__header">
            <span className="panel-section__title">Intelligence Summary</span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <IntelRow
              label="Divergence"
              badge={actor.divergence_rating ?? 'Unknown'}
              badgeClass={actor.divergence_rating ? `badge--${actor.divergence_rating}` : ''}
            />
            <IntelRow
              label="Trajectory"
              badge={trajectoryData?.trajectory ?? actor.trajectory ?? null}
              badgeClass={
                (trajectoryData?.trajectory ?? actor.trajectory)
                  ? `badge--${trajectoryData?.trajectory ?? actor.trajectory}`
                  : ''
              }
            >
              {(trajectoryData?.rationale) && (
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: '1.4', textAlign: 'left' }}>
                  {trajectoryData.rationale}
                </p>
              )}
            </IntelRow>

            {promotedCount > 0 && (
              <button
                className="btn-ghost"
                style={{ fontSize: '13px', color: 'var(--color-text-primary)', width: '100%', textAlign: 'left', padding: '4px 0' }}
                onClick={() => {
                  setTab('timeline')
                  // brief scroll delay so tab renders before scroll
                  setTimeout(() => document.getElementById('promoted-anchor')?.scrollIntoView({ behavior: 'smooth' }), 80)
                }}
              >
                {promotedCount} promoted finding{promotedCount !== 1 ? 's' : ''}
              </button>
            )}

            <div style={{ marginTop: '10px' }}>
              <button
                className="btn-ghost"
                style={{ fontSize: '12px' }}
                onClick={() => computeTrajectory.mutate()}
                disabled={computeTrajectory.isPending}
              >
                {computeTrajectory.isPending ? 'Recomputing…' : 'Recompute'}
              </button>
            </div>
          </div>
        </div>

        {/* Work — collapsible */}
        <CollapsibleSection title="Work" defaultOpen={false}>
          {/* Persons */}
          {type === 'contacts' && (
            <>
              <PropPair label="Role"         value={actor.role ?? actor.job_title} />
              <PropPair label="Organisation" value={actor.organisation_name ?? actor.company_name} />
            </>
          )}
          {/* Orgs / Govts */}
          {(type === 'companies' || type === 'governments') && (
            <>
              <PropPair label="Sector"       value={actor.sector} />
              <PropPair label="Jurisdiction" value={actor.jurisdiction} />
            </>
          )}
        </CollapsibleSection>

      </aside>

      {/* ── CENTER COLUMN ──────────────────────────────────────────────── */}
      <main className="actor-center">

        {/* Back button row */}
        <div style={{ padding: '16px 24px 0' }}>
          <button
            className="btn-ghost"
            onClick={() => onBack ? onBack() : navigate(`/${type}`)}
            style={{ fontSize: '13px' }}
          >
            ← Back
          </button>
        </div>

        {/* Hero */}
        <div className="actor-hero">
          <div className="actor-hero__top">
            <div className="actor-hero__identity">
              <span className="actor-name">{actor.display_name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span className={`badge ${typeInfo.badgeClass}`}>{typeInfo.singular}</span>
                {tierLabel(actor.importance_tier) && (
                  <span className="badge badge--tier">{tierLabel(actor.importance_tier)}</span>
                )}
                {actor.dormancy_state && (
                  <span className={`badge badge--${actor.dormancy_state}`}>{actor.dormancy_state}</span>
                )}
              </div>
            </div>
            <div className="actor-hero__actions" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexShrink: 0 }}>
              <button
                className="btn-outline"
                onClick={() => briefActor.mutate()}
                disabled={briefActor.isPending}
              >
                {briefActor.isPending ? 'Opening…' : 'Brief'}
              </button>
              <button
                className="btn-outline"
                onClick={() => computeCanary.mutate()}
                disabled={computeCanary.isPending}
              >
                {computeCanary.isPending ? 'Assessing…' : 'Harvest'}
              </button>
              <button className="btn-outline">Edit</button>
            </div>
          </div>
          <div className="actor-hero__meta">
            {actor.created_at && <span>Created {fmtDate(actor.created_at)}</span>}
            {actor.last_event_date && (
              <>
                <span style={{ margin: '0 6px' }}>·</span>
                <span>Last event {fmtDate(actor.last_event_date)}</span>
              </>
            )}
          </div>
        </div>

        {/* Split suggestion banner */}
        {actor.split_suggested && (
          <div className="split-banner" style={{ margin: '0 24px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-gold)', marginBottom: '4px' }}>
                  Possible split detected
                </p>
                {actor.split_rationale && (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                    {actor.split_rationale}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  className="btn-outline"
                  onClick={() => confirmSplit.mutate()}
                  disabled={confirmSplit.isPending}
                >
                  {confirmSplit.isPending ? 'Splitting…' : 'Confirm'}
                </button>
                <button className="btn-ghost" onClick={() => dismissSplit.mutate()}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Canary rationale (if pending confirmation) */}
        {!actor.canary_marker && actor.canary_rationale && (
          <div className="split-banner" style={{ margin: '0 24px', marginTop: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5', marginBottom: '8px' }}>
              {actor.canary_rationale}
            </p>
            <button className="btn-outline" onClick={() => setCanary.mutate()}>
              Confirm canary marker
            </button>
          </div>
        )}

        {/* Tab bar */}
        <div className="tab-bar" style={{ margin: '16px 0 0' }}>
          {TABS.map(t => (
            <button
              key={t}
              className={`tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '24px' }}>

          {/* ── Timeline ── */}
          {tab === 'timeline' && (
            <div>
              {/* Filter bar */}
              <div className="filter-bar" style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  className="input"
                  placeholder="Filter events…"
                  value={eventFilter}
                  onChange={e => setEventFilter(e.target.value)}
                  style={{ maxWidth: '280px' }}
                />
                {eventFilter && (
                  <button className="btn-ghost" onClick={() => setEventFilter('')} style={{ fontSize: '12px' }}>
                    Clear
                  </button>
                )}
              </div>

              {eventsLoading && events.length === 0 && (
                <div className="state-loading">Loading events…</div>
              )}
              {!eventsLoading && sortedEvents.length === 0 && (
                <div className="empty-state">
                  <p className="empty-state__text">No events recorded.</p>
                </div>
              )}

              {/* Promoted anchor */}
              <div id="promoted-anchor" />

              {sortedEvents.map(event => (
                <EventRow
                  key={event.id}
                  event={event}
                  onProvenance={setProvenanceEventId}
                />
              ))}

              {page < lastPage && (
                <div className="pagination" style={{ paddingTop: '16px' }}>
                  <button
                    className="pagination__btn"
                    onClick={loadMore}
                    disabled={loadingMore}
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
      </main>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
      <aside className="actor-panel-right">

        {/* Recent Signals */}
        <div className="panel-section">
          <div className="panel-section__header">
            <span className="panel-section__title">Recent Signals</span>
          </div>
          <div style={{ marginTop: '12px' }}>
            {signals.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--color-neutral-sm)' }}>No pending signals.</p>
            )}
            {signals.map(signal => (
              <SignalRow key={signal.id} signal={signal} />
            ))}
            {signals.length > 0 && (
              <a
                href={`/${type}/${id}/signals`}
                style={{ display: 'block', marginTop: '10px', fontSize: '13px', color: 'var(--color-navy)', textDecoration: 'none' }}
              >
                View all signals
              </a>
            )}
          </div>
        </div>

        {/* Sources */}
        <div className="panel-section">
          <div className="panel-section__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="panel-section__title">Sources</span>
            {sources.length > 0 && (
              <span className="badge">{sources.length}</span>
            )}
          </div>
          <div style={{ marginTop: '12px' }}>
            {sources.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--color-neutral-sm)' }}>No sources linked.</p>
            )}
            {sources.map(source => (
              <div key={source.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {source.title ?? source.name}
                </p>
                {source.updated_at && (
                  <p style={{ fontSize: '12px', color: 'var(--color-neutral-sm)' }}>
                    {fmtDate(source.updated_at)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="panel-section">
          <div className="panel-section__header">
            <span className="panel-section__title">Projects</span>
          </div>
          <div style={{ marginTop: '12px' }}>
            {projects.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--color-neutral-sm)' }}>No projects linked.</p>
            )}
            {projects.map(project => (
              <div key={project.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {project.name ?? project.title}
                </p>
                {project.stance && (
                  <span className={`badge badge--${project.stance}`} style={{ flexShrink: 0 }}>
                    {project.stance}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Canary marker badge (if set) */}
        {actor.canary_marker && (
          <div className="panel-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span className="badge" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid var(--color-gold)', color: 'var(--color-gold)' }}>
              CANARY
            </span>
            <button
              className="btn-ghost"
              style={{ fontSize: '12px' }}
              onClick={() => clearCanary.mutate()}
            >
              Remove
            </button>
          </div>
        )}

        {/* Detect split (subtle link at bottom) */}
        {!actor.split_suggested && (
          <div className="panel-section">
            <button
              className="btn-ghost"
              style={{ fontSize: '12px', color: 'var(--color-text-secondary)', opacity: 0.6 }}
              onClick={() => computeSplit.mutate()}
              disabled={computeSplit.isPending}
            >
              {computeSplit.isPending ? 'Detecting…' : 'Detect split'}
            </button>
          </div>
        )}

      </aside>

      {/* Provenance slider */}
      {provenanceEventId && (
        <EventProvenanceSlider
          eventId={provenanceEventId}
          onClose={() => setProvenanceEventId(null)}
        />
      )}

    </div>
  )
}
