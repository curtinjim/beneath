// BD-296 — Left Navigation Redesign per BD-UISPEC-0426-v1 §5
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import api from '../lib/api'

const NAV_SECTIONS = [
  {
    label: 'INTELLIGENCE',
    items: [
      { to: '/contacts',    label: 'Contacts'    },
      { to: '/companies',   label: 'Companies'   },
      { to: '/governments', label: 'Governments' },
      { to: '/signals',     label: 'Signals'     },
      { to: '/sources',     label: 'Sources'     },
    ],
  },
  {
    label: 'PROJECTS',
    items: [
      { to: '/projects', label: 'Projects' },
    ],
  },
  {
    label: 'COMMUNICATIONS',
    items: [
      { to: '/mail', label: 'Mail' },
    ],
  },
  {
    label: 'ANALYTICAL',
    items: [
      { to: '/chat', label: 'Chat' },
    ],
  },
]

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    >
      {label}
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch {}
    logout()
    navigate('/login')
  }

  // Derive initials for avatar
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="app-sidebar">
        {/* Wordmark */}
        <div className="nav-wordmark">
          <span className="nav-wordmark__brand">BLACK|RUDDER</span>
          <span className="nav-wordmark__product">Beneath</span>
        </div>

        {/* Navigation */}
        <nav className="nav-body">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <span className="nav-section-label">{section.label}</span>
              {section.items.map(item => (
                <NavItem key={item.to} to={item.to} label={item.label} />
              ))}
            </div>
          ))}
        </nav>

        {/* User block — pinned to bottom */}
        <div className="nav-user">
          <div className="nav-user__avatar">{initials}</div>
          <span className="nav-user__name">{user?.name ?? 'Account'}</span>
          <NavLink to="/settings" title="Settings">
            <svg
              className="nav-user__settings"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </NavLink>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
