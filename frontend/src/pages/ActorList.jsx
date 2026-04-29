import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const TYPE_LABEL = {
  contacts:    { singular: 'Person',     plural: 'People'      },
  companies:   { singular: 'Company',    plural: 'Companies'   },
  governments: { singular: 'Government', plural: 'Governments' },
}

/** Return a short P1/P2/P3 label for importance_tier, or null. */
function tierLabel(tier) {
  if (!tier || tier === 'unclassified') return null
  const map = { tier_1: 'P1', tier_2: 'P2', tier_3: 'P3' }
  return map[tier] ?? null
}

/** Format an ISO date as a locale date string. */
function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Badge class for actor type */
function typeBadgeClass(endpoint) {
  const map = {
    contacts:    'badge--person',
    companies:   'badge--organisation',
    governments: 'badge--government',
  }
  return map[endpoint] ?? ''
}

function ActorRow({ actor, endpoint, onClick }) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()

  return (
    <div
      className="list-row"
      onClick={() => onClick(actor.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer', position: 'relative' }}
    >
      {/* Name + type badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {actor.display_name}
          </span>
          <span className={`badge ${typeBadgeClass(endpoint)}`}>
            {TYPE_LABEL[endpoint]?.singular ?? 'Record'}
          </span>
        </div>
        {actor.last_event_date && (
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Last event {fmtDate(actor.last_event_date)}
          </p>
        )}
      </div>

      {/* Tier / dormancy / divergence badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {tierLabel(actor.importance_tier) && (
          <span className="badge badge--tier">{tierLabel(actor.importance_tier)}</span>
        )}
        {actor.dormancy_state && (
          <span className={`badge badge--${actor.dormancy_state}`}>{actor.dormancy_state}</span>
        )}
        {actor.divergence_rating && (
          <span className={`badge badge--${actor.divergence_rating}`}>{actor.divergence_rating}</span>
        )}
      </div>

      {/* Timestamp (right-aligned) */}
      {actor.updated_at && (
        <div style={{ fontSize: '12px', color: 'var(--color-neutral-sm)', flexShrink: 0, minWidth: '72px', textAlign: 'right' }}>
          {fmtDate(actor.updated_at)}
        </div>
      )}

      {/* Row actions on hover */}
      {hovered && (
        <div className="row-actions" style={{ display: 'flex', gap: '8px', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
          <button
            className="btn-row-action"
            onClick={(e) => { e.stopPropagation(); navigate(`/${endpoint}/${actor.id}`) }}
            style={{ fontSize: '13px', color: 'var(--color-navy)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            View
          </button>
        </div>
      )}
    </div>
  )
}

export default function ActorList({ endpoint, title, createLabel }) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: [endpoint, search],
    queryFn: () =>
      api.get(`/${endpoint}`, { params: { search: search || undefined } }).then(r => r.data),
    keepPreviousData: true,
  })

  const typeLabel = TYPE_LABEL[endpoint] ?? { singular: 'Record', plural: 'Records' }
  const actors = data?.data ?? []

  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <h1 className="page-title">{title ?? typeLabel.plural}</h1>
        <button
          className="btn"
          onClick={() => navigate(`/${endpoint}/new`)}
        >
          {createLabel ?? `New ${typeLabel.singular}`}
        </button>
      </div>

      {/* Search bar */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)' }}>
        <input
          className="input"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '320px' }}
        />
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 120px 120px 120px',
        padding: '8px 24px',
        borderBottom: '1px solid var(--color-border)',
        gap: '8px',
      }}>
        {['Name', 'Tier', 'Status', 'Divergence'].map(col => (
          <span
            key={col}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {col}
          </span>
        ))}
      </div>

      {/* States */}
      {isLoading && <div className="state-loading" style={{ padding: '24px' }}>Loading…</div>}
      {error    && <div className="state-error"   style={{ padding: '24px' }}>Failed to load.</div>}

      {/* List */}
      {!isLoading && !error && actors.length === 0 && (
        <div className="empty-state">
          <p className="empty-state__text">No {typeLabel.plural.toLowerCase()} found.</p>
          <button className="btn" onClick={() => navigate(`/${endpoint}/new`)}>
            {createLabel ?? `New ${typeLabel.singular}`}
          </button>
        </div>
      )}

      {actors.map(actor => (
        <ActorRow
          key={actor.id}
          actor={actor}
          endpoint={endpoint}
          onClick={(id) => navigate(`/${endpoint}/${id}`)}
        />
      ))}
    </div>
  )
}
