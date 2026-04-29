import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import api from '../lib/api'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const login    = useAuthStore(s => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      login(res.data.data.token, res.data.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Login failed.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      flex: 1,
      height: '100%',
      background: 'var(--dnavy)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '380px' }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span className="br-wordmark" style={{ display: 'block', marginBottom: '8px' }}>
            BLACK<span className="pipe">|</span>RUDDER
          </span>
          <span className="br-product">Beneath</span>
        </div>

        {/* Form card */}
        <div style={{
          background: 'var(--navy)',
          border: '1px solid var(--rule)',
          padding: '32px',
        }}>
          <p style={{
            fontSize: '9px', fontWeight: 500, letterSpacing: '0.3em',
            textTransform: 'uppercase', color: 'var(--mgrey)',
            marginBottom: '24px',
          }}>
            Sign in to your workspace
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="br-input-label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required className="br-input" />
            </div>
            <div>
              <label className="br-input-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required className="br-input" />
            </div>

            {error && (
              <p style={{ fontSize: '12px', color: 'var(--crimson)', margin: 0 }}>{error}</p>
            )}

            <hr className="br-rule-gold" style={{ margin: '8px 0 4px', border: 'none' }} />

            <button type="submit" disabled={loading} className="br-btn"
              style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
