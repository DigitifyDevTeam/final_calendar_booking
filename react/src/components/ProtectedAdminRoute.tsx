import { Navigate } from 'react-router-dom'
import AdminPage from '../pages/AdminPage'

function ProtectedAdminRoute() {
  // Check if user is authenticated and is admin
  const user = localStorage.getItem('user')
  
  if (!user) {
    return <Navigate to="/login" replace />
  }

  const userData = JSON.parse(user)
  
  if (userData.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <AdminPage />
}

export default ProtectedAdminRoute

