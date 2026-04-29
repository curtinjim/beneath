// BD-310 — MailPage redesign
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

// ─── ThreadView inline (previously a separate component) ─────────────────────
// All original logic preserved, styled with design tokens.

const THREAD_EVENT_TYPES = ['communication', 'claim', 'commitment', 'action', 'position', 'signal', 'meeting', 'operator_note']
const THREAD_GRADES      = ['bedrock', 'rock', 'sand', 'mud', 'fog']

function MessageCard({ message }) {
  const [expanded, setExpanded] = useState(false)
  const body    = message.body_text || (message.body_html ? 'HTML content' : '')
  const preview = body.slice(0, 160)

  return (
    <div style={{
      padding: '16px 20px',
      borderBottom: '1px solid var(--color-border)',
      background: message.is_outbound ? 'var(--color-surface)' : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {message.from_name || message.from_email}
          </span>
          {message.from_name && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '6px' }}>
              {message.from_email}
            </span>
          )}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
          {new Date(message.sent_at).toLocaleString()}
        </span>
      </div>
      <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
        {expanded ? body : preview}
        {body.length > 160 && (
          <button
            className="btn-ghost"
            style={{ display: 'block', marginTop: '6px', fontSize: '12px' }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
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
    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <label className="form-label">Event type</label>
        <select
          className="select"
          value={eventType}
          onChange={e => setEventType(e.target.value)}
          style={{ width: '100%', marginTop: '4px' }}
        >
          {THREAD_EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">Reliability grade</label>
        <select
          className="select"
          value={grade}
          onChange={e => setGrade(e.target.value)}
          style={{ width: '100%', marginTop: '4px' }}
        >
          {THREAD_GRADES.map(g => <option key={g}>{g}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Crossing…' : 'Cross boundary'}
        </button>
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function ContactSidebar({ thread, onCross }) {
  const [showCrossForm, setShowCrossForm] = useState(null)

  if (!thread.actor_links?.length) {
    return (
      <div style={{ padding: '16px' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Contacts
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>No contacts matched.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px' }}>
      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Matched Contacts
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {thread.actor_links.map(link => (
          <div key={link.id} style={{ background: 'var(--color-surface)', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                {link.actor?.display_name}
              </span>
              {link.boundary_crossed && (
                <span className="badge badge--navy">Crossed</span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              {link.match_confidence} match · {link.matched_email}
            </p>
            {!link.boundary_crossed && showCrossForm !== link.actor_id && (
              <button
                className="btn-outline"
                style={{ fontSize: '12px', width: '100%' }}
                onClick={() => setShowCrossForm(link.actor_id)}
              >
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

function ThreadDetailView({ threadId }) {
  const qc = useQueryClient()

  const { data: thread, isLoading } = useQuery({
    queryKey: ['mail-thread', threadId],
    queryFn: () => api.get(`/mail/threads/${threadId}`).then(r => r.data.data),
  })

  if (isLoading) {
    return (
      <div className="state-loading" style={{ padding: '32px', textAlign: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading…</span>
      </div>
    )
  }
  if (!thread) {
    return (
      <div className="state-error" style={{ padding: '32px', textAlign: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-alert)' }}>Thread not found.</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Messages column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Thread header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-light)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
            {thread.subject || '(no subject)'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {thread.participants?.map(p => p.name || p.email).join(', ')}
          </p>
        </div>
        {/* Messages list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {thread.messages?.map(m => <MessageCard key={m.id} message={m} />)}
        </div>
      </div>

      {/* Contact sidebar */}
      <div style={{ width: '240px', flexShrink: 0, borderLeft: '1px solid var(--color-border)', overflowY: 'auto' }}>
        <ContactSidebar
          thread={thread}
          onCross={() => qc.invalidateQueries(['mail-thread', threadId])}
        />
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function MailPage() {
  const [selectedId,       setSelectedId]       = useState(null)
  const [search,           setSearch]           = useState('')
  const [activeAccount,    setActiveAccount]    = useState(null)

  const { data: accounts } = useQuery({
    queryKey: ['mail-accounts'],
    queryFn: () => api.get('/mail/accounts').then(r => r.data.data),
  })

  const { data: threads, isLoading } = useQuery({
    queryKey: ['mail-threads', search, activeAccount],
    queryFn: () => api.get('/mail/threads', {
      params: {
        search:     search || undefined,
        account_id: activeAccount || undefined,
      },
    }).then(r => r.data),
    enabled: (accounts?.length ?? 0) > 0,
  })

  const hasAccounts = (accounts?.length ?? 0) > 0

  return (
    <div className="mail-shell">

      {/* Thread list column */}
      <div className="mail-thread-list">

        {/* Page title + account pills */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <h1 className="page-title" style={{ marginBottom: '12px' }}>Mail</h1>

          {/* Connected account pills */}
          {hasAccounts && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              <button
                className={`filter-pill${activeAccount === null ? ' filter-pill--active' : ''}`}
                onClick={() => setActiveAccount(null)}
              >
                All
              </button>
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  className={`filter-pill${activeAccount === acc.id ? ' filter-pill--active' : ''}`}
                  onClick={() => setActiveAccount(acc.id)}
                >
                  {acc.email ?? acc.provider}
                </button>
              ))}
            </div>
          )}

          {/* Connect buttons */}
          {!hasAccounts && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <a href="/settings/mail/gmail" className="btn-ghost" style={{ fontSize: '13px', textDecoration: 'none' }}>
                Connect Gmail
              </a>
              <a href="/settings/mail/m365" className="btn-ghost" style={{ fontSize: '13px', textDecoration: 'none' }}>
                Connect M365
              </a>
            </div>
          )}

          {/* Search */}
          {hasAccounts && (
            <input
              className="input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search threads…"
              style={{ width: '100%' }}
            />
          )}
        </div>

        {/* Thread rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!hasAccounts && (
            <div className="empty-state">
              <p className="empty-state__text">No mail account connected.</p>
              <a href="/settings" style={{ fontSize: '13px', color: 'var(--color-navy)' }}>
                Connect in Settings
              </a>
            </div>
          )}

          {isLoading && (
            <div className="state-loading" style={{ padding: '24px', textAlign: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading…</span>
            </div>
          )}

          {threads?.data?.map(t => {
            const preview  = t.participants?.map(p => p.name || p.email).slice(0, 3).join(', ')
            const isActive = t.id === selectedId
            const isUnread = t.has_unread
            const isSignificant = t.significance_assessment === 'significant'
            const assessed  = t.significance_assessment != null

            return (
              <div
                key={t.id}
                className={`mail-thread-row${isActive ? ' active' : ''}`}
                style={{ minHeight: '40px' }}
                onClick={() => setSelectedId(t.id)}
              >
                <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: isUnread ? 500 : 400,
                      color: isUnread ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}
                  >
                    {t.subject || '(no subject)'}
                  </p>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                    {t.last_message_at ? new Date(t.last_message_at).toLocaleDateString() : ''}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                  {preview}
                </p>

                {assessed && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {isSignificant ? (
                      <span className="badge badge--navy">Significant</span>
                    ) : (
                      <span className="badge" style={{ background: 'var(--color-neutral-sm)', color: '#fff' }}>
                        No signals
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {threads?.data?.length === 0 && (
            <div className="empty-state">
              <p className="empty-state__text">No threads found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Thread detail */}
      <div className="mail-thread-detail">
        {selectedId ? (
          <ThreadDetailView threadId={selectedId} />
        ) : (
          <div className="empty-state" style={{ height: '100%' }}>
            <p className="empty-state__text">Select a thread</p>
          </div>
        )}
      </div>
    </div>
  )
}
