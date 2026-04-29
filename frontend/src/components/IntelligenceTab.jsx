import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../lib/api'

const DIV_STYLE = {
  consistent:            { color:'var(--bedrock)'        },
  minorDivergence:       { color:'var(--sand)'           },
  significantDivergence: { color:'var(--divergent-text)' },
  insufficientData:      { color:'var(--mgrey)'          },
}
const DIV_LABEL = {
  consistent:            'Consistent',
  minorDivergence:       'Minor divergence',
  significantDivergence: 'Significant divergence',
  insufficientData:      'Insufficient data',
}

const CONF_COLOUR = { high:'var(--bedrock)', medium:'var(--sand)', low:'var(--mud)' }

export default function IntelligenceTab({ actorId }) {
  // Divergence
  const { data: divData, isLoading: divLoading, refetch: refetchDiv } = useQuery({
    queryKey: ['divergence', actorId],
    queryFn: () => api.get(`/actors/${actorId}/divergence`).then(r => r.data.data).catch(() => null),
  })

  const computeDiv = useMutation({
    mutationFn: () => api.post(`/actors/${actorId}/divergence`),
    onSuccess: () => setTimeout(() => refetchDiv(), 3000),
  })

  // Cross-contradiction (BD-54)
  const { data: ccData, isLoading: ccLoading, refetch: refetchCc } = useQuery({
    queryKey: ['cross-contradictions', actorId],
    queryFn: () => api.get(`/actors/${actorId}/cross-contradictions`).then(r => r.data.data).catch(() => null),
  })

  const computeCc = useMutation({
    mutationFn: () => api.post(`/actors/${actorId}/cross-contradictions`),
    onSuccess: () => setTimeout(() => refetchCc(), 6000),
  })

  const contradictions = ccData?.cross_contradictions ?? []
  const ccAt = ccData?.cross_contradictions_at

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

      {/* Divergence panel */}
      <div style={{ background:'var(--s1)', border:'1px solid var(--rule)', borderLeft:'3px solid var(--gold)', padding:'20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <span className="br-text-label">Divergence Assessment</span>
          <button onClick={() => computeDiv.mutate()} disabled={computeDiv.isPending} className="br-arrow-link" style={{ fontSize:'12px' }}>
            {computeDiv.isPending ? 'Computing…' : 'Recompute'}
          </button>
        </div>

        {divLoading && <p style={{ color:'var(--mgrey)', fontSize:'13px' }}>Loading…</p>}

        {divData ? (
          <>
            <p style={{ ...(DIV_STYLE[divData.rating]??{ color:'rgba(245,244,240,0.7)' }), fontFamily:'var(--font-sans)', fontSize:'16px', fontWeight:600, letterSpacing:'-0.01em', marginBottom:'14px' }}>
              {DIV_LABEL[divData.rating] ?? divData.rating}
            </p>
            {divData.contributingPairs?.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {divData.contributingPairs.map((pair, i) => (
                  <div key={i} style={{ fontSize:'12px', color:'rgba(245,244,240,0.7)', borderLeft:'2px solid var(--b-active)', paddingLeft:'12px' }}>
                    {pair.explanation}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : !divLoading && (
          <div>
            <p style={{ color:'var(--mgrey)', fontSize:'13px' }}>No divergence assessment yet.</p>
            <p style={{ color:'var(--fog)', fontSize:'12px', marginTop:'4px' }}>
              Requires 5+ claim, commitment, or position events.
            </p>
          </div>
        )}
      </div>

      {/* Cross-contradiction panel (BD-54) */}
      <div style={{ background:'var(--s1)', border:'1px solid var(--rule)', borderLeft:'3px solid var(--crimson)', padding:'20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <div>
            <span className="br-text-label">Cross-actor Contradictions</span>
            {ccAt && (
              <span style={{ fontSize:'10px', color:'var(--mgrey)', marginLeft:'10px' }}>
                last run {new Date(ccAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <button
            onClick={() => computeCc.mutate()}
            disabled={computeCc.isPending}
            className="br-arrow-link"
            style={{ fontSize:'12px' }}
          >
            {computeCc.isPending ? 'Computing…' : ccAt ? 'Recompute' : 'Compute →'}
          </button>
        </div>

        {ccLoading && <p style={{ color:'var(--mgrey)', fontSize:'13px' }}>Loading…</p>}

        {computeCc.isPending && (
          <p style={{ fontSize:'11px', color:'var(--mgrey)', fontStyle:'italic' }}>
            Checking related actors for contradictions — this may take a few seconds.
          </p>
        )}

        {!ccLoading && !computeCc.isPending && ccAt && contradictions.length === 0 && (
          <p style={{ color:'var(--mgrey)', fontSize:'13px' }}>No cross-actor contradictions detected.</p>
        )}

        {!ccLoading && !ccAt && !computeCc.isPending && (
          <div>
            <p style={{ color:'var(--mgrey)', fontSize:'13px' }}>Not yet computed.</p>
            <p style={{ fontSize:'12px', color:'var(--fog)', marginTop:'4px' }}>
              Compares this actor's claims against statements from related actors.
            </p>
          </div>
        )}

        {contradictions.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {contradictions.map((c, i) => (
              <div key={i} style={{ padding:'12px 14px', background:'rgba(180,60,60,0.06)', border:'1px solid rgba(180,60,60,0.2)', borderRadius:'2px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                  <span style={{ fontSize:'11px', color:'var(--crimson)', fontWeight:700, letterSpacing:'0.08em' }}>
                    CONTRADICTION
                  </span>
                  {c.confidence && (
                    <span style={{ fontSize:'10px', color: CONF_COLOUR[c.confidence] ?? 'var(--mgrey)' }}>
                      {c.confidence} confidence
                    </span>
                  )}
                  <span style={{ fontSize:'10px', color:'var(--mgrey)', marginLeft:'auto' }}>
                    vs. {c.actor_name}
                  </span>
                </div>
                {c.explanation && (
                  <p style={{ fontSize:'12px', color:'rgba(245,244,240,0.7)', lineHeight:'1.5' }}>{c.explanation}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
