import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const GRADE_COLOUR = {
  bedrock:'var(--bedrock)', rock:'var(--rock)', sand:'var(--sand)',
  mud:'var(--mud)', fog:'var(--fog)',
}
const CONF_LABEL  = { high:'HIGH', medium:'MED', low:'LOW' }
const CONF_COLOUR = { high:'var(--bedrock)', medium:'var(--sand)', low:'var(--fog)' }

const PROMOTE_TYPES = [
  'claim','commitment','admission','denial','action',
  'silence','position','affiliation_change','communication',
  'signal','meeting',
]

function SignalRow({ signal, onAccept, onDismiss, onSnooze, onFlagReview, onPromote }) {
  const [editing,      setEditing]      = useState(false)
  const [editVal,      setEditVal]      = useState(signal.proposed_value)
  const [showSnooze,   setShowSnooze]   = useState(false)
  const [showPromote,  setShowPromote]  = useState(false)
  const [promoteType,  setPromoteType]  = useState('claim')

  const isFlag    = signal.signal_type === 'flag'
  const isField   = signal.signal_type === 'field_value'
  const isNews    = signal.signal_type === 'news_item'
  const isAutoApp = signal.status === 'auto_applied'
  const isFlagged = signal.team_flagged

  const rowBg = isFlagged
    ? 'rgba(100,160,255,0.07)'
    : isFlag
      ? 'rgba(255,180,0,0.08)'
      : isAutoApp
        ? 'rgba(201,168,76,0.04)'
        : 'var(--s1)'

  const leftBorder = isFlagged
    ? '#6490ff'
    : isFlag
      ? '#ffb400'
      : GRADE_COLOUR[signal.reliability_grade] ?? 'var(--rule)'

  return (
    <div style={{
      background: rowBg,
      border: `1px solid ${isFlagged ? 'rgba(100,160,255,0.25)' : isFlag ? 'rgba(255,180,0,0.3)' : 'var(--rule)'}`,
      borderLeft: `3px solid ${leftBorder}`,
      padding: '14px 16px',
      marginBottom: '8px',
    }}>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px', flexWrap:'wrap' }}>
        <span style={{
          fontSize:'9px', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
          background: isFlag ? '#ffb400' : (GRADE_COLOUR[signal.reliability_grade] ? `${GRADE_COLOUR[signal.reliability_grade]}22` : 'var(--s3)'),
          color: isFlag ? 'var(--dnavy)' : (GRADE_COLOUR[signal.reliability_grade] ?? 'var(--mgrey)'),
          padding:'2px 6px', borderRadius:'2px',
        }}>
          {signal.signal_type.replace('_',' ')}
        </span>
        <span style={{ fontSize:'10px', color: GRADE_COLOUR[signal.reliability_grade] ?? 'var(--mgrey)' }}>
          {signal.reliability_grade}
        </span>
        <span style={{ fontSize:'10px', color: CONF_COLOUR[signal.confidence] ?? 'var(--mgrey)', letterSpacing:'0.06em' }}>
          {CONF_LABEL[signal.confidence] ?? signal.confidence}
        </span>
        {isFlagged && (
          <span style={{ fontSize:'9px', fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase',
            color:'#6490ff', background:'rgba(100,160,255,0.12)', padding:'2px 6px', borderRadius:'2px' }}>
            Team review
          </span>
        )}
        <span style={{ fontSize:'10px', color:'var(--mgrey)', marginLeft:'auto' }}>
          {signal.source_label}
        </span>
        {isAutoApp && (
          <span style={{ fontSize:'10px', color:'var(--mgrey)', fontStyle:'italic' }}>Auto-applied</span>
        )}
      </div>

      {/* Content */}
      {isField && (
        <div>
          <span style={{ fontSize:'9px', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gold)' }}>
            {signal.field_name?.replace('_',' ')}
          </span>
          {editing ? (
            <textarea
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              style={{ display:'block', width:'100%', marginTop:'6px', padding:'8px', background:'var(--s3)',
                border:'1px solid var(--b-active)', color:'var(--white)', fontSize:'13px',
                fontFamily:'var(--font-sans)', resize:'vertical', minHeight:'60px', borderRadius:'2px' }}
            />
          ) : (
            <p style={{ fontSize:'13px', color:'var(--white)', marginTop:'4px', lineHeight:'1.5' }}>
              {signal.proposed_value}
            </p>
          )}
        </div>
      )}

      {isNews && (
        <div>
          <p style={{ fontSize:'13px', color:'var(--white)', lineHeight:'1.5', marginBottom:'2px' }}>
            {signal.proposed_value}
          </p>
          {signal.source_url && (
            <a href={signal.source_url} target="_blank" rel="noreferrer"
              style={{ fontSize:'11px', color:'var(--gold)', textDecoration:'none' }}>
              View source →
            </a>
          )}
        </div>
      )}

      {isFlag && (
        <p style={{ fontSize:'13px', color:'#ffb400', lineHeight:'1.5', fontWeight:500 }}>
          {signal.proposed_value}
        </p>
      )}

      {/* Actions */}
      {!isAutoApp && signal.status === 'pending' && (
        <div style={{ marginTop:'12px' }}>
          {editing ? (
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <button onClick={() => onAccept(signal.id, editVal)} className="br-btn" style={{ fontSize:'11px', padding:'4px 12px' }}>
                Accept edit →
              </button>
              <button onClick={() => setEditing(false)} className="br-btn-ghost" style={{ fontSize:'11px' }}>
                Cancel
              </button>
            </div>
          ) : showPromote ? (
            <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
              <select
                value={promoteType}
                onChange={e => setPromoteType(e.target.value)}
                style={{ fontSize:'11px', padding:'4px 8px', background:'var(--s3)', border:'1px solid var(--rule)',
                  color:'var(--white)', borderRadius:'2px', cursor:'pointer' }}
              >
                {PROMOTE_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace('_',' ')}</option>
                ))}
              </select>
              <button onClick={() => { onPromote(signal.id, promoteType); setShowPromote(false) }}
                className="br-btn" style={{ fontSize:'11px', padding:'4px 12px' }}>
                Promote →
              </button>
              <button onClick={() => setShowPromote(false)} className="br-btn-ghost" style={{ fontSize:'11px' }}>
                Cancel
              </button>
            </div>
          ) : showSnooze ? (
            <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:'10px', color:'var(--mgrey)' }}>Snooze:</span>
              {[1, 3, 7, 14].map(d => (
                <button key={d} onClick={() => { onSnooze(signal.id, d); setShowSnooze(false) }}
                  className="br-btn-ghost" style={{ fontSize:'10px', padding:'3px 8px' }}>
                  {d}d
                </button>
              ))}
              <button onClick={() => setShowSnooze(false)} className="br-btn-ghost"
                style={{ fontSize:'10px', color:'var(--mgrey)' }}>
                ×
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
              <button onClick={() => onAccept(signal.id)} className="br-btn" style={{ fontSize:'11px', padding:'4px 12px' }}>
                Accept →
              </button>
              {isField && (
                <button onClick={() => setEditing(true)} className="br-btn-ghost" style={{ fontSize:'11px' }}>
                  Edit
                </button>
              )}
              {isNews && (
                <button onClick={() => setShowPromote(true)} className="br-btn-ghost" style={{ fontSize:'11px' }}>
                  Promote
                </button>
              )}
              <button onClick={() => onDismiss(signal.id, 0)} className="br-btn-ghost" style={{ fontSize:'11px' }}>
                Dismiss
              </button>
              <button onClick={() => onDismiss(signal.id, 30)} className="br-btn-ghost"
                style={{ fontSize:'10px', color:'var(--mgrey)' }}>
                Suppress 30d
              </button>
              <button onClick={() => setShowSnooze(true)} className="br-btn-ghost"
                style={{ fontSize:'10px', color:'var(--mgrey)' }}>
                Snooze
              </button>
              {!isFlagged && (
                <button onClick={() => onFlagReview(signal.id)} className="br-btn-ghost"
                  style={{ fontSize:'10px', color:'#6490ff' }}>
                  Flag for team
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SignalPanel({ actorId }) {
  const qc = useQueryClient()
  const [collapsed, setCollapsed] = useState(false)

  const { data: signals, isLoading } = useQuery({
    queryKey: ['actor-signals', actorId],
    queryFn: () => api.get(`/actors/${actorId}/signals`).then(r => r.data.data),
  })

  const accept = useMutation({
    mutationFn: ({ id, value }) => value !== undefined
      ? api.post(`/signals/${id}/accept-edit`, { proposed_value: value })
      : api.post(`/signals/${id}/accept`),
    onSuccess: () => {
      qc.invalidateQueries(['actor-signals', actorId])
      qc.invalidateQueries(['events', actorId])
    },
  })

  const dismiss = useMutation({
    mutationFn: ({ id, days }) => api.post(`/signals/${id}/dismiss`, { suppress_source_days: days }),
    onSuccess: () => qc.invalidateQueries(['actor-signals', actorId]),
  })

  const snooze = useMutation({
    mutationFn: ({ id, days }) => api.post(`/signals/${id}/snooze`, { days }),
    onSuccess: () => qc.invalidateQueries(['actor-signals', actorId]),
  })

  const flagReview = useMutation({
    mutationFn: ({ id }) => api.post(`/signals/${id}/flag-review`),
    onSuccess: () => qc.invalidateQueries(['actor-signals', actorId]),
  })

  const promote = useMutation({
    mutationFn: ({ id, event_type }) => api.post(`/signals/${id}/promote`, { event_type }),
    onSuccess: () => {
      qc.invalidateQueries(['actor-signals', actorId])
      qc.invalidateQueries(['events', actorId])
    },
  })

  if (isLoading || !signals?.length) return null

  const pending = signals.filter(s => s.status === 'pending')
  if (pending.length === 0) return null

  return (
    <div style={{ marginBottom:'24px', paddingBottom:'24px', borderBottom:'1px solid var(--rule)' }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom: collapsed ? 0 : '16px',
          background:'none', border:'none', cursor:'pointer', width:'100%', padding:0 }}
      >
        <hr className="br-rule-gold" style={{ flex:'0 0 20px', border:'none' }} />
        <span className="br-text-label" style={{ color:'var(--gold)' }}>
          Pending Signals ({pending.length})
        </span>
        <span style={{ fontSize:'10px', color:'var(--mgrey)', marginLeft:'auto' }}>
          {collapsed ? '▸ Show' : '▾ Hide'}
        </span>
      </button>

      {!collapsed && (
        <div>
          {pending.map(signal => (
            <SignalRow
              key={signal.id}
              signal={signal}
              onAccept={(id, value) => accept.mutate({ id, value })}
              onDismiss={(id, days) => dismiss.mutate({ id, days })}
              onSnooze={(id, days) => snooze.mutate({ id, days })}
              onFlagReview={(id) => flagReview.mutate({ id })}
              onPromote={(id, event_type) => promote.mutate({ id, event_type })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
