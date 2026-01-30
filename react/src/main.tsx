import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import ProtectedRoute from './components/ProtectedRoute'
import RoleBasedRoute from './components/RoleBasedRoute'
import CalendarRoute from './components/CalendarRoute'
import MetreRoute from './components/MetreRoute'
import PoseRoute from './components/PoseRoute'
import SavRoute from './components/SavRoute'
import LoginPage from './pages/LoginPage'
import DashbordPage from './pages/DashbordPage'
import AdminPage from './pages/AdminPage'
import UtilisateursPage from './pages/UtilisateursPage'
import SettingsPage from './pages/SettingsPage'
import HolidaysPage from './pages/HolidaysPage'
import MagasinsPage from './pages/MagasinsPage'
import RecherchePage from './pages/RecherchePage'
import './utils/resetBookings' // Makes resetAllBookings() available in browser console

// Force light mode as the only theme
localStorage.setItem('darkMode', JSON.stringify(false))
document.documentElement.setAttribute('data-theme', 'light')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleBasedRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/calendrier" element={<ProtectedRoute><CalendarRoute /></ProtectedRoute>} />
        <Route path="/rechercher" element={<ProtectedRoute><RecherchePage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute requireAdmin={true}><DashbordPage /></ProtectedRoute>} />
        <Route path="/réservation" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/jours-feries" element={<ProtectedRoute requireAdmin={true}><HolidaysPage /></ProtectedRoute>} />
        <Route path="/utilisateurs" element={<ProtectedRoute requireAdmin={true}><UtilisateursPage /></ProtectedRoute>} />
        <Route path="/magasins" element={<ProtectedRoute requireAdmin={true}><MagasinsPage /></ProtectedRoute>} />
        <Route path="/parametres" element={<ProtectedRoute requireAdmin={true}><SettingsPage /></ProtectedRoute>} />
        <Route path="/pose" element={<ProtectedRoute><PoseRoute /></ProtectedRoute>} />
        <Route path="/sav" element={<ProtectedRoute><SavRoute /></ProtectedRoute>} />
        <Route path="/metre" element={<ProtectedRoute><MetreRoute /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
