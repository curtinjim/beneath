import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import TerrainGraph from './TerrainGraph'
import OrgChart from './OrgChart'

const CATEGORIES = ['location','access_zone','affiliation','background','operational','personnel']
const GRADES     = ['bedrock','rock','sand','mud','fog']

const GRADE_COLOUR = {
  bedrock:'var(--bedrock)', rock:'var(--rock)', sand:'var(--sand)',
  mud:'var(--mud)', fog:'var(--fog)',
}

const CATEGORY_COLOUR = {
  location:'#4090a0', access_zone:'#9a70d0', affiliation:'var(--rock)',
  background:'var(--mgrey)', operational:'var(--sand)', personnel:'var(--bedrock)',
}

function AddTerrainForm({ actorId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    category:'location', label:'', value:'', related_actor_id:'',
    notes:'', reliability_grade:'sand',
  })

  const save = useMutation({
    mutationFn: () => api.post(`/actors/${actorId}/terrain`, {
      ...form,
      related_actor_id: form.related_actor_id.trim() || null,
      notes: form.notes.trim() || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['terrain', actorId])
      onClose()
    },
  })

  const field = (label, key, el) => (
    <div style={{ marginBottom:'10px' }}>
      <label style={{ display:'block', fontSize:'10px', color:'var(--gold)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:'4px' }}>{label}</label>
      {el(form[key], v => setForm(f => ({ ...f, [key]: v })))}
    </div>
  )

  const input = (val, set, placeholder='') => (
    <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
      style={{ width:'100%', boxSizing:'border-box', background:'var(--s0)', border:'1px solid var(--rule)', borderRadius:'2px', color:'var(--br-bone-white)', fontSize:'12px', padding:'6px 10px' }} />
  )

  const textarea = (val, set, placeholder='') => (
    <textarea value={val} onChange={e => set(e.target.value)} placeholder={placeholder} rows={2}
      style={{ width:'100%', boxSizing:'border-box', background:'var(--s0)', border:'1px solid var(--rule)', borderRadius:'2px', color:'var(--br-bone-white)', fontSize:'12px', padding:'6px 10px', resize:'vertical' }} />
  )

  const select = (val, set, options) => (
    <select value={val} onChange={e => set(e.target.value)}
      style={{ background:'var(--s1)', border:'1px solid var(--rule)', borderRadius:'2px', color:'var(--br-bone-white)', fontSize:'12px', padding:'6px 10px', width:'100%' }}>
      {options.map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
    </select>
  )

  return (
    <div style={{ marginTop:'16px', padding:'16px', background:'var(--s1)', border:'1px solid var(--rule)', borderRadius:'2px' }}>
      <p style={{ fontSize:'10px', color:'var(--gold)', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'12px' }}>New terrain entry</p>
      {field('Category', 'category', (v,s) => select(v, s, CATEGORIES))}
      {field('Label', 'label', (v,s) => input(v, s, 'e.g. Primary office, Security clearance, Party membership'))}
      {field('Value', 'value', (v,s) => textarea(v, s, 'Detail or description…'))}
      {field('Related actor ID (optional)', 'related_actor_id', (v,s) => input(v, s, 'UUID of linked actor'))}
      {field('Notes', 'notes', (v,s) => textarea(v, s, 'Source, context…'))}
      {field('Grade', 'reliability_grade', (v,s) => select(v, s, GRADES))}
      <div style={{ display:'flex', gap:'8px', marginTop:'12px' }}>
        <button onClick={() => save.mutate()} disabled={save.isPending || !form.label || !form.value} className="br-btn-outline" style={{ fontSize:'12px' }}>
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onClose} className="br-btn-ghost" style={{ fontSize:'12px' }}>Cancel</button>
      </div>
    </div>
  )
}

function LeverageReadPanel({ actorId }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function compute() {
    setLoading(true)
    try {
      const res = await api.post('/ai/leverage-read', { actor_id: actorId })
      setResult(res.data.data)
    } catch {
      setResult({ suggestedRead: null, rationale: 'Analysis failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop:'20px', padding:'16px', background:'var(--s1)', border:'1px solid var(--rule)', borderLeft:'3px solid rgba(201,168,76,0.5)', borderRadius:'2px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: result ? '12px' : 0 }}>
        <span className="br-text-label">Leverage Read</span>
        <button onClick={compute} disabled={loading} className="br-arrow-link" style={{ fontSize:'12px' }}>
          {loading ? 'Computing…' : result ? 'Recompute' : 'Compute →'}
        </button>
      </div>
      {result && (
        <div>
          {result.suggestedRead && (
            <p style={{ fontSize:'15px', fontWeight:700, color:'var(--gold)', fontFamily:'var(--font-sans)', marginBottom:'6px', letterSpacing:'-0.01em' }}>
              {result.suggestedRead}
            </p>
          )}
          {result.rationale && (
            <p style={{ fontSize:'12px', color:'rgba(245,244,240,0.7)', lineHeight:'1.5' }}>{result.rationale}</p>
          )}
          {!result.suggestedRead && !result.rationale && (
            <p style={{ fontSize:'12px', color:'var(--mgrey)' }}>No leverage read could be determined.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function TerrainTab({ actorId, actor }) {
  const qc = useQueryClient()
  const [view, setView]       = useState('list')   // 'list' | 'graph' | 'orgchart'
  const [showAdd, setShowAdd] = useState(false)

  const { data: terrain, isLoading } = useQuery({
    queryKey: ['terrain', actorId],
    queryFn: () => api.get(`/actors/${actorId}/terrain`).then(r => r.data.data),
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/terrain/${id}`),
    onSuccess: () => qc.invalidateQueries(['terrain', actorId]),
  })

  const tabBtn = (label, target) => (
    <button
      onClick={() => setView(target)}
      style={{
        fontSize:'11px', padding:'4px 10px', border:'1px solid var(--rule)',
        background: view === target ? 'var(--s3)' : 'transparent',
        color: view === target ? 'var(--br-bone-white)' : 'var(--mgrey)',
        cursor:'pointer', borderRadius:'2px',
      }}
    >
      {label}
    </button>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span className="br-text-label">{terrain?.length ?? 0} terrain entr{terrain?.length !== 1 ? 'ies' : 'y'}</span>
          <div style={{ display:'flex', gap:'4px' }}>
            {tabBtn('List', 'list')}
            {tabBtn('Graph', 'graph')}
            {tabBtn('Org', 'orgchart')}
          </div>
        </div>
        <button onClick={() => setShowAdd(v => !v)} className="br-arrow-link" style={{ fontSize:'12px' }}>
          {showAdd ? 'Cancel' : 'Add entry'}
        </button>
      </div>

      {showAdd && <AddTerrainForm actorId={actorId} onClose={() => setShowAdd(false)} />}

      {isLoading && <p style={{ color:'var(--mgrey)', fontSize:'13px' }}>Loading…</p>}

      {/* Graph views */}
      {!isLoading && view === 'graph' && terrain?.length > 0 && (
        <TerrainGraph terrain={terrain} centralActor={actor} />
      )}
      {!isLoading && view === 'orgchart' && terrain?.length > 0 && (
        <OrgChart terrain={terrain} centralActor={actor} />
      )}
      {!isLoading && (view === 'graph' || view === 'orgchart') && terrain?.length === 0 && (
        <p style={{ color:'var(--mgrey)', fontSize:'13px' }}>No terrain entries to visualise.</p>
      )}

      {/* List view */}
      {!isLoading && view === 'list' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          {terrain?.map(entry => (
            <div key={entry.id} style={{ padding:'10px 14px', background:'var(--s1)', border:'1px solid var(--rule)', borderLeft:`3px solid ${CATEGORY_COLOUR[entry.category] ?? 'var(--rule)'}`, borderRadius:'2px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'9px', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color: CATEGORY_COLOUR[entry.category] ?? 'var(--mgrey)' }}>
                    {entry.category.replace('_',' ')}
                  </span>
                  <span style={{ fontSize:'12px', color:'var(--br-bone-white)', fontFamily:'var(--font-serif)' }}>{entry.label}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'10px', color: GRADE_COLOUR[entry.reliability_grade] ?? 'var(--mgrey)' }}>
                    {entry.reliability_grade}
                  </span>
                  <button onClick={() => remove.mutate(entry.id)} className="br-btn-ghost" style={{ fontSize:'10px', padding:'1px 6px', opacity:0.5 }}>×</button>
                </div>
              </div>
              <p style={{ fontSize:'12px', color:'rgba(245,244,240,0.7)', lineHeight:'1.4' }}>{entry.value}</p>
              {entry.related_actor && (
                <p style={{ fontSize:'11px', color:'var(--mgrey)', marginTop:'4px' }}>
                  → {entry.related_actor.display_name} ({entry.related_actor.actor_type})
                </p>
              )}
              {entry.notes && (
                <p style={{ fontSize:'11px', color:'var(--mgrey)', marginTop:'4px', fontStyle:'italic' }}>{entry.notes}</p>
              )}
            </div>
          ))}
          {terrain?.length === 0 && (
            <p style={{ color:'var(--mgrey)', fontSize:'13px' }}>No terrain entries recorded.</p>
          )}
        </div>
      )}

      {/* BD-38: Leverage Read panel */}
      <LeverageReadPanel actorId={actorId} />
    </div>
  )
}
