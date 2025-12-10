import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import NoelDecorations from '../components/NoelDecorations'
import {
  Bell,
  Moon,
  Sun,
  LogOut
} from 'lucide-react'
import './HomePage.css'

interface HomePageProps {
  disableAnimations?: boolean
  isAdminView?: boolean
}

function HomePage({ disableAnimations = false, isAdminView = false }: HomePageProps) {
  const navigate = useNavigate()
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // Get user information
  useEffect(() => {
    const user = sessionStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        setUserName(userData.name || '')
        setUserRole(userData.role || '')
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    navigate('/login')
  }

  const handleCalendarClick = (calendarPath: string) => {
    navigate(`/${calendarPath}`)
  }

  return (
    <div className={`home-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      {!disableAnimations && <NoelDecorations isDarkMode={isDarkMode} />}
      {!isAdminView && (
      <div className="app-logo">
        <img 
          src="https://cdn.prod.website-files.com/5bf555ae8892f8064dda7415/5fbfc91e9d2e7ae94b22dbb4_logo.svg" 
          alt="Logo" 
          className="logo-image"
        />
      </div>
      )}
      
      <header className={`home-header ${isAdminView ? 'admin-style' : ''}`}>
        <div className="header-content">
          {isAdminView ? (
            <div>
              <h1>Administration - Calendrier</h1>
              <p>Gestion des calendriers</p>
            </div>
          ) : (
          <div>
            <h1>Réservez Votre Rendez-vous</h1>
            <p>Sélectionnez un type de rendez-vous</p>
          </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            {userRole === 'concepteur' && userName && !isAdminView && (
              <div style={{
                fontSize: '16px',
                fontWeight: 500,
                color: isDarkMode ? '#ffffff' : '#111827',
                marginBottom: '4px'
              }}>
                Bienvenue {userName}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {!isAdminView && (
                <button 
                  className="home-button"
                  onClick={() => navigate('/calendrier')}
                  aria-label="Home"
                  title="Accueil"
                >
                  🏠
                </button>
              )}
              {userRole !== 'concepteur' && (
                <button style={{
                position: 'relative',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#333333' : '#e5e7eb'}`,
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#111827'
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280'
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff'
              }}
              >
                <Bell style={{ width: '20px', height: '20px' }} />
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%'
                }}></span>
              </button>
              )}
          <button 
              onClick={toggleDarkMode}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: `1px solid ${isDarkMode ? '#333333' : '#e5e7eb'}`,
                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#111827'
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280'
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff'
              }}
            >
              {isDarkMode ? (
                <Sun style={{ width: '16px', height: '16px' }} />
              ) : (
                <Moon style={{ width: '16px', height: '16px' }} />
              )}
          </button>
          <button 
              onClick={handleLogout}
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#333333' : '#e5e7eb'}`,
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#111827'
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280'
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff'
              }}
            >
              <LogOut style={{ width: '20px', height: '20px' }} />
          </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="home-main">
        <div className="calendar-buttons-container">
          <button 
            className="calendar-button metric-button"
            onClick={() => handleCalendarClick('metre')}
          >
            <div className="button-content">
              <h2>Metré</h2>
              <p>Réservation Metré</p>
            </div>
          </button>
          
          <button 
            className="calendar-button pose-button"
            onClick={() => handleCalendarClick('pose')}
          >
            <div className="button-content">
              <h2>Pose</h2>
              <p>Réservation Pose</p>
            </div>
          </button>
          
          <button 
            className="calendar-button sav-button"
            onClick={() => handleCalendarClick('sav')}
          >
            <div className="button-content">
              <h2>SAV</h2>
              <p>Réservation SAV</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}

export default HomePage
