import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';

export default function TenantBanner() {
  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => api.get('/tenant').then(r => r.data),
    staleTime: 60_000,
  });

  if (!tenant) return null;

  if (tenant.suspended) {
    return (
      <div className="px-4 py-2 text-xs text-center" style={{ background: 'rgba(139,26,26,0.85)', color: '#fca5a5' }}>
        Your account is suspended.{' '}
        <Link to="/billing" style={{ color: '#fca5a5', textDecoration: 'underline' }}>Update billing →</Link>
      </div>
    );
  }

  if (tenant.trial_expired) {
    return (
      <div className="px-4 py-2 text-xs text-center" style={{ background: 'rgba(139,26,26,0.6)', color: '#fca5a5' }}>
        Your trial has expired.{' '}
        <Link to="/billing" style={{ color: '#fca5a5', textDecoration: 'underline' }}>Choose a plan →</Link>
      </div>
    );
  }

  if (tenant.is_trial && tenant.trial_ends) {
    const daysLeft = Math.ceil((new Date(tenant.trial_ends) - new Date()) / 86_400_000);
    if (daysLeft <= 5) {
      return (
        <div className="px-4 py-2 text-xs text-center" style={{ background: 'var(--bedrock-bg)', color: 'var(--gold)' }}>
          Trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.{' '}
          <Link to="/billing" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>Upgrade →</Link>
        </div>
      );
    }
  }

  return null;
}
