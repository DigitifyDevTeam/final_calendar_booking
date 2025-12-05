import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

function RoleBasedRoute() {
  const [isLoading, setIsLoading] = useState(true)
  const [component, setComponent] = useState<React.ReactNode>(null)

  useEffect(() => {
    const user = sessionStorage.getItem('user')
    
    if (!user) {
      setComponent(<Navigate to="/login" replace />)
      setIsLoading(false)
      return
    }

    try {
      const userData = JSON.parse(user)
      const isAuthenticated = userData.isAuthenticated
      const isAdmin = userData.role === 'admin'

      if (!isAuthenticated) {
        setComponent(<Navigate to="/login" replace />)
        setIsLoading(false)
        return
      }

      // Admin goes to dashboard, regular users go to calendars
      if (isAdmin) {
        setComponent(<Navigate to="/dashboard" replace />)
      } else {
        setComponent(<Navigate to="/calendrier" replace />)
      }
      setIsLoading(false)
    } catch (error) {
      setComponent(<Navigate to="/login" replace />)
      setIsLoading(false)
    }
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return <>{component}</>
}

export default RoleBasedRoute

