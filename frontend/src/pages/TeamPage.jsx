import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const ROLE_COLOUR = {
  owner: 'var(--gold)',
  admin: 'var(--rock)',
  member: 'var(--mgrey)',
};

function MemberRow({ member, currentUserId, canAdmin, onUpdate, onRemove }) {
  const isMe = member.id === currentUserId;
  return (
    <div className="br-list-row flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="br-list-name">{member.name}{isMe ? ' (you)' : ''}</p>
        <p className="br-list-sub">{member.email}</p>
      </div>
      <div className="flex items-center gap-3 ml-4">
        {member.status === 'suspended' && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(139,26,26,0.2)', color: '#e87070' }}>
            Suspended
          </span>
        )}
        <span className="text-xs font-medium" style={{ color: ROLE_COLOUR[member.role] ?? 'var(--mgrey)' }}>
          {member.role}
        </span>
        {canAdmin && !isMe && member.role !== 'owner' && (
          <button
            onClick={() => onRemove(member)}
            className="text-xs"
            style={{ color: 'var(--mgrey)' }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function InvitationRow({ inv, canAdmin, onRevoke }) {
  return (
    <div className="br-list-row flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{inv.email}</p>
        <p className="text-xs" style={{ color: 'var(--mgrey)' }}>
          Invited by {inv.inviter?.name} · expires {new Date(inv.expires_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <span className="text-xs" style={{ color: 'var(--gold)' }}>Pending</span>
        {canAdmin && (
          <button onClick={() => onRevoke(inv)} className="text-xs" style={{ color: 'var(--mgrey)' }}>
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}

export default function TeamPage({ user, tenant }) {
  const queryClient = useQueryClient();
  const canAdmin    = ['owner', 'admin'].includes(user?.role);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [inviteError, setInviteError] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => api.get('/team/members').then(r => r.data),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['team-invitations'],
    queryFn: () => api.get('/team/invitations').then(r => r.data),
    enabled: canAdmin,
  });

  const inviteMutation = useMutation({
    mutationFn: data => api.post('/team/invitations', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['team-invitations']);
      setShowInvite(false);
      setInviteForm({ email: '', role: 'member' });
      setInviteError('');
    },
    onError: err => setInviteError(err.response?.data?.message ?? 'Failed to send invitation.'),
  });

  const revokeMutation = useMutation({
    mutationFn: id => api.delete(`/team/invitations/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['team-invitations']),
  });

  const removeMutation = useMutation({
    mutationFn: id => api.delete(`/team/members/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['team-members']),
  });

  const seatsUsed = members.filter(m => m.status === 'active').length;
  const seatLimit = tenant?.seat_limit ?? 3;

  return (
    <div className="max-w-2xl mx-auto py-8 px-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl" style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)' }}>Team</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--mgrey)' }}>
            {seatsUsed} / {seatLimit} seats used · {tenant?.plan ?? 'trial'} plan
          </p>
        </div>
        {canAdmin && (
          <button className="br-btn-outline text-xs" onClick={() => setShowInvite(s => !s)}>
            + Invite member
          </button>
        )}
      </div>

      {/* Seat warning */}
      {seatsUsed >= seatLimit && (
        <div className="rounded p-3 text-xs" style={{ background: 'rgba(139,26,26,0.15)', color: '#e87070', border: '1px solid rgba(139,26,26,0.3)' }}>
          All seats are in use. Upgrade your plan to add more members.
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="rounded-lg p-5 space-y-4" style={{ background: 'var(--navy)', border: '1px solid var(--rule)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--white)' }}>Invite a team member</h3>
          <div className="flex gap-3">
            <input
              className="br-input flex-1"
              type="email"
              placeholder="colleague@example.com"
              value={inviteForm.email}
              onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
            />
            <select
              className="br-input w-32"
              value={inviteForm.role}
              onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
              style={{ background: 'var(--s3)' }}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {inviteError && <p className="text-xs" style={{ color: '#e87070' }}>{inviteError}</p>}
          <div className="flex gap-3">
            <button
              className="br-btn"
              disabled={!inviteForm.email || inviteMutation.isPending}
              onClick={() => inviteMutation.mutate(inviteForm)}
            >
              {inviteMutation.isPending ? 'Sending…' : 'Send invitation'}
            </button>
            <button className="br-btn-outline text-xs" onClick={() => setShowInvite(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Members */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--mgrey)' }}>
          Members
        </p>
        <div>
          {members.map(m => (
            <MemberRow
              key={m.id}
              member={m}
              currentUserId={user?.id}
              canAdmin={canAdmin}
              onRemove={m => removeMutation.mutate(m.id)}
            />
          ))}
        </div>
      </div>

      {/* Pending invitations */}
      {canAdmin && invitations.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--mgrey)' }}>
            Pending Invitations
          </p>
          <div>
            {invitations.map(inv => (
              <InvitationRow
                key={inv.id}
                inv={inv}
                canAdmin={canAdmin}
                onRevoke={inv => revokeMutation.mutate(inv.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
