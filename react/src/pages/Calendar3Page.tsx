import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Calendar from '../components/Calendar'
import BookingModal from '../components/BookingModal'
import NoelDecorations from '../components/NoelDecorations'
import { addBooking, getBinId as getBinIdFromConfig, type BookingData } from '../services/bookingService'
import { getAllUsers, UserRecord } from '../services/userService'
import { LogOut, Search, X } from 'lucide-react'
import '../App.css'

interface Calendar3PageProps {
  disableAnimations?: boolean
  isAdminView?: boolean
}

function Calendar3Page({ disableAnimations = false, isAdminView = false }: Calendar3PageProps) {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null)
  const [loadingNotification, setLoadingNotification] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [userRole, setUserRole] = useState<string>('')
  const [usersList, setUsersList] = useState<UserRecord[]>([])
  const [clientSearch, setClientSearch] = useState<string>('')

  // Get the bin ID for calendar3 - ensures it uses its own data
  const binId = getBinIdFromConfig('calendar3')

  // Check if user is admin and load users list
  useEffect(() => {
    const user = sessionStorage.getItem('user')
    if (user) {
      const userData = JSON.parse(user)
      setUserRole(userData.role || '')
      if (userData.role === 'admin') {
        setIsAdmin(true)
        loadUsersList()
      }
    }
  }, [])

  const loadUsersList = async () => {
    try {
      const users = await getAllUsers()
      setUsersList(users)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }


  useEffect(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [binId])

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // Listen for dark mode changes from admin sidebar
  useEffect(() => {
    const handleDarkModeChange = (event: CustomEvent) => {
      const newDarkMode = event.detail.isDarkMode
      if (newDarkMode !== isDarkMode) {
        setIsDarkMode(newDarkMode)
      }
    }

    window.addEventListener('darkModeChanged', handleDarkModeChange as EventListener)

    return () => {
      window.removeEventListener('darkModeChanged', handleDarkModeChange as EventListener)
    }
  }, [isDarkMode])

  // Note: confirmation notification (notificationMessage) does not auto-dismiss
  // Only loading notification (loadingNotification) auto-dismisses

  // Auto-dismiss loading notification after 3 seconds
  useEffect(() => {
    if (loadingNotification) {
      const timer = setTimeout(() => {
        setLoadingNotification(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [loadingNotification])

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    navigate('/')
  }

  const handleDateSelect = (date: Date, timeSlot?: string) => {
    setSelectedDate(date)
    setSelectedTimeSlot(timeSlot)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedDate(null)
    setSelectedTimeSlot(undefined)
  }

  const handleBookingSubmit = async (bookingData: BookingData) => {
    console.log('Booking submitted:', bookingData)
    
    try {
      // Show loading state
      setLoadingNotification('Traitement de votre réservation...')
      
      // Persist the booking locally for this calendar
      await addBooking(bookingData, binId)
      
      // Wait a bit to ensure API has processed the booking
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Clear loading notification
      setLoadingNotification(null)
      
      setNotificationMessage('✅ Réservation confirmée. ⚠️ ATTENTION cette réservation ne remplace pas l\'envoi du dossier via smart')
      
      // Force calendar refresh to show updated booking count (without reloading page)
      // Add a small delay to ensure the API has fully processed the booking
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1)
      }, 300)
      
    } catch (error) {
      console.error('Booking submission error:', error)
      setLoadingNotification(null)
      
      if (error instanceof Error && error.message) {
        alert(`❌ ${error.message}`)
      } else {
        alert('❌ Une erreur s\'est produite lors de la soumission de votre réservation. Veuillez réessayer.')
      }
    }
    
    handleCloseModal()
  }

  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      {!disableAnimations && userRole !== 'concepteur' && userRole !== 'technicien' && <NoelDecorations isDarkMode={isDarkMode} />}
      {!isAdminView && (
      <div className="app-logo">
        <img 
          src="/logo.svg" 
          alt="Logo" 
          className="logo-image"
        />
      </div>
      )}
      <header className={`app-header ${isAdminView ? 'admin-style' : ''}`}>
        <div className="header-content" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', minWidth: '50px' }}>
            {!isAdminView && (
              <button 
                className="home-button"
                onClick={() => navigate('/')}
                aria-label="Home"
                title="Accueil"
              >
                🏠
              </button>
            )}
          </div>
          
          <div style={{ textAlign: 'center', gridColumn: 2, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            {isAdminView ? (
              <div>
                <h1>Administration - Metré</h1>
                <p>Gestion des réservations Metré</p>
              </div>
            ) : (
            <div>
              <h1>Réservez Votre Rendez-vous de Metré</h1>
              <p>Sélectionnez une date pour réserver votre rendez-vous</p>
            </div>
            )}
            {(userRole === 'concepteur' || userRole === 'technicien') && (
              <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '400px',
                marginTop: '8px'
              }}>
                <Search style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  pointerEvents: 'none',
                  zIndex: 1
                }} />
                <input
                  type="text"
                  placeholder="Rechercher par nom de client..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 40px',
                    borderRadius: '10px',
                    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    color: isDarkMode ? '#f9fafb' : '#111827',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxShadow: isDarkMode ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                />
                {clientSearch && (
                  <button
                    onClick={() => {
                      setClientSearch('')
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      transition: 'all 0.2s',
                      zIndex: 2
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#f3f4f6'
                      e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#111827'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280'
                    }}
                  >
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              justifyContent: 'flex-end', 
              minWidth: '100px'
            }}
            className="desktop-header-icons"
          >
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
      </header>
      
      <main className="app-main">
        <Calendar 
          onDateSelect={handleDateSelect} 
          isDarkMode={isDarkMode} 
          refreshTrigger={refreshTrigger}
          binId={binId}
          view="weekly"
          timeSlotType="sav"
          clientSearch={clientSearch}
        />
      </main>

      {isModalOpen && selectedDate && (
        <BookingModal
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
          onClose={handleCloseModal}
          onSubmit={handleBookingSubmit}
          isDarkMode={isDarkMode}
          users={isAdmin ? usersList : []}
          calendarId={binId}
        />
      )}

      {notificationMessage && (
        <div className="notification-toast persistent">
          <div>{notificationMessage}</div>
          <button 
            className="notification-toast-button"
            onClick={() => setNotificationMessage(null)}
          >
            j'ai compris
          </button>
        </div>
      )}

      {loadingNotification && (
        <div className="notification-toast">
          {loadingNotification}
        </div>
      )}
    </div>
  )
}

export default Calendar3Page

