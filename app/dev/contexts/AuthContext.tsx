'use client'

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react'
import authService from '../services/authService'
import type { User, AuthEvent } from '../types/auth.types'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (userData: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  loginAsGuest: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true)
      const currentUser = await authService.initialize()

      if (currentUser) {
        setUser(currentUser)
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error("Erreur d'initialisation de l'authentification:", error)
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleAuthEvent = useCallback((event: AuthEvent) => {
    switch (event.type) {
      case 'LOGIN':
      case 'REGISTER':
      case 'GUEST_LOGIN':
        setUser(event?.user || null)
        setIsAuthenticated(true)
        break

      case 'LOGOUT':
      case 'DATA_CLEARED':
        setUser(null)
        setIsAuthenticated(false)
        break

      case 'PROFILE_UPDATE':
        setUser(event?.user || null)
        break

      default:
        console.log('Événement d\'authentification non géré:', event)
    }
  }, [])

  useEffect(() => {
    initializeAuth()

    const removeListener = authService.addAuthListener(handleAuthEvent)

    return () => {
      removeListener()
    }
  }, [initializeAuth, handleAuthEvent])

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password)
    return { success: result.success, error: result.error }
  }

  const register = async (userData: Record<string, unknown>) => {
    const result = await authService.register(userData)
    return { success: result.success, error: result.error }
  }

  const logout = async () => {
    await authService.logout()
  }

  const loginAsGuest = async () => {
    await authService.loginAsGuest()
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated, login, register, logout, loginAsGuest }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return context
}