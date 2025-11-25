import { useEffect, useState } from 'react'
import HomePage from '../pages/HomePage'
import DashbordPage from '../pages/DashbordPage'

function CalendarRoute() {
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

  // If admin, render DashbordPage (which will show HomePage content when pathname is /calendrier)
  // If regular user, render HomePage directly
  return isAdmin ? <DashbordPage /> : <HomePage />
}

export default CalendarRoute

