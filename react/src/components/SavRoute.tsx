import { useEffect, useState } from 'react'
import Calendar2Page from '../pages/Calendar2Page'
import DashbordPage from '../pages/DashbordPage'

function SavRoute() {
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

  // If admin, render DashbordPage (which will show Calendar2Page content when pathname is /sav)
  // If regular user, render Calendar2Page directly
  return isAdmin ? <DashbordPage /> : <Calendar2Page />
}

export default SavRoute

