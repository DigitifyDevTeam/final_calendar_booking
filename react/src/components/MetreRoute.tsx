import { useEffect, useState } from 'react'
import Calendar3Page from '../pages/Calendar3Page'
import DashbordPage from '../pages/DashbordPage'

function MetreRoute() {
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

  // If admin, render DashbordPage (which will show Calendar3Page content when pathname is /metre)
  // If regular user, render Calendar3Page directly
  return isAdmin ? <DashbordPage /> : <Calendar3Page />
}

export default MetreRoute

