import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export default function AuditLogPage() {
  const [page, setPage]               = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [filterInput, setFilterInput]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page, actionFilter],
    queryFn:  () => api.get('/audit-log', {
      params: { page, ...(actionFilter ? { action: actionFilter } : {}) },
    }).then(r => r.data),
    keepPreviousData: true,
    staleTime: 30000,
  })

  const entries  = data?.data ?? []
  const meta     = data?.meta ?? {}
  const lastPage = meta.last_page ?? 1

  function applyFilter() {
    setActionFilter(filterInput)
    setPage(1)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '960px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--br-bone-white)', fontWeight: 600, marginBottom: '6px' }}>
          Audit Log
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--mgrey)' }}>
          All recorded system actions for this tenant. Visible to Owner and Admin roles only.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          value={filterInput}
          onChange={e => setFilterInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') applyFilter() }}
          placeholder="Filter by action — press Enter…"
          style={{
            width: '280px', background: 'var(--s0)', border: '1px solid var(--rule)',
            borderRadius: '2px', color: 'var(--br-bone-white)', fontSize: '12px',
            padding: '6px 10px', fontFamily: 'var(--font-mono)',
          }}
        />
        <button onClick={applyFilter} className="br-btn-outline" style={{ fontSize: '12px' }}>
          Filter
        </button>
        {actionFilter && (
          <button
            onClick={() => { setActionFilter(''); setFilterInput(''); setPage(1) }}
            className="br-btn-ghost"
            style={{ fontSize: '11px' }}
          >
            Clear
          </button>
        )}
      </div>

      {isLoading && <p style={{ color: 'var(--mgrey)', fontSize: '13px' }}>Loading…</p>}

      {!isLoading && entries.length === 0 && (
        <p style={{ color: 'var(--mgrey)', fontSize: '13px' }}>No audit entries found.</p>
      )}

      {entries.length > 0 && (
        <div>
          {entries.map(entry => (
            <div
              key={entry.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '170px 200px 1fr',
                gap: '12px',
                padding: '9px 0',
                borderBottom: '1px solid var(--br-border-subtle)',
                alignItems: 'start',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--mgrey)', fontFamily: 'var(--font-mono)' }}>
                {new Date(entry.created_at).toLocaleString()}
              </span>

              <div>
                <span style={{
                  fontSize: '11px', fontWeight: 700, color: 'var(--rock)',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {entry.action}
                </span>
                {entry.user_name && (
                  <p style={{ fontSize: '11px', color: 'var(--mgrey)', marginTop: '2px' }}>
                    {entry.user_name}
                  </p>
                )}
              </div>

              <div>
                {entry.entity_type && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {entry.entity_type}
                    {entry.entity_id ? ` · ${String(entry.entity_id).slice(0, 10)}…` : ''}
                  </span>
                )}
                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--mgrey)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {JSON.stringify(entry.metadata).slice(0, 140)}
                  </p>
                )}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="br-btn-outline"
              style={{ fontSize: '12px' }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: '12px', color: 'var(--mgrey)' }}>
              Page {meta.current_page ?? page} of {lastPage}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= lastPage}
              className="br-btn-outline"
              style={{ fontSize: '12px' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
