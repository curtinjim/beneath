import { create } from 'zustand'

export const useAuthStore = create(set => ({
  token: null,
  user:  null,
  // setAuth is the canonical setter (used by App.jsx, RegisterPage, AcceptInvitationPage)
  setAuth: (token, user) => set({ token, user }),
  // login is kept as an alias for back-compat with existing components
  login:   (token, user) => set({ token, user }),
  logout:  () => set({ token: null, user: null }),
}))
