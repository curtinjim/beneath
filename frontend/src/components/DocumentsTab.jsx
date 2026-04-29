import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

const STATUS_STYLE = {
  pending:    { color: 'var(--mgrey)',   label: 'Pending'    },
  processing: { color: 'var(--sand)',    label: 'Processing' },
  done:       { color: 'var(--bedrock)', label: 'Done'       },
  failed:     { color: 'var(--crimson)', label: 'Failed'     },
}

const DISTIL_STYLE = {
  pending:    { color: 'var(--mgrey)',   label: '—'             },
  processing: { color: 'var(--sand)',    label: 'Processing…'   },
  done:       { color: 'var(--bedrock)', label: 'DISTIL done'   },
  failed:     { color: 'var(--crimson)', label: 'DISTIL failed' },
  skipped:    { color: 'var(--mgrey)',   label: 'No text'       },
}

const TYPE_ICON  = { url: '⬡', file: '▣', meeting_note: '◈', observation: '◉', voice: '◎' }
const TYPE_LABEL = { url: 'URL', file: 'File', meeting_note: 'Meeting note', observation: 'Observation', voice: 'Voice note' }

// BD-82: Documents tab on actor detail
export default function DocumentsTab({ actorId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['actor-sources', actorId],
    queryFn: () => api.get('/sources', { params: { actor_id: actorId, per_page: 100 } }).then(r => r.data),
    staleTime: 30000,
  })

  const sources = data?.data ?? []

  if (isLoading) {
    return <p style={{ color: 'var(--mgrey)', fontSize: '13px' }}>Loading…</p>
  }

  if (sources.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--mgrey)', fontSize: '13px', marginBottom: '8px' }}>
          No sources linked to this actor.
        </p>
        <p style={{ color: 'var(--mgrey)', fontSize: '11px' }}>
          Add a meeting note, voice note, or document from the Sources page and link it to this actor.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '10px', color: 'var(--mgrey)', letterSpacing: '0.10em',
        textTransform: 'uppercase', marginBottom: '16px' }}>
        {sources.length} source{sources.length !== 1 ? 's' : ''}
      </p>
      {sources.map(source => {
        const st = STATUS_STYLE[source.status] ?? STATUS_STYLE.pending
        const dt = DISTIL_STYLE[source.distil_status] ?? DISTIL_STYLE.pending
        return (
          <div key={source.id}
            style={{ padding: '12px 14px', marginBottom: '6px', borderRadius: '2px',
              background: 'var(--s1)', border: '1px solid var(--rule)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--mgrey)', flexShrink: 0, marginTop: '1px' }}>
                {TYPE_ICON[source.source_type] ?? '○'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--white)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {source.title ?? source.url ?? 'Untitled'}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: st.color,
                    letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--mgrey)',
                    background: 'var(--s3)', padding: '1px 6px', borderRadius: '2px' }}>
                    {TYPE_LABEL[source.source_type] ?? source.source_type}
                  </span>
                  <span style={{ fontSize: '10px', color: dt.color }}>{dt.label}</span>
                  <span style={{ fontSize: '10px', color: 'var(--mgrey)', marginLeft: 'auto' }}>
                    {new Date(source.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            {source.raw_text && (
              <p style={{ fontSize: '11px', color: 'var(--mgrey)', marginTop: '8px', lineHeight: '1.5',
                borderTop: '1px solid var(--rule)', paddingTop: '8px',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {source.raw_text}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
