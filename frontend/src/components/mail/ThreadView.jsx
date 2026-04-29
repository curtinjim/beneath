import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'

const EVENT_TYPES = ['communication','claim','commitment','action','position','signal','meeting','operator_note']
const GRADES      = ['bedrock','rock','sand','mud','fog']

function MessageCard({ message }) {
  const [expanded, setExpanded] = useState(false)
  const body = message.body_text || (message.body_html ? 'HTML content' : '')
  const preview = body.slice(0, 160)

  return (
    <div style={{ padding:'16px', borderBottom:'1px solid var(--br-border-subtle)', background: message.is_outbound ? 'var(--s1)' : 'transparent' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'8px' }}>
        <div>
          <span style={{ fontSize:'13px', fontWeight:500, color:'var(--br-bone-white)' }}>
            {message.from_name || message.from_email}
          </span>
          {message.from_name && (
            <span style={{ fontSize:'12px', color:'var(--mgrey)', marginLeft:'6px' }}>{message.from_email}</span>
          )}
        </div>
        <span style={{ fontSize:'11px', color:'var(--mgrey)', flexShrink:0 }}>
          {new Date(message.sent_at).toLocaleString()}
        </span>
      </div>
      <div style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:'1.6', whiteSpace:'pre-wrap' }}>
        {expanded ? body : preview}
        {body.length > 160 && (
          <button onClick={() => setExpanded(!expanded)} className="br-btn-ghost" style={{ display:'block', marginTop:'6px', fontSize:'12px' }}>
            {expanded ? 'Show less' : 'Show more →'}
          </button>
        )}
      </div>
    </div>
  )
}

function ContactSidebar({ thread, onCross }) {
  const [showCrossForm, setShowCrossForm] = useState(null) // actorId

  if (!thread.actor_links?.length) {
    return (
      <div style={{ padding:'16px' }}>
        <p className="br-text-label" style={{ marginBottom:'8px' }}>Contacts</p>
        <p style={{ fontSize:'12px', color:'var(--mgrey)' }}>No contacts matched.</p>
      </div>
    )
  }

  return (
    <div style={{ padding:'16px' }}>
      <p className="br-text-label" style={{ marginBottom:'12px' }}>Matched Contacts</p>
      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        {thread.actor_links.map(link => (
          <div key={link.id} style={{ background:'var(--s3)', padding:'10px 12px', borderRadius:'2px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
              <span style={{ fontFamily:'var(--font-serif)', fontSize:'14px', color:'var(--br-bone-white)' }}>
                {link.actor?.display_name}
              </span>
              {link.boundary_crossed && (
                <span style={{ fontSize:'10px', color:'var(--gold)', letterSpacing:'0.08em' }}>CROSSED</span>
              )}
            </div>
            <p style={{ fontSize:'11px', color:'var(--mgrey)', marginBottom:'8px' }}>
              {link.match_confidence} match · {link.matched_email}
            </p>
            {!link.boundary_crossed && showCrossForm !== link.actor_id && (
              <button onClick={() => setShowCrossForm(link.actor_id)} className="br-arrow-link" style={{ fontSize:'11px' }}>
                Cross boundary
              </button>
            )}
            {showCrossForm === link.actor_id && (
              <CrossBoundaryForm
                threadId={thread.id}
                actorId={link.actor_id}
                onDone={() => { setShowCrossForm(null); onCross() }}
                onCancel={() => setShowCrossForm(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CrossBoundaryForm({ threadId, actorId, onDone, onCancel }) {
  const [eventType, setEventType] = useState('communication')
  const [grade, setGrade]         = useState('sand')

  const mutation = useMutation({
    mutationFn: () => api.post(`/mail/threads/${threadId}/cross-boundary`, {
      actor_id: actorId, event_type: eventType, reliability_grade: grade,
    }),
    onSuccess: onDone,
  })

  return (
    <div style={{ marginTop:'8px', display:'flex', flexDirection:'column', gap:'8px' }}>
      <div>
        <label className="br-input-label">Event type</label>
        <select value={eventType} onChange={e => setEventType(e.target.value)} className="br-input" style={{ fontSize:'12px' }}>
          {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="br-input-label">Reliability grade</label>
        <select value={grade} onChange={e => setGrade(e.target.value)} className="br-input" style={{ fontSize:'12px' }}>
          {GRADES.map(g => <option key={g}>{g}</option>)}
        </select>
      </div>
      <div style={{ display:'flex', gap:'8px' }}>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="br-btn" style={{ fontSize:'11px', padding:'5px 12px' }}>
          {mutation.isPending ? 'Crossing…' : 'Cross →'}
        </button>
        <button onClick={onCancel} className="br-btn-outline" style={{ fontSize:'11px', padding:'5px 10px' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function ThreadView({ threadId }) {
  const qc = useQueryClient()

  const { data: thread, isLoading } = useQuery({
    queryKey: ['mail-thread', threadId],
    queryFn: () => api.get(`/mail/threads/${threadId}`).then(r => r.data.data),
  })

  if (isLoading) return <div style={{ padding:'32px', color:'var(--mgrey)', fontSize:'13px' }}>Loading…</div>
  if (!thread)   return <div style={{ padding:'32px', color:'var(--crimson)', fontSize:'13px' }}>Thread not found.</div>

  return (
    <div style={{ display:'flex', height:'100%' }}>
      {/* Messages */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Thread header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--br-border-subtle)', background:'var(--s1)' }}>
          <h2 style={{ fontFamily:'var(--font-serif)', fontWeight:400, fontSize:'18px', color:'var(--br-bone-white)', marginBottom:'6px' }}>
            {thread.subject || '(no subject)'}
          </h2>
          <p style={{ fontSize:'12px', color:'var(--mgrey)' }}>
            {thread.participants?.map(p => p.name || p.email).join(', ')}
          </p>
        </div>
        {/* Messages list */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {thread.messages?.map(m => <MessageCard key={m.id} message={m} />)}
        </div>
      </div>

      {/* Contact sidebar */}
      <div style={{ width:'240px', flexShrink:0, borderLeft:'1px solid var(--br-border-subtle)', overflowY:'auto' }}>
        <ContactSidebar thread={thread} onCross={() => qc.invalidateQueries(['mail-thread', threadId])} />
      </div>
    </div>
  )
}
