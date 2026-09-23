import { createContext, useContext, useState, useEffect } from 'react'
import { setApiRole } from '../api'
import { ROLE_DEFINITIONS, DEFAULT_ROLE_USERS } from './roleConstants'

const RoleContext = createContext()

const AUTH_STORAGE_KEY = 'mplads_auth_session'

export function RoleProvider({ children }) {
  // Check if an authenticated user session is stored in localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch (e) {
      console.error('Failed to parse stored auth session', e)
      return null
    }
  })

  const isAuthenticated = !!currentUser
  const activeRole = currentUser?.role || 'mospi'
  const roleValue = currentUser?.roleValue ?? (ROLE_DEFINITIONS[activeRole]?.defaultRoleValue || '')
  const roleConfig = ROLE_DEFINITIONS[activeRole] || ROLE_DEFINITIONS.mospi

  // Synchronize API client interceptor with active role
  useEffect(() => {
    if (isAuthenticated) {
      setApiRole(activeRole, roleValue)
    } else {
      setApiRole('', '')
    }
  }, [isAuthenticated, activeRole, roleValue])

  // Login handler
  const login = (roleId, customCreds = {}) => {
    const config = ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.mospi
    const defaultUser = DEFAULT_ROLE_USERS[roleId] || DEFAULT_ROLE_USERS.mospi
    const val = customCreds.roleValue !== undefined && customCreds.roleValue !== null
      ? customCreds.roleValue
      : config.defaultRoleValue

    const userProfile = {
      id: roleId,
      role: roleId,
      roleValue: val,
      name: customCreds.name || defaultUser.name,
      email: customCreds.email || defaultUser.email,
      designation: customCreds.designation || defaultUser.designation,
      department: customCreds.department || defaultUser.department,
      clearanceLevel: defaultUser.clearanceLevel,
      jurisdiction: config.jurisdictionLabel,
      loginTime: new Date().toISOString(),
    }

    setCurrentUser(userProfile)
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile))
    } catch (e) {
      console.warn('Could not persist auth to localStorage', e)
    }
    setApiRole(roleId, val)
    return userProfile
  }

  // Logout handler
  const logout = () => {
    setCurrentUser(null)
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch (e) {
      console.warn('Could not clear auth session from localStorage', e)
    }
    setApiRole('', '')
  }

  // Switch role during active authenticated session
  const switchRole = (roleId, customValue = null) => {
    login(roleId, { roleValue: customValue })
  }

  const setRoleValue = (newVal) => {
    if (!currentUser) return
    const updated = { ...currentUser, roleValue: newVal }
    setCurrentUser(updated)
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn(e)
    }
    setApiRole(activeRole, newVal)
  }

  const hasPageAccess = (pageId) => {
    if (!isAuthenticated) return false
    return roleConfig.allowedPages.includes(pageId)
  }

  const roleParams = () => {
    if (!isAuthenticated || activeRole === 'mospi') return {}
    return { role: activeRole, role_value: roleValue }
  }

  return (
    <RoleContext.Provider value={{
      isAuthenticated,
      currentUser,
      login,
      logout,
      activeRole,
      role: activeRole, // alias for backwards compatibility
      roleValue,
      setRoleValue,
      roleConfig,
      switchRole,
      hasPageAccess,
      roleParams,
      roles: ROLE_DEFINITIONS,
      defaultRoleUsers: DEFAULT_ROLE_USERS,
    }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}

export { ROLE_DEFINITIONS, DEFAULT_ROLE_USERS }
