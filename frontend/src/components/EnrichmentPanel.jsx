import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const STATUS_CFG = {
  none:    { label: 'Not enriched',  colour: 'var(--mgrey)'   },
  pending: { label: 'Queued…',       colour: 'var(--sand)'    },
  running: { label: 'Enriching…',    colour: 'var(--rock)'    },
  done:    { label: 'Enriched',      colour: 'var(--bedrock)' },
  failed:  { label: 'Failed',        colour: 'var(--crimson)' },
}

const FIELD_LABELS = {
  reliability_profile: 'Reliability Profile',
  trajectory:          'Trajectory',
  dormancy_state:      'Dormancy State',
  importance_tier:     'Importance Tier',
  tags:                'Tags',
  notes:               'Notes',
}

function SuggestionRow({ field, value, onApply, applying }) {
  const display = Array.isArray(value) ? value.join(', ') : String(value ?? '')
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'8px 0', borderBottom:'1px solid var(--br-border-subtle)' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:'10px', color:'var(--gold)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:'2px' }}>
          {FIELD_LABELS[field] ?? field}
        </p>
        <p style={{ fontSize:'13px', color:'var(--br-bone-white)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {display || <span style={{ fontStyle:'italic', color:'var(--mgrey)' }}>empty</span>}
        </p>
      </div>
      <button onClick={() => onApply(field, value)} disabled={applying === field}
        style={{ flexShrink:0, fontSize:'11px', padding:'3px 10px', background:'var(--gold)', color:'var(--void)', border:'none', borderRadius:'2px', cursor:'pointer', fontWeight:700, letterSpacing:'0.06em', opacity: applying === field ? 0.5 : 1 }}>
        {applying === field ? '…' : 'Apply'}
      </button>
    </div>
  )
}

export default function EnrichmentPanel({ actorId, onApplied }) {
  const queryClient = useQueryClient()
  const [applying, setApplying] = useState(null)
  const [polling, setPolling]   = useState(false)

  const { data, refetch } = useQuery({
    queryKey: ['enrichment', actorId],
    queryFn: () => api.get(`/actors/${actorId}/enrichment`).then(r => r.data),
    refetchInterval: polling ? 2000 : false,
    staleTime: 0,
  })

  useEffect(() => {
    setPolling(data?.status === 'pending' || data?.status === 'running')
  }, [data?.status])

  const triggerMutation = useMutation({
    mutationFn: () => api.post(`/actors/${actorId}/enrichment`),
    onSuccess: () => { setPolling(true); queryClient.invalidateQueries(['enrichment', actorId]) },
  })

  const applyMutation = useMutation({
    mutationFn: ({ field, value }) => api.post(`/actors/${actorId}/enrichment/apply`, { field, value }),
    onSuccess: (_, { field }) => {
      setApplying(null)
      queryClient.invalidateQueries(['actor', actorId])
      onApplied?.()
    },
    onError: () => setApplying(null),
  })

  const cfg          = STATUS_CFG[data?.status ?? 'none']
  const suggestions  = data?.enrichment_fields ?? {}
  const leverage     = data?.leverage_read_suggestion
  const hasSuggestions = Object.keys(suggestions).length > 0

  return (
    <div style={{ marginTop:'24px', background:'var(--s1)', border:'1px solid var(--br-border-subtle)', borderLeft:'3px solid rgba(201,168,76,0.35)', padding:'16px', display:'flex', flexDirection:'column', gap:'12px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <span className="br-text-label">AI Enrichment</span>
          <p style={{ fontSize:'12px', color: cfg.colour, marginTop:'2px' }}>{cfg.label}</p>
        </div>
        <button onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending || polling}
          className="br-btn-outline" style={{ fontSize:'11px', padding:'5px 12px' }}>
          {polling ? 'Running…' : 'Enrich now'}
        </button>
      </div>

      {data?.status === 'running' && (
        <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color:'var(--rock)' }}>
          <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'var(--rock)', display:'inline-block', animation:'pulse 1.5s ease infinite' }} />
          Analysing profile…
        </div>
      )}

      {data?.status === 'done' && hasSuggestions && (
        <div>
          <p style={{ fontSize:'11px', color:'var(--mgrey)', marginBottom:'8px' }}>
            Suggested updates — click Apply to write to profile:
          </p>
          {Object.entries(suggestions).map(([field, value]) => (
            <SuggestionRow key={field} field={field} value={value} onApply={(f,v) => { setApplying(f); applyMutation.mutate({ field:f, value:v }) }} applying={applying} />
          ))}
        </div>
      )}

      {data?.status === 'done' && leverage && (
        <div style={{ background:'var(--s3)', padding:'12px', borderRadius:'2px' }}>
          <p className="br-text-label" style={{ marginBottom:'6px' }}>Leverage Read Suggestion</p>
          {leverage.summary   && <p style={{ fontSize:'13px', color:'var(--br-bone-white)' }}>{leverage.summary}</p>}
          {leverage.confidence && <p style={{ fontSize:'12px', color:'var(--mgrey)', marginTop:'3px' }}>Confidence: {leverage.confidence}</p>}
        </div>
      )}

      {data?.status === 'failed' && (
        <p style={{ fontSize:'12px', color:'var(--crimson)' }}>
          Enrichment failed. Check API key in Settings and retry.
        </p>
      )}
    </div>
  )
}
