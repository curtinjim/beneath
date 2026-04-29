import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

const SOURCE_LABEL = {
  signal: 'Harvesting Signal',
  source: 'Ingested Document',
  manual: 'Manual Entry',
  ai:     'AI Extraction',
  import: 'Data Import',
}

export default function EventProvenanceSlider({ eventId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['provenance', eventId],
    queryFn:  () => api.get(`/events/${eventId}/provenance`).then(r => r.data.data),
    enabled:  !!eventId,
    staleTime: 60000,
  })

  const event  = data?.event
  const source = data?.source
  const audit  = data?.audit_entries ?? []

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900 }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px',
        background: 'var(--s1)', borderLeft: '1px solid var(--rule)',
        zIndex: 901, overflowY: 'auto', padding: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Evidentiary Chain
          </span>
          <button onClick={onClose} className="br-btn-ghost" style={{ fontSize: '18px', lineHeight: 1, padding: '0 6px' }}>
            ×
          </button>
        </div>

        {isLoading && <p style={{ color: 'var(--mgrey)', fontSize: '13px' }}>Loading…</p>}

        {event && (
          <div>
            {/* Event */}
            <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--s0)', border: '1px solid var(--rule)', borderRadius: '2px' }}>
              <p style={{ fontSize: '10px', color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Event
              </p>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--br-bone-white)', marginBottom: '6px' }}>
                {event.event_type?.replace('_', ' ')}
                {event.event_date && (
                  <span style={{ color: 'var(--mgrey)', fontWeight: 400, marginLeft: '10px', fontSize: '11px' }}>
                    {event.event_date}
                  </span>
                )}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.55', marginBottom: '8px' }}>
                {event.summary}
              </p>
              {event.content && (
                <p style={{ fontSize: '11px', color: 'var(--mgrey)', lineHeight: '1.5', marginBottom: '8px' }}>
                  {event.content}
                </p>
              )}
              <div style={{ display: 'flex', gap: '14px' }}>
                <span style={{ fontSize: '10px', color: 'var(--mgrey)' }}>
                  Grade: <span style={{ color: 'var(--br-bone-white)' }}>{event.reliability_grade}</span>
                </span>
                <span style={{ fontSize: '10px', color: 'var(--mgrey)' }}>
                  Pool: <span style={{ color: 'var(--br-bone-white)' }}>{event.pool}</span>
                </span>
              </div>
            </div>

            {/* Origin */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '10px', color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Origin
              </p>
              {!event.source_type || event.source_type === 'manual' ? (
                <div style={{ padding: '10px 14px', background: 'var(--s0)', border: '1px solid var(--rule)', borderRadius: '2px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--mgrey)' }}>Manual entry — no linked source document.</p>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', background: 'var(--s0)', border: '1px solid var(--rule)', borderLeft: '3px solid var(--rock)', borderRadius: '2px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--rock)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    {SOURCE_LABEL[event.source_type] ?? event.source_type}
                  </p>
                  {source ? (
                    <div>
                      {(source.summary || source.title) && (
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '6px' }}>
                          {source.summary ?? source.title}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {source.signal_type && (
                          <span style={{ fontSize: '10px', color: 'var(--mgrey)' }}>Type: {source.signal_type}</span>
                        )}
                        {source.confidence && (
                          <span style={{ fontSize: '10px', color: 'var(--mgrey)' }}>Confidence: {source.confidence}</span>
                        )}
                      </div>
                      <p style={{ fontSize: '10px', color: 'var(--mgrey)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                        {String(event.source_id).slice(0, 14)}…
                      </p>
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--mgrey)' }}>Source record not found or has been removed.</p>
                  )}
                </div>
              )}
            </div>

            {/* Audit trail */}
            <div>
              <p style={{ fontSize: '10px', color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Audit Trail
              </p>
              {audit.length === 0 && (
                <p style={{ fontSize: '12px', color: 'var(--mgrey)' }}>No audit entries recorded for this event.</p>
              )}
              {audit.map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', padding: '7px 0', borderBottom: '1px solid var(--br-border-subtle)', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10px', color: 'var(--mgrey)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', paddingTop: '1px' }}>
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--rock)', fontWeight: 600 }}>{entry.action}</span>
                    {entry.user_name && (
                      <span style={{ fontSize: '10px', color: 'var(--mgrey)', marginLeft: '6px' }}>— {entry.user_name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
