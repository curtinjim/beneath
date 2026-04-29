import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function AcceptInvitationPage({ onAuth }) {
  const { token }   = useParams();
  const navigate    = useNavigate();
  const [form, setForm]     = useState({ name: '', password: '', password_confirmation: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post(`/invitations/${token}/accept`, form);
      localStorage.setItem('token', data.token);
      onAuth(data);
      navigate('/');
    } catch (err) {
      const status = err.response?.status;
      if (status === 410) setError('This invitation has expired.');
      else if (status === 422) setError(Object.values(err.response.data.errors ?? {})[0]?.[0] ?? 'Invalid input.');
      else setError(err.response?.data?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--void)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p className="br-wordmark text-2xl mb-1">Black Rudder</p>
          <p className="br-product">Beneath</p>
        </div>

        <div className="rounded-lg p-8 space-y-5" style={{ background: 'var(--s1)', border: '1px solid var(--rule)' }}>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--white)' }}>Accept your invitation</h1>
          <p className="text-xs" style={{ color: 'var(--mgrey)' }}>Set up your account to join your team on Beneath.</p>

          {error && (
            <p className="text-xs px-3 py-2 rounded" style={{ background: 'rgba(139,26,26,0.15)', color: '#e87070' }}>
              {error}
            </p>
          )}

          <form onSubmit={submit} className="space-y-4">
            {[
              ['name', 'Your name', 'text', 'Jane Smith'],
              ['password', 'Password', 'password', 'Min. 10 characters'],
              ['password_confirmation', 'Confirm password', 'password', ''],
            ].map(([key, label, type, placeholder]) => (
              <div key={key} className="space-y-1">
                <label className="br-input-label">{label}</label>
                <input
                  className="br-input w-full"
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                />
              </div>
            ))}

            <button type="submit" disabled={loading} className="br-btn w-full mt-2">
              {loading ? 'Setting up…' : 'Join team'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
