import { useEffect, useState } from 'react'
import Calendar1Page from '../pages/Calendar1Page'
import DashbordPage from '../pages/DashbordPage'

function PoseRoute() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        setIsAdmin(userData.role === 'admin')
      } catch (e) {
        setIsAdmin(false)
      }
    }
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  // If admin, render DashbordPage (which will show Calendar1Page content when pathname is /pose)
  // If regular user, render Calendar1Page directly
  return isAdmin ? <DashbordPage /> : <Calendar1Page />
}

export default PoseRoute

