import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'

const PROVIDER_LABELS  = { gmail: 'Gmail', m365: 'Microsoft 365' }
const PROVIDER_COLOURS = { gmail: '#d04030', m365: '#0078d4' }

function AccountRow({ account, onDisconnect }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--br-border-subtle)' }}>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color: PROVIDER_COLOURS[account.provider], background:'var(--s3)', padding:'2px 6px', borderRadius:'2px' }}>
            {PROVIDER_LABELS[account.provider]}
          </span>
          <span style={{ fontSize:'13px', color:'var(--br-bone-white)' }}>{account.email_address}</span>
        </div>
        <p style={{ fontSize:'11px', color: account.status === 'error' ? 'var(--crimson)' : 'var(--mgrey)', marginTop:'2px' }}>
          {account.status === 'active' && account.last_synced_at
            ? `Last synced ${new Date(account.last_synced_at).toLocaleString()}`
            : account.status === 'error' ? 'Sync error — reconnect'
            : 'Connected'}
        </p>
      </div>
      <button onClick={() => onDisconnect(account.id)} className="br-btn-ghost" style={{ color:'var(--crimson)', fontSize:'12px' }}>
        Disconnect
      </button>
    </div>
  )
}

export default function MailSettings() {
  const qc = useQueryClient()

  const { data: accounts } = useQuery({
    queryKey: ['mail-accounts'],
    queryFn: () => api.get('/mail/accounts').then(r => r.data.data),
  })

  const disconnect = useMutation({
    mutationFn: id => api.delete(`/mail/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries(['mail-accounts']),
  })

  async function connect(provider) {
    const res = await api.get(`/mail/${provider}/auth`)
    window.location.href = res.data.url
  }

  return (
    <div>
      <p className="br-text-label" style={{ marginBottom:'16px' }}>Connected Accounts</p>

      {accounts?.length > 0 && (
        <div style={{ marginBottom:'20px' }}>
          {accounts.map(a => (
            <AccountRow key={a.id} account={a} onDisconnect={id => disconnect.mutate(id)} />
          ))}
        </div>
      )}

      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
        <button onClick={() => connect('gmail')} className="br-btn-outline">
          + Connect Gmail
        </button>
        <button onClick={() => connect('m365')} className="br-btn-outline">
          + Connect Microsoft 365
        </button>
      </div>

      <p style={{ fontSize:'11px', color:'var(--mgrey)', marginTop:'12px', lineHeight:'1.5' }}>
        Connecting your inbox allows Beneath to match email participants to contacts and surface intelligence signals.
        Emails are stored on your server only — nothing leaves your infrastructure.
      </p>
    </div>
  )
}
