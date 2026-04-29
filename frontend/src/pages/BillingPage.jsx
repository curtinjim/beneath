import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';

const PLAN_FEATURES = {
  trial:      { label: 'Trial', colour: 'var(--mgrey)' },
  starter:    { label: 'Starter', colour: 'var(--rock)' },
  growth:     { label: 'Growth', colour: 'var(--gold)' },
  enterprise: { label: 'Enterprise', colour: 'var(--bedrock)' },
};

function PlanCard({ plan, currentPlan, onUpgrade, loading }) {
  const isCurrent = plan.id === currentPlan;
  const isEnterprise = plan.id === 'enterprise';

  return (
    <div
      className="rounded-lg p-5 space-y-3 flex flex-col"
      style={{
        background: 'var(--navy)',
        border: `1px solid ${isCurrent ? 'rgba(201,168,76,0.35)' : 'var(--rule)'}`,
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: 'var(--white)' }}>{plan.name}</p>
        {isCurrent && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bedrock-bg)', color: 'var(--gold)' }}>
            Current
          </span>
        )}
      </div>
      <p className="text-2xl font-light" style={{ color: 'var(--white)' }}>
        {isEnterprise ? 'Contact us' : `£${plan.price_gbp}/mo`}
      </p>
      <p className="text-xs" style={{ color: 'var(--mgrey)' }}>
        {plan.seats === 999 ? 'Unlimited seats' : `Up to ${plan.seats} seats`}
      </p>
      <div className="flex-1" />
      {!isCurrent && (
        isEnterprise ? (
          <a
            href="mailto:hello@blackrudder.com?subject=Beneath Enterprise"
            className="br-btn-outline text-xs text-center block"
          >
            Get in touch
          </a>
        ) : (
          <button
            className="br-btn text-xs"
            disabled={loading}
            onClick={() => onUpgrade(plan.price_id)}
          >
            {loading ? 'Redirecting…' : `Upgrade to ${plan.name}`}
          </button>
        )
      )}
    </div>
  );
}

export default function BillingPage() {
  const { data: billing, isLoading } = useQuery({
    queryKey: ['billing'],
    queryFn: () => api.get('/billing').then(r => r.data),
  });

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: () => api.get('/tenant/usage').then(r => r.data),
  });

  const checkoutMutation = useMutation({
    mutationFn: priceId => api.post('/billing/checkout', { price_id: priceId }).then(r => r.data),
    onSuccess: data => { window.location.href = data.url; },
  });

  const portalMutation = useMutation({
    mutationFn: () => api.post('/billing/portal').then(r => r.data),
    onSuccess: data => { window.location.href = data.url; },
  });

  if (isLoading) return <div className="p-8 text-center" style={{ color: 'var(--mgrey)' }}>Loading…</div>;

  const plan    = billing?.plan ?? 'trial';
  const planCfg = PLAN_FEATURES[plan] ?? PLAN_FEATURES.trial;

  return (
    <div className="max-w-2xl mx-auto py-8 px-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl" style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)' }}>Billing</h1>
          <p className="text-xs mt-0.5" style={{ color: planCfg.colour }}>
            {planCfg.label} plan
          </p>
        </div>
        {billing?.has_subscription && (
          <button
            className="br-btn-outline text-xs"
            disabled={portalMutation.isPending}
            onClick={() => portalMutation.mutate()}
          >
            {portalMutation.isPending ? 'Loading…' : 'Manage subscription →'}
          </button>
        )}
      </div>

      {/* Trial banner */}
      {plan === 'trial' && billing?.trial_ends && (
        <div
          className="rounded p-4 text-sm"
          style={{ background: billing.trial_expired ? 'rgba(139,26,26,0.15)' : 'var(--bedrock-bg)', border: `1px solid ${billing.trial_expired ? 'rgba(139,26,26,0.3)' : 'rgba(201,168,76,0.35)'}`, color: billing.trial_expired ? '#e87070' : 'var(--gold)' }}
        >
          {billing.trial_expired
            ? 'Your trial has expired. Choose a plan below to continue.'
            : `Trial active — expires ${new Date(billing.trial_ends).toLocaleDateString()}.`}
        </div>
      )}

      {/* Seats summary */}
      <div className="rounded-lg p-5" style={{ background: 'var(--s1)', border: '1px solid var(--rule)' }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--mgrey)' }}>
          Seat Usage
        </p>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-light" style={{ color: 'var(--white)' }}>{billing?.seats_used ?? 0}</span>
          <span className="text-sm mb-0.5" style={{ color: 'var(--mgrey)' }}>/ {billing?.seat_limit ?? 3} seats</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--rule)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, ((billing?.seats_used ?? 0) / (billing?.seat_limit ?? 3)) * 100)}%`,
              background: 'var(--gold)',
            }}
          />
        </div>
      </div>

      {/* Usage this month */}
      {usage && (
        <div className="rounded-lg p-5" style={{ background: 'var(--s1)', border: '1px solid var(--rule)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--mgrey)' }}>
            Usage — {usage.month}
          </p>
          <div className="space-y-2">
            {Object.entries(usage.events ?? {}).map(([type, count]) => (
              <div key={type} className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }} className="capitalize">{type.replace(/_/g, ' ')}</span>
                <span style={{ color: 'var(--white)' }}>{count}</span>
              </div>
            ))}
            {Object.keys(usage.events ?? {}).length === 0 && (
              <p className="text-xs" style={{ color: 'var(--mgrey)' }}>No activity this month.</p>
            )}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--mgrey)' }}>
          Plans
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(billing?.plans ?? []).map(p => (
            <PlanCard
              key={p.id}
              plan={p}
              currentPlan={plan}
              onUpgrade={priceId => checkoutMutation.mutate(priceId)}
              loading={checkoutMutation.isPending}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
