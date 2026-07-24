import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  const isAuthenticated = !!token && !!user

  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const res = await api.get('/api/auth/me')
      setUser(res.data.data)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { token: newToken, refreshToken, user: userData } = res.data.data
    localStorage.setItem('token', newToken)
    localStorage.setItem('refreshToken', refreshToken)
    setToken(newToken)
    setUser(userData)
    toast.success('Bienvenido!')
    return userData
  }

  const register = async (email, password, fullName) => {
    const res = await api.post('/api/auth/register', { email, password, fullName })
    toast.success('Cuenta creada exitosamente')
    return res.data.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setToken(null)
    setUser(null)
  }

  const refreshAuth = async () => {
    await loadUser()
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated,
      login,
      register,
      logout,
      refreshAuth,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
