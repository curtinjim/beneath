import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const GRADE_STYLES = {
  bedrock: { color: 'var(--bedrock)', background: 'var(--bedrock-bg)' },
  rock:    { color: 'var(--rock)',    background: 'var(--rock-bg)'    },
  sand:    { color: 'var(--sand)',    background: 'var(--sand-bg)'    },
  mud:     { color: 'var(--mud)',     background: 'var(--mud-bg)'     },
  fog:     { color: 'var(--fog)',     background: 'var(--fog-bg)'     },
}

const TYPE_LABEL = {
  contacts:    { singular: 'Person',     plural: 'People'      },
  companies:   { singular: 'Company',    plural: 'Companies'   },
  governments: { singular: 'Government', plural: 'Governments' },
}

export default function ActorList({ endpoint, title, createPath }) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: [endpoint, search],
    queryFn: () => api.get(`/${endpoint}`, { params: { search: search || undefined } }).then(r => r.data),
    keepPreviousData: true,
  })

  const typeLabel = TYPE_LABEL[endpoint] ?? { singular: 'Record', plural: 'Records' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 20px', borderBottom: '1px solid var(--br-border-subtle)' }}>
        <div>
          <span className="br-text-label" style={{ display: 'block', marginBottom: '6px' }}>{typeLabel.plural}</span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '22px', color: 'var(--br-bone-white)', letterSpacing: '-0.01em' }}>
            {title}
          </h1>
        </div>
        <button onClick={() => navigate(createPath)} className="br-btn-outline">+ New</button>
      </div>

      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--br-border-subtle)' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search…" className="br-input" style={{ maxWidth: '320px' }} />
      </div>

      {isLoading && <p style={{ padding: '24px', color: 'var(--mgrey)', fontSize: '13px' }}>Loading…</p>}
      {error    && <p style={{ padding: '24px', color: 'var(--crimson)',  fontSize: '13px' }}>Failed to load.</p>}

      {data && (
        <div>
          {data.data.length === 0 && (
            <p style={{ padding: '24px', color: 'var(--mgrey)', fontSize: '13px' }}>No records.</p>
          )}
          {data.data.map(actor => (
            <div key={actor.id} onClick={() => navigate(`/${endpoint}/${actor.id}`)}
              className={`br-list-row${actor.dormancy_state === 'dormant' ? ' br-list-row--dormant' : ''}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="br-list-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.display_name}</p>
                {actor.primary_email && <p className="br-list-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.primary_email}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                {actor.importance_tier === 'tier_1' && <span className="br-tier-dot" title="Tier 1" />}
                {actor.importance_tier && actor.importance_tier !== 'unclassified' && actor.importance_tier !== 'tier_1' && (
                  <span style={{ fontSize: '11px', color: 'var(--mgrey)' }}>
                    {actor.importance_tier.replace('_', ' ')}
                  </span>
                )}
                {actor.reliability_profile && GRADE_STYLES[actor.reliability_profile] && (
                  <span style={{
                    ...GRADE_STYLES[actor.reliability_profile],
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', padding: '2px 7px', borderRadius: '2px',
                  }}>
                    {actor.reliability_profile}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
