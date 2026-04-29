import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const STEPS = ['welcome', 'first-contact', 'done'];

export default function OnboardingPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep]           = useState(0);
  const [contactForm, setContactForm] = useState({ name: '', role: '', organisation: '' });
  const [contactSaved, setContactSaved] = useState(false);

  const completeMutation = useMutation({
    mutationFn: () => api.post('/tenant/complete-onboarding'),
    onSuccess:  () => {
      queryClient.invalidateQueries(['tenant']);
      navigate('/');
    },
  });

  const saveContactMutation = useMutation({
    mutationFn: () => api.post('/actors', {
      ...contactForm,
      actor_type: 'person',
      pool: 'commons',
    }),
    onSuccess: () => setContactSaved(true),
  });

  const stepContent = [
    // ── Step 0: Welcome ──
    <div key="welcome" className="space-y-6">
      <h2 className="text-2xl" style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)' }}>
        Welcome to Beneath
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Beneath is your private intelligence layer — a structured record of the people
        who shape your deals, your relationships, and your risk.
      </p>
      <p style={{ color: 'var(--text-secondary)' }}>
        It takes two minutes to add your first contact and see how the system works.
      </p>
      <button className="br-btn" onClick={() => setStep(1)}>
        Get started →
      </button>
    </div>,

    // ── Step 1: First contact ──
    <div key="contact" className="space-y-5">
      <h2 className="text-xl" style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)' }}>
        Add your first contact
      </h2>
      <p className="text-sm" style={{ color: 'var(--mgrey)' }}>
        A contact is any person, organisation, or entity in your intelligence landscape.
      </p>

      {contactSaved ? (
        <div className="rounded p-4 space-y-1" style={{ background: 'var(--navy)', border: '1px solid rgba(201,168,76,0.35)' }}>
          <p className="text-sm" style={{ color: 'var(--gold)' }}>✓ Contact saved</p>
          <p className="text-xs" style={{ color: 'var(--mgrey)' }}>
            You can add more contacts from the Directory at any time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="br-input-label">Name *</label>
            <input className="br-input w-full" placeholder="e.g. Sarah Harlow"
              value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="br-input-label">Role</label>
            <input className="br-input w-full" placeholder="e.g. Managing Director"
              value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="br-input-label">Organisation</label>
            <input className="br-input w-full" placeholder="e.g. Meridian Capital"
              value={contactForm.organisation} onChange={e => setContactForm(f => ({ ...f, organisation: e.target.value }))} />
          </div>

          <div className="flex gap-3">
            <button
              className="br-btn"
              disabled={!contactForm.name || saveContactMutation.isPending}
              onClick={() => saveContactMutation.mutate()}
            >
              {saveContactMutation.isPending ? 'Saving…' : 'Save contact'}
            </button>
            <button className="br-btn-outline text-xs" onClick={() => setStep(2)}>
              Skip for now
            </button>
          </div>
        </div>
      )}

      {contactSaved && (
        <button className="br-btn" onClick={() => setStep(2)}>
          Continue →
        </button>
      )}
    </div>,

    // ── Step 2: Done ──
    <div key="done" className="space-y-6">
      <h2 className="text-2xl" style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)' }}>
        You're set up
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Your Beneath workspace is ready. From here you can:
      </p>
      <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {[
          'Add people, companies, and governments to your Directory',
          'Track behavioural events and relationships across contacts',
          'Connect your email to surface intelligence from conversations',
          'Invite your team from Settings → Team',
        ].map(item => (
          <li key={item} className="flex items-start gap-2">
            <span style={{ color: 'var(--gold)' }}>—</span>
            {item}
          </li>
        ))}
      </ul>
      <button
        className="br-btn"
        disabled={completeMutation.isPending}
        onClick={() => completeMutation.mutate()}
      >
        {completeMutation.isPending ? 'Loading…' : 'Go to Beneath →'}
      </button>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--void)' }}>
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 mb-10">
          {STEPS.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 rounded-full transition-all"
              style={{ background: i <= step ? 'var(--gold)' : 'var(--rule)' }} />
          ))}
        </div>

        {stepContent[step]}
      </div>
    </div>
  );
}
