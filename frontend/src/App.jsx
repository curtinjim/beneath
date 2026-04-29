// BD-293 — App root: light-mode-first design system (BD-UISPEC-0426-v1)
// Theme store retained for future dark-mode support; defaults to 'light'.
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RegisterPage          from './pages/RegisterPage'
import OnboardingPage        from './pages/OnboardingPage'
import TeamPage              from './pages/TeamPage'
import BillingPage           from './pages/BillingPage'
import AcceptInvitationPage  from './pages/AcceptInvitationPage'
import TenantBanner          from './components/TenantBanner'
import MailPage              from './pages/MailPage'
import { useAuthStore }      from './store/auth'
import { useThemeStore }     from './store/theme'
import Login                 from './pages/Login'
import Layout                from './components/Layout'
import ContactsPage          from './pages/ContactsPage'
import CompaniesPage         from './pages/CompaniesPage'
import GovernmentsPage       from './pages/GovernmentsPage'
import ActorDetail           from './pages/ActorDetail'
import SettingsPage          from './pages/SettingsPage'
import SignalsPage           from './pages/SignalsPage'
import SourcesPage           from './pages/SourcesPage'
import ChatPage              from './pages/ChatPage'
import ProjectsPage          from './pages/ProjectsPage'
import AuditLogPage          from './pages/AuditLogPage'

function RequireAuth({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const setAuth = useAuthStore(s => s.setAuth)
  const handleAuth = (data) => setAuth(data.token, data.user)

  // BD-293: new design system is light-mode-first; force 'light' until dark tokens
  // are defined. The theme store value is preserved so SettingsPage can still
  // read/write it — it just won't take visual effect until dark CSS is added.
  const theme = useThemeStore(s => s.theme)

  useEffect(() => {
    const root = document.documentElement
    // Always render light for now; revisit when dark-mode tokens are specified.
    root.setAttribute('data-theme', 'light')
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<RegisterPage onAuth={handleAuth} />} />
        <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />
        <Route path="/accept-invitation/:token" element={<AcceptInvitationPage onAuth={handleAuth} />} />
        <Route path="/" element={<RequireAuth><><TenantBanner /><Layout /></></RequireAuth>}>
          <Route index element={<Navigate to="/contacts" replace />} />
          <Route path="contacts"         element={<ContactsPage />} />
          <Route path="contacts/:id"     element={<ActorDetail type="contacts" />} />
          <Route path="companies"        element={<CompaniesPage />} />
          <Route path="companies/:id"    element={<ActorDetail type="companies" />} />
          <Route path="governments"      element={<GovernmentsPage />} />
          <Route path="governments/:id"  element={<ActorDetail type="governments" />} />
          <Route path="signals"          element={<SignalsPage />} />
          <Route path="sources"          element={<SourcesPage />} />
          <Route path="chat"             element={<ChatPage />} />
          <Route path="projects"         element={<ProjectsPage />} />
          <Route path="audit-log"        element={<AuditLogPage />} />
          <Route path="settings"         element={<SettingsPage />} />
          <Route path="team"             element={<TeamPage />} />
          <Route path="billing"          element={<BillingPage />} />
          <Route path="mail"             element={<MailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
