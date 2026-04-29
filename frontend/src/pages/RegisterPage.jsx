import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';

export default function RegisterPage({ onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    org_name: '', name: '', email: '', password: '', password_confirmation: '',
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async e => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const { data } = await api.post('/register', form);
      localStorage.setItem('token', data.token);
      onAuth(data);
      navigate('/onboarding');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {});
      } else {
        setErrors({ general: err.response?.data?.message ?? 'Registration failed.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div className="space-y-1">
      <label className="br-input-label">{label}</label>
      <input
        className="br-input w-full"
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
      />
      {errors[key] && <p className="text-xs" style={{ color: 'var(--crimson)' }}>{errors[key][0]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--void)' }}>
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <div className="text-center mb-10">
          <p className="br-wordmark text-2xl mb-1">Black Rudder</p>
          <p className="br-product">Beneath</p>
        </div>

        <div className="rounded-lg p-8 space-y-5" style={{ background: 'var(--s1)', border: '1px solid var(--rule)' }}>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--white)' }}>Create your account</h1>
          <p className="text-xs" style={{ color: 'var(--mgrey)' }}>14-day free trial · No credit card required</p>

          {errors.general && (
            <p className="text-xs px-3 py-2 rounded" style={{ background: 'rgba(139,26,26,0.15)', color: '#e87070' }}>
              {errors.general}
            </p>
          )}

          <form onSubmit={submit} className="space-y-4">
            {field('org_name', 'Organisation name', 'text', 'Meridian Capital')}
            {field('name', 'Your name', 'text', 'Jane Harlow')}
            {field('email', 'Work email', 'email', 'jane@meridian.com')}
            {field('password', 'Password', 'password', 'Min. 10 characters')}
            {field('password_confirmation', 'Confirm password', 'password', '')}

            <button type="submit" disabled={loading} className="br-btn w-full mt-2">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--mgrey)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--gold)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
