import { createContext, useContext, useEffect, useState } from 'react'
import { api, setSessionExpiredHandler } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(api.hasSession())

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null))
    if (!api.hasSession()) return
    api.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    await api.login(email, password)
    setUser(await api.me())
  }

  const refreshUser = async () => setUser(await api.me())

  const logout = async () => {
    await api.logout()
    setUser(null)
  }

  const logoutAll = async () => {
    await api.logoutAll()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, logoutAll, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
