import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const PROVIDERS = [
  { value: '',           label: 'Platform default' },
  { value: 'ollama',     label: 'Ollama (self-hosted)' },
  { value: 'openai',     label: 'OpenAI' },
  { value: 'anthropic',  label: 'Anthropic' },
];

const MODELS = {
  '':           [],
  ollama:       ['llama3', 'llama3:70b', 'mixtral', 'mistral', 'phi3', 'gemma2'],
  openai:       ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic:    ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
};

export default function AiConfigSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['tenant-ai-config'],
    queryFn: () => api.get('/tenant/ai-config').then(r => r.data),
    onSuccess: data => {
      if (!form) setForm({
        provider:            data.provider ?? '',
        endpoint:            data.endpoint ?? '',
        model:               data.model ?? '',
        api_key:             '',
        fallback_to_default: data.fallback_to_default ?? true,
      });
    },
  });

  const mutation = useMutation({
    mutationFn: data => api.put('/tenant/ai-config', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenant-ai-config']);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (isLoading || !form) return null;

  const models = MODELS[form.provider] ?? [];

  return (
    <div className="space-y-4">
      <div>
        <label className="br-input-label">AI Provider</label>
        <select
          className="br-input w-full mt-1"
          value={form.provider}
          onChange={e => { set('provider', e.target.value); set('model', ''); }}
          style={{ background: 'var(--navy)' }}
        >
          {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <p className="text-xs mt-1" style={{ color: 'var(--mgrey)' }}>
          Leave as platform default to use the shared Ollama instance.
        </p>
      </div>

      {form.provider === 'ollama' && (
        <div>
          <label className="br-input-label">Ollama endpoint</label>
          <input
            className="br-input w-full mt-1"
            type="url"
            placeholder="http://localhost:11434"
            value={form.endpoint}
            onChange={e => set('endpoint', e.target.value)}
          />
        </div>
      )}

      {form.provider && form.provider !== 'ollama' && (
        <div>
          <label className="br-input-label">API Key</label>
          <input
            className="br-input w-full mt-1"
            type="password"
            placeholder={config?.has_api_key ? '••••••••  (stored — enter to replace)' : 'sk-…'}
            value={form.api_key}
            onChange={e => set('api_key', e.target.value)}
          />
        </div>
      )}

      {models.length > 0 && (
        <div>
          <label className="br-input-label">Model</label>
          <select
            className="br-input w-full mt-1"
            value={form.model}
            onChange={e => set('model', e.target.value)}
            style={{ background: 'var(--navy)' }}
          >
            <option value="">Select a model…</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      {form.provider && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.fallback_to_default}
            onChange={e => set('fallback_to_default', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Fall back to platform default if this config fails
          </span>
        </label>
      )}

      <button
        className="br-btn"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(form)}
      >
        {saved ? '✓ Saved' : mutation.isPending ? 'Saving…' : 'Save AI config'}
      </button>
    </div>
  );
}
