import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import RelationshipForm from './RelationshipForm'
import RelationshipGraph from './RelationshipGraph'

const POSTURE_COLOUR = { ally:'var(--bedrock)', neutral:'rgba(245,244,240,0.7)', adversarial:'var(--crimson)', unknown:'var(--mgrey)' }
const STANCE_COLOUR  = { party_line:'rgba(245,244,240,0.7)', independent:'var(--rock)', divergent:'var(--divergent-text)', unknown:'var(--mgrey)' }

const ALL_TYPES = 'all'

function NetworkFinder({ actorId }) {
  const [compareInput, setCompareInput] = useState('')
  const [compareId, setCompareId]       = useState('')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['network', actorId, compareId],
    queryFn: () => {
      const params = compareId ? { compare: compareId } : {}
      return api.get(`/actors/${actorId}/network`, { params }).then(r => r.data.data)
    },
    staleTime: 30000,
  })

  const shared    = data?.shared ?? null
  const connected = data?.connected ?? []

  return (
    <div style={{ marginTop:'24px', paddingTop:'20px', borderTop:'1px solid var(--rule)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <span className="br-text-label">Network Finder</span>
        <span style={{ fontSize:'11px', color:'var(--mgrey)' }}>{connected.length} connection{connected.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Compare input */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
        <input
          value={compareInput}
          onChange={e => setCompareInput(e.target.value)}
          placeholder="Paste actor ID to find shared connections…"
          style={{
            flex:1, background:'var(--s0)', border:'1px solid var(--rule)', borderRadius:'2px',
            color:'var(--br-bone-white)', fontSize:'12px', padding:'6px 10px',
            fontFamily:'var(--font-mono)',
          }}
        />
        <button
          onClick={() => setCompareId(compareInput.trim())}
          disabled={!compareInput.trim()}
          className="br-btn-outline"
          style={{ fontSize:'12px' }}
        >
          Compare →
        </button>
        {compareId && (
          <button
            onClick={() => { setCompareId(''); setCompareInput('') }}
            className="br-btn-ghost"
            style={{ fontSize:'12px' }}
          >
            Clear
          </button>
        )}
      </div>

      {(isLoading || isFetching) && (
        <p style={{ fontSize:'12px', color:'var(--mgrey)' }}>Loading…</p>
      )}

      {/* Shared connections result */}
      {!isFetching && compareId && shared !== null && (
        <div style={{ marginBottom:'12px' }}>
          <p style={{ fontSize:'11px', color:'var(--gold)', fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:'8px' }}>
            {shared.length} shared connection{shared.length !== 1 ? 's' : ''}
          </p>
          {shared.length === 0 && (
            <p style={{ fontSize:'12px', color:'var(--mgrey)' }}>No common connections found.</p>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {shared.map((c, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'2px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'var(--gold)', flexShrink:0 }} />
                <span style={{ fontSize:'13px', color:'var(--br-bone-white)', fontFamily:'var(--font-serif)' }}>
                  {c.actor.display_name}
                </span>
                <span style={{ fontSize:'10px', color:'var(--mgrey)', marginLeft:'auto' }}>
                  {c.actor.actor_type}
                </span>
                <span style={{ fontSize:'10px', color:'var(--mgrey)', letterSpacing:'0.08em' }}>
                  {c.relationship_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All connections (no compare) */}
      {!isFetching && !compareId && connected.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          {connected.map((c, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 10px', background:'var(--s1)', border:'1px solid var(--rule)', borderRadius:'2px' }}>
              <span style={{ fontSize:'12px', color:'var(--br-bone-white)' }}>{c.actor.display_name}</span>
              <span style={{ fontSize:'10px', color:'var(--mgrey)', marginLeft:'auto' }}>{c.actor.actor_type}</span>
              <span style={{ fontSize:'10px', color:'var(--mgrey)', opacity:0.6 }}>{c.relationship_type}</span>
            </div>
          ))}
        </div>
      )}

      {!isFetching && connected.length === 0 && (
        <p style={{ fontSize:'12px', color:'var(--mgrey)' }}>No network connections found.</p>
      )}
    </div>
  )
}

export default function RelationshipsTab({ actorId, actor }) {
  const [showForm, setShowForm]     = useState(false)
  const [view, setView]             = useState('list')
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES)

  const { data, isLoading } = useQuery({
    queryKey: ['relationships', actorId],
    queryFn: () => api.get(`/actors/${actorId}/relationships`).then(r => r.data.data),
  })

  const relationshipTypes = data
    ? [...new Set(data.map(r => r.relationship_type).filter(Boolean))].sort()
    : []

  const filtered = data?.filter(r =>
    typeFilter === ALL_TYPES || r.relationship_type === typeFilter
  ) ?? []

  const tabBtn = (label, active, onClick) => (
    <button
      onClick={onClick}
      style={{
        fontSize:'11px', padding:'4px 10px', border:'1px solid var(--rule)',
        background: active ? 'var(--s3)' : 'transparent',
        color: active ? 'var(--br-bone-white)' : 'var(--mgrey)',
        cursor:'pointer', borderRadius:'2px',
      }}
    >
      {label}
    </button>
  )

  return (
    <div>
      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span className="br-text-label">{data?.length ?? 0} relationship{data?.length !== 1 ? 's' : ''}</span>
          <div style={{ display:'flex', gap:'4px' }}>
            {tabBtn('List', view === 'list', () => setView('list'))}
            {tabBtn('Graph', view === 'graph', () => setView('graph'))}
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {relationshipTypes.length > 0 && (
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{
                fontSize:'11px', padding:'4px 8px', background:'var(--s1)',
                color:'var(--br-bone-white)', border:'1px solid var(--rule)',
                borderRadius:'2px', cursor:'pointer',
              }}
            >
              <option value={ALL_TYPES}>All types</option>
              {relationshipTypes.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          )}
          <button onClick={() => setShowForm(true)} className="br-arrow-link" style={{ fontSize:'12px' }}>Add</button>
        </div>
      </div>

      {isLoading && <p style={{ color:'var(--mgrey)', fontSize:'13px' }}>Loading…</p>}

      {/* Graph view */}
      {!isLoading && view === 'graph' && (
        <RelationshipGraph
          relationships={typeFilter === ALL_TYPES ? data : filtered}
          centralActor={actor}
        />
      )}

      {/* List view */}
      {!isLoading && view === 'list' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {filtered.map(rel => {
            const other = rel.source_actor_id === actorId ? rel.target_actor : rel.source_actor
            return (
              <div key={rel.id} style={{ padding:'12px 16px', background:'var(--s1)', border:'1px solid var(--rule)', borderRadius:'2px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                  <span style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--gold)', padding:'2px 6px', background:'var(--s3)', border:'1px solid var(--rule)' }}>
                    {rel.relationship_type}
                  </span>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    {rel.direction && (
                      <span style={{ fontSize:'10px', color:'var(--mgrey)', opacity:0.6 }}>{rel.direction}</span>
                    )}
                    <span style={{ fontSize:'11px', color:'var(--mgrey)' }}>{rel.status}</span>
                  </div>
                </div>

                <p style={{ fontSize:'14px', fontFamily:'var(--font-serif)', color:'var(--white)', fontWeight:400, marginBottom:'2px' }}>
                  {other?.display_name ?? (rel.source_actor_id === actorId ? rel.target_actor_id : rel.source_actor_id)}
                </p>

                {other?.actor_type && (
                  <p style={{ fontSize:'11px', color:'var(--mgrey)', marginBottom:'4px' }}>
                    {other.actor_type}{other.reliability_profile ? ` · ${other.reliability_profile}` : ''}
                  </p>
                )}

                {(rel.stance || rel.posture_toward_operator) && (
                  <div style={{ display:'flex', gap:'16px', marginTop:'8px', flexWrap:'wrap' }}>
                    {rel.stance && (
                      <span style={{ fontSize:'12px', color: STANCE_COLOUR[rel.stance] ?? 'var(--mgrey)' }}>
                        stance: {rel.stance.replace('_',' ')}
                      </span>
                    )}
                    {rel.posture_toward_operator && (
                      <span style={{ fontSize:'12px', color: POSTURE_COLOUR[rel.posture_toward_operator] ?? 'var(--mgrey)' }}>
                        posture: {rel.posture_toward_operator}
                      </span>
                    )}
                    {rel.leverage_read && rel.leverage_read !== 'none' && (
                      <span style={{ fontSize:'12px', color:'rgba(201,168,76,0.35)' }}>leverage: {rel.leverage_read}</span>
                    )}
                  </div>
                )}

                {rel.notes && (
                  <p style={{ fontSize:'12px', color:'var(--mgrey)', marginTop:'8px', lineHeight:'1.5' }}>{rel.notes}</p>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p style={{ color:'var(--mgrey)', fontSize:'13px' }}>
              {data?.length > 0 ? 'No relationships match this filter.' : 'No relationships recorded.'}
            </p>
          )}
        </div>
      )}

      {/* BD-53: Network Finder */}
      <NetworkFinder actorId={actorId} />

      {showForm && <RelationshipForm actorId={actorId} onClose={() => setShowForm(false)} />}
    </div>
  )
}
