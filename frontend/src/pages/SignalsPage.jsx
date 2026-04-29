// BD-306 — SignalsPage redesign
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const PROMOTE_TYPES = [
  'claim', 'commitment', 'admission', 'action', 'signal', 'meeting', 'operator_note',
]

const EVENT_TYPE_PILLS = ['All', 'claim', 'commitment', 'admission', 'action', 'signal', 'meeting', 'operator_note']

// ─── Signal Detail (right panel) ────────────────────────────────────────────

function SignalDetail({ signal, onAccept, onDismiss, onSnooze, onFlagReview, onPromote }) {
  const [editing,     setEditing]     = useState(false)
  const [editVal,     setEditVal]     = useState(signal?.proposed_value ?? '')
  const [showSnooze,  setShowSnooze]  = useState(false)
  const [showPromote, setShowPromote] = useState(false)
  const [promoteType, setPromoteType] = useState('claim')

  if (!signal) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <p className="empty-state__text">Select a signal to review</p>
      </div>
    )
  }

  const isNews    = signal.signal_type === 'news_item'
  const isFlagged = signal.team_flagged

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      {/* Type / meta row */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span className="badge badge--navy" style={{ textTransform: 'capitalize' }}>
          {signal.signal_type?.replace(/_/g, ' ')}
        </span>
        {isFlagged && (
          <span className="badge" style={{ background: 'var(--color-navy-light)', color: 'var(--color-navy)' }}>
            Team review
          </span>
        )}
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>
          {signal.confidence} confidence
        </span>
      </div>

      {/* Contact */}
      <div style={{ marginBottom: '12px' }}>
        <p className="form-label">Contact</p>
        <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginTop: '4px' }}>
          {signal.actor_name ?? signal.actor_id}
        </p>
      </div>

      {/* Source */}
      <div style={{ marginBottom: '12px' }}>
        <p className="form-label">Source</p>
        <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginTop: '4px' }}>
          {signal.source_label}
        </p>
        {signal.source_url && (
          <a
            href={signal.source_url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '12px', color: 'var(--color-navy)', textDecoration: 'none' }}
          >
            {signal.source_url.length > 60 ? signal.source_url.slice(0, 60) + '…' : signal.source_url}
          </a>
        )}
      </div>

      {/* Field name */}
      {signal.field_name && (
        <div style={{ marginBottom: '12px' }}>
          <p className="form-label">Field</p>
          <p style={{ fontSize: '13px', color: 'var(--color-gold)', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {signal.field_name.replace(/_/g, ' ')}
          </p>
        </div>
      )}

      {/* Proposed value */}
      <div style={{ marginBottom: '20px' }}>
        <p className="form-label">Proposed value</p>
        {editing ? (
          <textarea
            className="textarea"
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            style={{ marginTop: '6px', width: '100%', minHeight: '80px' }}
          />
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.6', marginTop: '6px', padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
            {signal.proposed_value}
          </p>
        )}
      </div>

      {/* Actions */}
      {signal.status === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {editing ? (
            <>
              <button
                className="btn"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { onAccept(signal.id, editVal); setEditing(false) }}
              >
                Accept edited value
              </button>
              <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : showPromote ? (
            <>
              <select
                className="select"
                value={promoteType}
                onChange={e => setPromoteType(e.target.value)}
              >
                {PROMOTE_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <button
                className="btn"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { onPromote(signal.id, promoteType); setShowPromote(false) }}
              >
                Promote as {promoteType.replace(/_/g, ' ')}
              </button>
              <button className="btn-ghost" onClick={() => setShowPromote(false)}>Cancel</button>
            </>
          ) : showSnooze ? (
            <>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Snooze for:</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[1, 3, 7, 14].map(d => (
                  <button
                    key={d}
                    className="btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => { onSnooze(signal.id, d); setShowSnooze(false) }}
                  >
                    {d} day{d > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
              <button className="btn-ghost" onClick={() => setShowSnooze(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button
                className="btn"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onAccept(signal.id)}
              >
                Accept
              </button>
              {signal.signal_type === 'field_value' && (
                <button
                  className="btn-ghost"
                  onClick={() => { setEditVal(signal.proposed_value); setEditing(true) }}
                >
                  Edit and accept
                </button>
              )}
              {isNews && (
                <button className="btn-ghost" onClick={() => setShowPromote(true)}>
                  Promote to event…
                </button>
              )}
              <button className="btn-ghost" onClick={() => onDismiss(signal.id, 0)}>Dismiss</button>
              <button className="btn-ghost" onClick={() => setShowSnooze(true)}>Snooze…</button>
              {!isFlagged && (
                <button
                  className="btn-ghost"
                  style={{ color: 'var(--color-navy)' }}
                  onClick={() => onFlagReview(signal.id)}
                >
                  Flag for team review
                </button>
              )}
              <button
                className="btn-ghost"
                style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}
                onClick={() => onDismiss(signal.id, 30)}
              >
                Suppress this source for 30 days
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SignalsPage() {
  const qc = useQueryClient()
  const [selectedSource,  setSelectedSource]  = useState(null)
  const [selectedSignal,  setSelectedSignal]  = useState(null)
  const [checked,         setChecked]         = useState([])
  const [typeFilter,      setTypeFilter]      = useState('All')
  const [actorSearch,     setActorSearch]     = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['signals'],
    queryFn: () => api.get('/signals', { params: { per_page: 200 } }).then(r => r.data),
    refetchInterval: 30000,
  })

  const signals  = data?.data ?? []
  const pending  = signals.filter(s => s.status === 'pending')

  const filtered = pending.filter(s => {
    const typeOk  = typeFilter === 'All' || s.signal_type === typeFilter
    const actorOk = !actorSearch.trim() ||
      (s.actor_name ?? '').toLowerCase().includes(actorSearch.toLowerCase())
    const srcOk   = !selectedSource || s.source_id === selectedSource
    return typeOk && actorOk && srcOk
  })

  const accept = useMutation({
    mutationFn: ({ id, value }) => value !== undefined
      ? api.post(`/signals/${id}/accept-edit`, { proposed_value: value })
      : api.post(`/signals/${id}/accept`),
    onSuccess: () => { qc.invalidateQueries(['signals']); setSelectedSignal(null) },
  })

  const dismiss = useMutation({
    mutationFn: ({ id, days }) => api.post(`/signals/${id}/dismiss`, { suppress_source_days: days }),
    onSuccess: () => { qc.invalidateQueries(['signals']); setSelectedSignal(null) },
  })

  const snooze = useMutation({
    mutationFn: ({ id, days }) => api.post(`/signals/${id}/snooze`, { days }),
    onSuccess: () => { qc.invalidateQueries(['signals']); setSelectedSignal(null) },
  })

  const flagReview = useMutation({
    mutationFn: ({ id }) => api.post(`/signals/${id}/flag-review`),
    onSuccess: () => qc.invalidateQueries(['signals']),
  })

  const promote = useMutation({
    mutationFn: ({ id, event_type }) => api.post(`/signals/${id}/promote`, { event_type }),
    onSuccess: () => { qc.invalidateQueries(['signals']); setSelectedSignal(null) },
  })

  const bulkAccept = useMutation({
    mutationFn: () => api.post('/signals/bulk-accept', {
      signal_ids: checked.length ? checked : undefined,
      confidence: checked.length ? undefined : 'high',
    }),
    onSuccess: () => { qc.invalidateQueries(['signals']); setChecked([]) },
  })

  const bulkDismiss = useMutation({
    mutationFn: () => api.post('/signals/bulk-dismiss', {
      signal_ids: checked.length ? checked : undefined,
      source_id:  (!checked.length && selectedSource) ? selectedSource : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries(['signals']); setChecked([]) },
  })

  const toggleCheck = (id) =>
    setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Signal Queue</h1>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        {EVENT_TYPE_PILLS.map(t => (
          <button
            key={t}
            className={`filter-pill${typeFilter === t ? ' filter-pill--active' : ''}`}
            onClick={() => setTypeFilter(t)}
          >
            {t === 'All' ? 'All' : t.replace(/_/g, ' ')}
          </button>
        ))}
        <input
          className="input"
          placeholder="Actor name…"
          value={actorSearch}
          onChange={e => setActorSearch(e.target.value)}
          style={{ maxWidth: '220px', marginLeft: '8px' }}
        />
        <span className="badge badge--navy" style={{ marginLeft: 'auto' }}>
          {filtered.length}
        </span>
      </div>

      {/* Bulk bar */}
      {checked.length > 0 && (
        <div className="bulk-bar">
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {checked.length} selected
          </span>
          <button
            className="btn"
            disabled={bulkAccept.isPending}
            onClick={() => bulkAccept.mutate()}
          >
            Accept selected
          </button>
          <button
            className="btn-outline"
            disabled={bulkDismiss.isPending}
            onClick={() => bulkDismiss.mutate()}
          >
            Dismiss selected
          </button>
        </div>
      )}

      {/* Body: list + detail */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Signal list */}
        <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid var(--color-border)' }}>
          {isLoading && (
            <div className="state-loading" style={{ padding: '32px', textAlign: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading signals…</span>
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="empty-state">
              <p className="empty-state__text">No signals in queue.</p>
            </div>
          )}

          {filtered.map(signal => {
            const isChecked  = checked.includes(signal.id)
            const isSelected = selectedSignal?.id === signal.id
            return (
              <div
                key={signal.id}
                className="list-row"
                style={{
                  background: isSelected ? 'var(--color-surface)' : undefined,
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedSignal(signal)}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  style={{ flexShrink: 0, accentColor: 'var(--color-navy)', marginRight: '10px' }}
                  onClick={e => e.stopPropagation()}
                  onChange={e => { e.stopPropagation(); toggleCheck(signal.id) }}
                />

                {/* Main content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      className="truncate-2"
                      style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-text-primary)', flex: 1 }}
                    >
                      {signal.proposed_value}
                    </span>
                    <span className="badge badge--navy" style={{ flexShrink: 0, textTransform: 'capitalize' }}>
                      {signal.signal_type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {signal.source_label ?? signal.source_id}
                  </p>
                </div>

                {/* Timestamp */}
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', flexShrink: 0, marginLeft: '12px' }}>
                  {new Date(signal.created_at).toLocaleDateString()}
                </span>

                {/* Row hover actions */}
                <div className="row-actions">
                  <button
                    className="btn-row-action"
                    style={{ color: 'var(--color-positive)' }}
                    onClick={e => { e.stopPropagation(); accept.mutate({ id: signal.id }) }}
                  >
                    Accept
                  </button>
                  <button
                    className="btn-row-action"
                    onClick={e => { e.stopPropagation(); dismiss.mutate({ id: signal.id, days: 0 }) }}
                  >
                    Dismiss
                  </button>
                  <button
                    className="btn-row-action"
                    onClick={e => { e.stopPropagation(); snooze.mutate({ id: signal.id, days: 3 }) }}
                  >
                    Snooze
                  </button>
                  <button
                    className="btn-row-action"
                    style={{ color: 'var(--color-gold)' }}
                    onClick={e => { e.stopPropagation(); setSelectedSignal(signal) }}
                  >
                    Promote
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Signal detail */}
        <div style={{ width: '320px', flexShrink: 0 }}>
          <SignalDetail
            signal={selectedSignal}
            onAccept={(id, value) => accept.mutate({ id, value })}
            onDismiss={(id, days) => dismiss.mutate({ id, days })}
            onSnooze={(id, days) => snooze.mutate({ id, days })}
            onFlagReview={(id) => flagReview.mutate({ id })}
            onPromote={(id, event_type) => promote.mutate({ id, event_type })}
          />
        </div>
      </div>
    </div>
  )
}
