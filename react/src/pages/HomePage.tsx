import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import NoelDecorations from '../components/NoelDecorations'
import { getMyMagasin } from '../services/magasinService'
import {
  Bell,
  LogOut,
  Menu,
  X,
  Home,
  Calendar
} from 'lucide-react'
import './HomePage.css'

interface HomePageProps {
  disableAnimations?: boolean
  isAdminView?: boolean
}

function HomePage({ disableAnimations = false, isAdminView = false }: HomePageProps) {
  const navigate = useNavigate()
  const [isDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [userMagasin, setUserMagasin] = useState<string>('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // Handle responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Get user information and load magasin for concepteur
  useEffect(() => {
    const loadUserData = async () => {
      const user = sessionStorage.getItem('user')
      if (!user) return
      
      try {
        const userData = JSON.parse(user)
        setUserName(userData.name || '')
        setUserRole(userData.role || '')
        
        // If user is a concepteur, load their magasin
        if (userData.role === 'concepteur') {
          try {
            console.log('Loading magasin for concepteur')
            const magasin = await getMyMagasin()
            
            if (magasin) {
              console.log('✅ Found magasin for concepteur:', magasin.name)
              setUserMagasin(magasin.name)
            } else {
              console.log('❌ No magasin found for concepteur')
            }
          } catch (error) {
            console.error('❌ Error loading concepteur magasin:', error)
          }
        }
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
    
    loadUserData()
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    navigate('/login')
  }

  const handleCalendarClick = (calendarPath: string) => {
    navigate(`/${calendarPath}`)
  }

  const textColor = isDarkMode ? '#ffffff' : '#111827'
  const textSecondary = isDarkMode ? '#9ca3af' : '#6b7280'
  const borderColor = isDarkMode ? '#BA4E8E' : '#e5e7eb'
  const orangeColor = '#fa541c'

  return (
    <div className={`home-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      {!disableAnimations && userRole !== 'concepteur' && userRole !== 'technicien' && <NoelDecorations isDarkMode={isDarkMode} />}
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            display: isMobile ? 'block' : 'none',
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998
          }}
        />
      )}

      {/* Mobile Header */}
      {isMobile && !isAdminView && (
        <div 
          className="mobile-header"
          style={{
            display: 'flex',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            backgroundColor: isDarkMode ? '#000000' : '#ffffff',
            zIndex: 1000,
            padding: '0 16px',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '8px',
                color: textColor,
                zIndex: 1001,
                position: 'relative'
              }}
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${orangeColor} 0%, #284B73 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar style={{ width: '16px', height: '16px', color: '#ffffff' }} />
            </div>
            <span style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>Accueil</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {userRole !== 'concepteur' && userRole !== 'technicien' && (
              <button 
                style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: textSecondary,
                  cursor: 'pointer'
                }}
              >
                <Bell style={{ width: '18px', height: '18px' }} />
              </button>
            )}
            <button 
              onClick={handleLogout}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: textSecondary,
                cursor: 'pointer'
              }}
            >
              <LogOut style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sidebar */}
      {isMobile && !isAdminView && (
        <nav
          className={`home-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
          style={{
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            bottom: 0,
            height: 'calc(100vh - 60px)',
            width: '100%',
            maxWidth: '100%',
            borderRight: `1px solid ${borderColor}`,
            backgroundColor: isDarkMode ? '#000000' : '#ffffff',
            padding: '16px',
            transition: 'transform 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
            zIndex: 999,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Logo Section */}
          <div style={{
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 8px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(40, 75, 115, 0.3)',
              overflow: 'hidden'
            }}>
              <img
                src="/favicon.svg"
                alt="Logo"
                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>Calendrier</div>
              <div style={{ fontSize: '12px', color: textSecondary }}>Navigation</div>
            </div>
          </div>

          {/* Navigation Items */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px' }}>
            <button
              onClick={() => {
                navigate('/calendrier')
                setMobileMenuOpen(false)
              }}
              style={{
                width: '100%',
                height: '48px',
                minHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: textSecondary,
                transition: 'all 0.2s',
                fontSize: '15px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
                e.currentTarget.style.color = textColor
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = textSecondary
              }}
            >
              <Home style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <span>Accueil</span>
            </button>

            <button
              onClick={() => {
                handleCalendarClick('metre')
                setMobileMenuOpen(false)
              }}
              style={{
                width: '100%',
                height: '48px',
                minHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: textSecondary,
                transition: 'all 0.2s',
                fontSize: '15px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
                e.currentTarget.style.color = textColor
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = textSecondary
              }}
            >
              <Calendar style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <span>Metré</span>
            </button>

            <button
              onClick={() => {
                handleCalendarClick('pose')
                setMobileMenuOpen(false)
              }}
              style={{
                width: '100%',
                height: '48px',
                minHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: textSecondary,
                transition: 'all 0.2s',
                fontSize: '15px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
                e.currentTarget.style.color = textColor
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = textSecondary
              }}
            >
              <Calendar style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <span>Pose</span>
            </button>

            <button
              onClick={() => {
                handleCalendarClick('sav')
                setMobileMenuOpen(false)
              }}
              style={{
                width: '100%',
                height: '48px',
                minHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: textSecondary,
                transition: 'all 0.2s',
                fontSize: '15px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
                e.currentTarget.style.color = textColor
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = textSecondary
              }}
            >
              <Calendar style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <span>SAV</span>
            </button>
          </div>

          {/* Logout Section */}
          <div style={{
            borderTop: `1px solid ${borderColor}`,
            paddingTop: '16px',
            paddingBottom: '8px',
            paddingLeft: '8px',
            paddingRight: '8px'
          }}>
            <button
              onClick={() => {
                handleLogout()
                setMobileMenuOpen(false)
              }}
              style={{
                width: '100%',
                height: '48px',
                minHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: textSecondary,
                transition: 'all 0.2s',
                fontSize: '15px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
                e.currentTarget.style.color = textColor
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = textSecondary
              }}
            >
              <LogOut style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <span>Déconnexion</span>
            </button>
          </div>
        </nav>
      )}

      {!isAdminView && (
      <div className="app-logo" style={{ display: isMobile ? 'none' : 'flex' }}>
        <img 
          src="/logo.svg" 
          alt="Logo" 
          className="logo-image"
        />
      </div>
      )}
      
      <header className={`home-header ${isAdminView ? 'admin-style' : ''}`} style={{ paddingTop: isMobile && !isAdminView ? '60px' : '0' }}>
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
          <div style={{ display: isMobile && !isAdminView ? 'none' : 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            {userRole === 'concepteur' && userName && !isAdminView && (
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px'
              }}>
                <button
                  type="button"
                  onClick={() => navigate('/rechercher')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${isDarkMode ? '#284B73' : '#284B73'}`,
                    backgroundColor: isDarkMode ? 'transparent' : '#284B73',
                    color: isDarkMode ? '#284B73' : '#ffffff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Rechercher
                </button>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '2px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    color: isDarkMode ? '#ffffff' : '#111827',
                    marginBottom: '0'
                  }}>
                    Bienvenue <span style={{ color: '#284B73' }}>{userName}</span>
                  </div>
                  {userMagasin ? (
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      color: isDarkMode ? '#ffffff' : '#111827',
                      marginTop: '0'
                    }}>
                      chez <span style={{ color: '#284B73' }}>{userMagasin}</span>
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 400,
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      opacity: 0.6,
                      fontStyle: 'italic'
                    }}>
                      (chargement...)
                    </div>
                  )}
                </div>
              </div>
            )}
            {userRole === 'technicien' && userName && !isAdminView && (
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px'
              }}>
                <button
                  type="button"
                  onClick={() => navigate('/rechercher')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${isDarkMode ? '#284B73' : '#284B73'}`,
                    backgroundColor: isDarkMode ? 'transparent' : '#284B73',
                    color: isDarkMode ? '#284B73' : '#ffffff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Rechercher
                </button>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '2px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    color: isDarkMode ? '#ffffff' : '#111827',
                    marginBottom: '0'
                  }}>
                    Bienvenue <span style={{ color: '#284B73' }}>{userName}</span>
                  </div>
                </div>
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
              {userRole !== 'concepteur' && userRole !== 'technicien' && (
                <button style={{
                position: 'relative',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#BA4E8E' : '#e5e7eb'}`,
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
                  backgroundColor: '#284B73',
                  borderRadius: '50%'
                }}></span>
              </button>
              )}
        {/* Dark mode toggle removed - always light mode */}
          <button 
              onClick={handleLogout}
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#BA4E8E' : '#e5e7eb'}`,
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
      
      <main className="home-main" style={{ paddingTop: isMobile && !isAdminView ? '0' : '0' }}>
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
