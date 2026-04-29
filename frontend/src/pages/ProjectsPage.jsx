// BD-308 — ProjectsPage redesign
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

// ─── Sub-tabs ────────────────────────────────────────────────────────────────

function ActorsTab({ projectId }) {
  const qc = useQueryClient()
  const [actorIdInput, setActorIdInput] = useState('')
  const [addOpen, setAddOpen]           = useState(false)

  const { data: links, isLoading } = useQuery({
    queryKey: ['project-actors', projectId],
    queryFn: () => api.get(`/projects/${projectId}/actors`).then(r => r.data.data),
  })

  const add = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/actors`, { actor_id: actorIdInput.trim() }),
    onSuccess: () => {
      qc.invalidateQueries(['project-actors', projectId])
      setActorIdInput('')
      setAddOpen(false)
    },
  })

  const remove = useMutation({
    mutationFn: (actorId) => api.delete(`/projects/${projectId}/actors/${actorId}`),
    onSuccess: () => qc.invalidateQueries(['project-actors', projectId]),
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {links?.length ?? 0} linked actor{links?.length !== 1 ? 's' : ''}
        </span>
        <button
          className="btn-ghost"
          style={{ fontSize: '13px' }}
          onClick={() => setAddOpen(v => !v)}
        >
          {addOpen ? 'Cancel' : 'Link actor'}
        </button>
      </div>

      {addOpen && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <input
            className="input"
            value={actorIdInput}
            onChange={e => setActorIdInput(e.target.value)}
            placeholder="Paste actor ID…"
            style={{ flex: 1, fontFamily: 'Courier New, monospace' }}
          />
          <button
            className="btn-outline"
            disabled={!actorIdInput.trim() || add.isPending}
            onClick={() => add.mutate()}
          >
            {add.isPending ? 'Linking…' : 'Link'}
          </button>
        </div>
      )}

      {isLoading && (
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading…</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {links?.map(link => (
          <div
            key={link.id}
            style={{ padding: '10px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 400 }}>
                {link.actor?.display_name ?? link.actor_id}
              </p>
              <button
                className="btn-ghost"
                style={{ fontSize: '12px', padding: '2px 8px', color: 'var(--color-text-secondary)' }}
                onClick={() => remove.mutate(link.actor_id)}
              >
                Remove
              </button>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {link.actor?.actor_type && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{link.actor.actor_type}</span>
              )}
              {link.stance && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {link.stance.replace('_', ' ')}
                </span>
              )}
              {link.predicted_reaction && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>{link.predicted_reaction}</span>
              )}
            </div>
            {link.linkage_notes && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{link.linkage_notes}</p>
            )}
          </div>
        ))}
        {links?.length === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No actors linked yet.</p>
        )}
      </div>
    </div>
  )
}

function SignalsTab({ projectId }) {
  const { data: signals, isLoading, refetch } = useQuery({
    queryKey: ['project-signals', projectId],
    queryFn: () => api.get(`/projects/${projectId}/signals`).then(r => r.data.data),
  })

  const score = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/signals/score`),
    onSuccess: () => setTimeout(() => refetch(), 6000),
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {signals?.length ?? 0} signal{signals?.length !== 1 ? 's' : ''}
        </span>
        <button
          className="btn-ghost"
          disabled={score.isPending}
          onClick={() => score.mutate()}
        >
          {score.isPending ? 'Scoring…' : 'Score relevance'}
        </button>
      </div>

      {score.isPending && (
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: '12px' }}>
          Scoring signals against project goal — results will appear in a few seconds.
        </p>
      )}

      {isLoading && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {signals?.map(s => (
          <div key={s.id} style={{ padding: '10px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge--navy" style={{ textTransform: 'capitalize' }}>
                {s.signal_type?.replace(/_/g, ' ')}
              </span>
              {s.relevance_score != null && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: s.relevance_score >= 70 ? 'var(--color-positive)' : s.relevance_score >= 40 ? 'var(--color-caution)' : 'var(--color-text-secondary)',
                }}>
                  {s.relevance_score}% relevant
                </span>
              )}
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>{s.status}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.5' }}>{s.summary}</p>
            {s.relevance_note && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>{s.relevance_note}</p>
            )}
          </div>
        ))}
        {signals?.length === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No signals found for linked actors.</p>
        )}
      </div>
    </div>
  )
}

function NarrativeTab({ projectId }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['project-narrative', projectId],
    queryFn: () => api.get(`/projects/${projectId}/narrative`).then(r => r.data.data),
  })

  const compute = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/narrative`),
    onSuccess: () => setTimeout(() => refetch(), 8000),
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>Narrative Synthesis</span>
          {data?.narrative_at && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '10px' }}>
              {new Date(data.narrative_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <button
          className="btn-ghost"
          disabled={compute.isPending}
          onClick={() => compute.mutate()}
        >
          {compute.isPending ? 'Synthesising…' : data?.narrative ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {compute.isPending && (
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: '12px' }}>
          Synthesising narrative across linked actors — this may take several seconds.
        </p>
      )}

      {isLoading && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading…</p>}

      {data?.narrative ? (
        <div style={{ padding: '20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-gold)', borderRadius: 'var(--radius)' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
            {data.narrative}
          </p>
        </div>
      ) : !isLoading && !compute.isPending && (
        <div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No narrative generated yet.</p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Link actors and set a project goal statement before generating.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Project workspace ────────────────────────────────────────────────────────

function ProjectWorkspace({ project, onUpdated }) {
  const qc = useQueryClient()
  const [tab,       setTab]       = useState('actors')
  const [editing,   setEditing]   = useState(false)
  const [goalDraft, setGoalDraft] = useState(project.goal_statement ?? '')

  const saveGoal = useMutation({
    mutationFn: () => api.patch(`/projects/${project.id}`, { goal_statement: goalDraft }),
    onSuccess: (res) => {
      qc.invalidateQueries(['projects'])
      onUpdated?.(res.data.data)
      setEditing(false)
    },
  })

  const TABS = ['actors', 'signals', 'narrative']

  return (
    <div>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          {project.name}
        </h2>

        {/* Goal statement */}
        {editing ? (
          <div style={{ marginBottom: '12px' }}>
            <textarea
              className="textarea"
              value={goalDraft}
              onChange={e => setGoalDraft(e.target.value)}
              rows={3}
              placeholder="Project goal statement…"
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                className="btn-outline"
                disabled={saveGoal.isPending}
                onClick={() => saveGoal.mutate()}
              >
                {saveGoal.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                className="btn-ghost"
                onClick={() => { setEditing(false); setGoalDraft(project.goal_statement ?? '') }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <p style={{
              fontSize: '13px',
              color: project.goal_statement ? 'var(--color-text-secondary)' : 'var(--color-text-secondary)',
              lineHeight: '1.5', flex: 1,
              fontStyle: project.goal_statement ? 'normal' : 'italic',
            }}>
              {project.goal_statement || 'No goal statement set.'}
            </p>
            <button
              className="btn-ghost"
              style={{ fontSize: '12px', flexShrink: 0 }}
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 14px', fontSize: '12px',
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                background: 'none', border: 'none',
                borderBottom: tab === t ? '2px solid var(--color-navy)' : '2px solid transparent',
                cursor: 'pointer', marginBottom: '-1px',
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {tab === 'actors'    && <ActorsTab    projectId={project.id} />}
        {tab === 'signals'   && <SignalsTab   projectId={project.id} />}
        {tab === 'narrative' && <NarrativeTab projectId={project.id} />}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [selected, setSelected]   = useState(null)
  const [creating, setCreating]   = useState(false)
  const [newName,  setNewName]    = useState('')
  const [newGoal,  setNewGoal]    = useState('')

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data.data),
  })

  const create = useMutation({
    mutationFn: () => api.post('/projects', { name: newName.trim(), goal_statement: newGoal.trim() || null }),
    onSuccess: (res) => {
      qc.invalidateQueries(['projects'])
      setSelected(res.data.data)
      setCreating(false)
      setNewName('')
      setNewGoal('')
    },
  })

  const selectedProject = selected
    ? (projects?.find(p => p.id === selected.id) ?? selected)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <button className="btn" onClick={() => setCreating(v => !v)}>
          {creating ? 'Cancel' : 'New Project'}
        </button>
      </div>

      {/* New project inline form */}
      {creating && (
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-light)' }}>
          <div className="form-section" style={{ maxWidth: '480px', margin: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label">Project name</label>
                <input
                  className="input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Budget negotiation"
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>
              <div>
                <label className="form-label">Goal statement (optional)</label>
                <input
                  className="input"
                  value={newGoal}
                  onChange={e => setNewGoal(e.target.value)}
                  placeholder="What are you trying to understand?"
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn"
                  disabled={!newName.trim() || create.isPending}
                  onClick={() => create.mutate()}
                >
                  {create.isPending ? 'Creating…' : 'Create project'}
                </button>
                <button className="btn-ghost" onClick={() => { setCreating(false); setNewName(''); setNewGoal('') }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Body: list + workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Project list */}
        <div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid var(--color-border)', overflowY: 'auto' }}>
          {isLoading && (
            <div className="state-loading" style={{ padding: '32px', textAlign: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading…</span>
            </div>
          )}

          {!isLoading && (!projects || projects.length === 0) && (
            <div className="empty-state">
              <p className="empty-state__text">No projects yet.</p>
            </div>
          )}

          {projects?.map(p => {
            const isSelected = selectedProject?.id === p.id
            const hasVault   = p.has_vault_actors
            return (
              <div
                key={p.id}
                className="list-row"
                style={{
                  minHeight: '48px',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--color-surface)' : undefined,
                  gap: '3px',
                }}
                onClick={() => setSelected(p)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                  {hasVault && (
                    <span
                      className="badge"
                      style={{ border: '1px solid var(--color-gold)', color: 'var(--color-gold)', background: 'transparent', flexShrink: 0 }}
                    >
                      Vault
                    </span>
                  )}
                  {p.actor_count != null && (
                    <span className="badge badge--navy" style={{ flexShrink: 0 }}>
                      {p.actor_count} actors
                    </span>
                  )}
                </div>

                {p.goal_statement && (
                  <p
                    className="truncate-1"
                    style={{ fontSize: '13px', color: 'var(--color-text-secondary)', width: '100%' }}
                  >
                    {p.goal_statement}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '12px', color: p.narrative_at ? '#15803D' : 'var(--color-text-secondary)' }}>
                    {p.narrative_at ? 'Narrative ready' : 'No narrative'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {new Date(p.updated_at ?? p.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Row hover actions */}
                <div className="row-actions">
                  <button
                    className="btn-row-action"
                    style={{ color: 'var(--color-navy)', fontSize: '13px' }}
                    onClick={e => { e.stopPropagation(); setSelected(p) }}
                  >
                    Open
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Workspace */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {selectedProject ? (
            <ProjectWorkspace
              project={selectedProject}
              onUpdated={(updated) => setSelected(updated)}
            />
          ) : (
            <div className="empty-state" style={{ height: '100%' }}>
              <p className="empty-state__text">Select a project or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
