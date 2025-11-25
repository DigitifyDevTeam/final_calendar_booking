import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import ProtectedRoute from './components/ProtectedRoute'
import RoleBasedRoute from './components/RoleBasedRoute'
import CalendarRoute from './components/CalendarRoute'
import MetreRoute from './components/MetreRoute'
import PoseRoute from './components/PoseRoute'
import SavRoute from './components/SavRoute'
import LoginPage from './pages/LoginPage'
import DashbordPage from './pages/DashbordPage'
import UtilisateursPage from './pages/UtilisateursPage'
import SettingsPage from './pages/SettingsPage'
import HolidaysPage from './pages/HolidaysPage'
import './utils/resetBookings' // Makes resetAllBookings() available in browser console

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleBasedRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/calendrier" element={<ProtectedRoute><CalendarRoute /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute requireAdmin={true}><DashbordPage /></ProtectedRoute>} />
        <Route path="/réservation" element={<ProtectedAdminRoute />} />
        <Route path="/jours-feries" element={<ProtectedRoute requireAdmin={true}><HolidaysPage /></ProtectedRoute>} />
        <Route path="/utilisateurs" element={<ProtectedRoute requireAdmin={true}><UtilisateursPage /></ProtectedRoute>} />
        <Route path="/parametres" element={<ProtectedRoute requireAdmin={true}><SettingsPage /></ProtectedRoute>} />
        <Route path="/pose" element={<ProtectedRoute><PoseRoute /></ProtectedRoute>} />
        <Route path="/sav" element={<ProtectedRoute><SavRoute /></ProtectedRoute>} />
        <Route path="/metre" element={<ProtectedRoute><MetreRoute /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
