import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const REL_TYPES = ['affiliation','coalition','adversarial','subsidiary','contractual','regulatory','lobbying','personal','intermediary','ownership']
const GRADES    = ['bedrock','rock','sand','mud','fog']
const STANCE    = ['party_line','independent','divergent','unknown']
const POSTURE   = ['ally','neutral','adversarial','unknown']
const LEVERAGE  = ['channel','signal','risk','none']

export default function RelationshipForm({ actorId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    target_actor_id:'', relationship_type:'affiliation', direction:'directed',
    reliability_grade:'sand', status:'active', acknowledged:false,
    stance:'unknown', actual_influence:'unknown', posture_toward_operator:'unknown',
    leverage_read:'none', notes:'',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: data => api.post(`/actors/${actorId}/relationships`, data),
    onSuccess: () => { qc.invalidateQueries(['relationships', actorId]); onClose() },
    onError:   e  => setError(e.response?.data?.error?.message ?? 'Failed to save.'),
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isAff = form.relationship_type === 'affiliation'

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(6,9,15,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}>
      <div style={{ background:'var(--navy)', border:'1px solid var(--br-border-subtle)', width:'100%', maxWidth:'520px', padding:'24px', display:'flex', flexDirection:'column', gap:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h2 className="br-text-label">Add Relationship</h2>
          <button onClick={onClose} className="br-btn-ghost">✕</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          <div>
            <label className="br-input-label">Target Actor UUID</label>
            <input value={form.target_actor_id} onChange={e => set('target_actor_id', e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="br-input" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div>
              <label className="br-input-label">Type</label>
              <select value={form.relationship_type} onChange={e => set('relationship_type', e.target.value)} className="br-input">
                {REL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="br-input-label">Direction</label>
              <select value={form.direction} onChange={e => set('direction', e.target.value)} className="br-input">
                <option value="directed">directed</option>
                <option value="bidirectional">bidirectional</option>
              </select>
            </div>
            <div>
              <label className="br-input-label">Reliability</label>
              <select value={form.reliability_grade} onChange={e => set('reliability_grade', e.target.value)} className="br-input">
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="br-input-label">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="br-input">
                {['active','historical','alleged','refuted'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {isAff && (
            <div style={{ borderTop:'1px solid var(--br-border-subtle)', paddingTop:'12px', display:'flex', flexDirection:'column', gap:'10px' }}>
              <p className="br-text-label">Vault — Terrain Fields</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <label className="br-input-label">Stance</label>
                  <select value={form.stance} onChange={e => set('stance', e.target.value)} className="br-input">
                    {STANCE.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="br-input-label">Posture toward us</label>
                  <select value={form.posture_toward_operator} onChange={e => set('posture_toward_operator', e.target.value)} className="br-input">
                    {POSTURE.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="br-input-label">Actual influence</label>
                  <select value={form.actual_influence} onChange={e => set('actual_influence', e.target.value)} className="br-input">
                    {['high','medium','low','unknown'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="br-input-label">Leverage read</label>
                  <select value={form.leverage_read} onChange={e => set('leverage_read', e.target.value)} className="br-input">
                    {LEVERAGE.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="br-input-label">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Optional…" rows={2} className="br-input" style={{ resize:'none' }} />
          </div>
        </div>

        {error && <p style={{ color:'var(--crimson)', fontSize:'12px' }}>{error}</p>}

        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
          <button onClick={onClose} className="br-btn-outline">Cancel</button>
          <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="br-btn">
            {mutation.isPending ? 'Saving…' : 'Save →'}
          </button>
        </div>
      </div>
    </div>
  )
}
