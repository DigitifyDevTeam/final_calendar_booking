import LoginPage from '../pages/LoginPage'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

function AuthRoute() {
  const navigate = useNavigate()
  
  // Check if user is authenticated
  const user = sessionStorage.getItem('user')
  const isAuthenticated = user ? JSON.parse(user).isAuthenticated : false

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/calendrier')
    }
  }, [isAuthenticated, navigate])

  // If authenticated, redirect to /calendrier, otherwise show LoginPage
  return isAuthenticated ? null : <LoginPage />
}

export default AuthRoute

