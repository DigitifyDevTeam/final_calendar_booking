import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireUser?: boolean
}

function ProtectedRoute({ children, requireAdmin = false, requireUser = false }: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const user = sessionStorage.getItem('user')
    if (!user) {
      setShouldRender(false)
      setIsLoading(false)
      return
    }

    try {
      const userData = JSON.parse(user)
      const isAuthenticated = userData.isAuthenticated
      const isAdmin = userData.role === 'admin'

      if (!isAuthenticated) {
        setShouldRender(false)
        setIsLoading(false)
        return
      }

      if (requireAdmin && !isAdmin) {
        setShouldRender(false)
        setIsLoading(false)
        return
      }

      if (requireUser) {
        // If requireUser is true, only non-admin users should access
        if (isAdmin) {
          setShouldRender(false)
          setIsLoading(false)
          return
        }
      }

      setShouldRender(true)
      setIsLoading(false)
    } catch (error) {
      setShouldRender(false)
      setIsLoading(false)
    }
  }, [requireAdmin, requireUser])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!shouldRender) {
    if (requireAdmin) {
      return <Navigate to="/calendrier" replace />
    }
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

