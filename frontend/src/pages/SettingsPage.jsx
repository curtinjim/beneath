// BD-311 — SettingsPage redesign
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'

const PROVIDERS = [
  { value: '',          label: 'Platform default' },
  { value: 'ollama',    label: 'Ollama (self-hosted)' },
  { value: 'openai',    label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
]

const MODELS = {
  '':          [],
  ollama:      ['llama3', 'llama3:70b', 'mixtral', 'mistral', 'phi3', 'gemma2'],
  openai:      ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic:   ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionHeader({ title, danger }) {
  return (
    <div className="form-section__header" style={danger ? { color: 'var(--color-alert)' } : undefined}>
      {title}
    </div>
  )
}

// ─── AI Configuration section ─────────────────────────────────────────────────

function AiConfigSection() {
  const qc = useQueryClient()
  const [form, setForm]   = useState(null)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const { data: config, isLoading } = useQuery({
    queryKey: ['tenant-ai-config'],
    queryFn: () => api.get('/tenant/ai-config').then(r => r.data),
    onSuccess: (data) => {
      if (!form) setForm({
        provider:            data.provider ?? '',
        endpoint:            data.endpoint ?? '',
        model:               data.model ?? '',
        api_key:             '',
        fallback_to_default: data.fallback_to_default ?? true,
      })
    },
  })

  const mutation = useMutation({
    mutationFn: (data) => api.put('/tenant/ai-config', data),
    onSuccess: () => {
      qc.invalidateQueries(['tenant-ai-config'])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (isLoading || !form) return (
    <div className="state-loading" style={{ padding: '16px' }}>
      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading…</span>
    </div>
  )

  const models = MODELS[form.provider] ?? []

  // Skill IDs from config (platform provides these)
  const skillIds = config?.skill_ids ?? {}

  return (
    <div className="form-section__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Provider */}
      <div>
        <label className="form-label">AI Provider</label>
        <select
          className="select"
          value={form.provider}
          onChange={e => { set('provider', e.target.value); set('model', '') }}
          style={{ width: '100%', marginTop: '6px' }}
        >
          {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Leave as platform default to use the shared Ollama instance.
        </p>
      </div>

      {/* Ollama endpoint */}
      {form.provider === 'ollama' && (
        <div>
          <label className="form-label">Ollama endpoint</label>
          <input
            type="url"
            className="input"
            placeholder="http://localhost:11434"
            value={form.endpoint}
            onChange={e => set('endpoint', e.target.value)}
            style={{ width: '100%', marginTop: '6px' }}
          />
        </div>
      )}

      {/* API Key */}
      {form.provider && form.provider !== 'ollama' && (
        <div>
          <label className="form-label">API Key</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <input
              className="input"
              type={showKey ? 'text' : 'password'}
              placeholder={config?.has_api_key ? '•••••••• (stored — enter to replace)' : 'sk-…'}
              value={form.api_key}
              onChange={e => set('api_key', e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn-icon"
              onClick={() => setShowKey(v => !v)}
              title={showKey ? 'Hide key' : 'Show key'}
              style={{ flexShrink: 0 }}
            >
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
        </div>
      )}

      {/* Model */}
      {models.length > 0 && (
        <div>
          <label className="form-label">Model</label>
          <select
            className="select"
            value={form.model}
            onChange={e => set('model', e.target.value)}
            style={{ width: '100%', marginTop: '6px' }}
          >
            <option value="">Select a model…</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      {/* Fallback */}
      {form.provider && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <input
            type="checkbox"
            checked={form.fallback_to_default}
            onChange={e => set('fallback_to_default', e.target.checked)}
          />
          Fall back to platform default if this config fails
        </label>
      )}

      {/* Skill IDs table */}
      {Object.keys(skillIds).length > 0 && (
        <div>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Skill IDs</label>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {Object.entries(skillIds).map(([name, id], i) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '40px',
                  padding: '0 14px',
                  borderBottom: i < Object.keys(skillIds).length - 1 ? '1px solid var(--color-border)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'var(--color-surface)',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{name}</span>
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontFamily: 'Courier New, monospace' }}>{id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="btn"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(form)}
        >
          {saved ? 'Saved' : mutation.isPending ? 'Saving…' : 'Save AI config'}
        </button>
        <button
          className="btn-ghost"
          onClick={() => setForm({
            provider: config?.provider ?? '',
            endpoint: config?.endpoint ?? '',
            model: config?.model ?? '',
            api_key: '',
            fallback_to_default: config?.fallback_to_default ?? true,
          })}
        >
          Reset
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const qc = useQueryClient()
  const { user, logout } = useAuthStore()

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false)
  const [nameDraft,      setNameDraft]      = useState(user?.name ?? '')

  // API key state (legacy Anthropic key on tenant)
  const [apiKey,         setApiKey]         = useState('')
  const [apiKeySaved,    setApiKeySaved]    = useState(false)
  const [inviteEmail,    setInviteEmail]    = useState('')
  const [inviteOpen,     setInviteOpen]     = useState(false)

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => api.get('/admin/tenant').then(r => r.data.data),
  })

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data.data),
    enabled: user?.role === 'owner' || user?.role === 'admin',
  })

  const saveApiKey = useMutation({
    mutationFn: () => api.put('/admin/tenant', {
      settings: { ...tenant?.settings, anthropic_api_key: apiKey },
    }),
    onSuccess: () => {
      setApiKeySaved(true)
      setApiKey('')
      qc.invalidateQueries(['tenant'])
      setTimeout(() => setApiKeySaved(false), 2000)
    },
  })

  const saveProfile = useMutation({
    mutationFn: () => api.patch('/user/profile', { name: nameDraft }),
    onSuccess: () => setEditingProfile(false),
  })

  const removeUser = useMutation({
    mutationFn: (userId) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => qc.invalidateQueries(['admin-users']),
  })

  const inviteMember = useMutation({
    mutationFn: () => api.post('/admin/users/invite', { email: inviteEmail }),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); setInviteEmail(''); setInviteOpen(false) },
  })

  const isAdmin = user?.role === 'owner' || user?.role === 'admin'

  return (
    <div style={{ background: 'var(--color-fog)', minHeight: '100%' }}>

      {/* Page header */}
      <div className="page-header" style={{ background: 'var(--color-surface)' }}>
        <h1 className="page-title">Settings</h1>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '720px' }}>

        {/* ─── Profile ──────────────────────────────────────────────────── */}
        <div className="form-section" style={{ marginBottom: '24px' }}>
          <div className="form-section__header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Profile
              {!editingProfile && (
                <button
                  className="btn-outline"
                  style={{ fontSize: '13px' }}
                  onClick={() => { setNameDraft(user?.name ?? ''); setEditingProfile(true) }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          <div className="form-section__body">
            {editingProfile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label">Display name</label>
                  <input
                    className="input"
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    style={{ width: '100%', marginTop: '6px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn"
                    disabled={saveProfile.isPending}
                    onClick={() => saveProfile.mutate()}
                  >
                    {saveProfile.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn-ghost" onClick={() => setEditingProfile(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <span style={{ width: '120px', fontSize: '13px', color: 'var(--color-text-secondary)', flexShrink: 0 }}>Name</span>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>{user?.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <span style={{ width: '120px', fontSize: '13px', color: 'var(--color-text-secondary)', flexShrink: 0 }}>Email</span>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>{user?.email}</span>
                </div>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <span style={{ width: '120px', fontSize: '13px', color: 'var(--color-text-secondary)', flexShrink: 0 }}>Role</span>
                  <span className="badge badge--navy" style={{ textTransform: 'capitalize' }}>{user?.role}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── AI Configuration ─────────────────────────────────────────── */}
        <div className="form-section" style={{ marginBottom: '24px' }}>
          <SectionHeader title="AI Configuration" />
          <AiConfigSection />
        </div>

        {/* ─── Anthropic API key (legacy tenant setting) ─────────────────── */}
        {isAdmin && (
          <div className="form-section" style={{ marginBottom: '24px' }}>
            <SectionHeader title="AI Provider (Legacy)" />
            <div className="form-section__body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Active provider: Anthropic — Claude
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Model: {tenant?.settings?.anthropic_model ?? 'claude-sonnet-4-5-20251001'}
                </p>
              </div>
              <div>
                <label className="form-label">API Key</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <input
                    type="password"
                    className="input"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={tenant?.settings?.anthropic_api_key
                      ? '••••••••' + tenant.settings.anthropic_api_key.slice(-4)
                      : 'sk-ant-…'}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn"
                    disabled={!apiKey || saveApiKey.isPending}
                    onClick={() => saveApiKey.mutate()}
                  >
                    {saveApiKey.isPending ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {apiKeySaved && (
                  <p style={{ fontSize: '12px', color: 'var(--color-positive)', marginTop: '6px' }}>API key saved.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Team ─────────────────────────────────────────────────────── */}
        {isAdmin && (
          <div className="form-section" style={{ marginBottom: '24px' }}>
            <div className="form-section__header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Team
                <button
                  className="btn-outline"
                  style={{ fontSize: '13px' }}
                  onClick={() => setInviteOpen(v => !v)}
                >
                  {inviteOpen ? 'Cancel' : 'Invite member'}
                </button>
              </div>
            </div>
            <div className="form-section__body">
              {inviteOpen && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="email"
                    className="input"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn"
                    disabled={!inviteEmail || inviteMember.isPending}
                    onClick={() => inviteMember.mutate()}
                  >
                    {inviteMember.isPending ? 'Inviting…' : 'Invite'}
                  </button>
                </div>
              )}

              {users?.map(u => (
                <div
                  key={u.id}
                  className="list-row"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{u.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{u.email}</p>
                  </div>
                  <span className="badge badge--navy" style={{ textTransform: 'capitalize' }}>{u.role}</span>

                  {/* Row hover actions */}
                  <div className="row-actions">
                    {u.id !== user?.id && (
                      <button
                        className="btn-row-action"
                        style={{ color: 'var(--color-alert)' }}
                        onClick={() => removeUser.mutate(u.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Danger Zone ──────────────────────────────────────────────── */}
        {isAdmin && (
          <div className="form-section" style={{ marginBottom: '24px', borderColor: 'var(--color-alert)' }}>
            <SectionHeader title="Danger Zone" danger />
            <div className="form-section__body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500 }}>Delete workspace</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Permanently delete all data. This cannot be undone.
                  </p>
                </div>
                <button className="btn btn-danger">
                  Delete workspace
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Account ──────────────────────────────────────────────────── */}
        <div className="form-section" style={{ marginBottom: '24px' }}>
          <SectionHeader title="Account" />
          <div className="form-section__body">
            <button
              className="btn-ghost"
              style={{ fontSize: '13px' }}
              onClick={() => logout?.()}
            >
              Sign out
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
