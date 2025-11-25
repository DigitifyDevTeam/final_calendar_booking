import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Calendar from '../components/Calendar'
import BookingModal from '../components/BookingModal'
import NoelDecorations from '../components/NoelDecorations'
import { addBooking, getBinId as getBinIdFromConfig, type BookingData } from '../services/bookingService'
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

  // Get the bin ID for calendar3 - ensures it uses its own data
  const binId = getBinIdFromConfig('calendar3')

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

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
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
      <header className={`app-header ${isAdminView ? 'admin-style' : ''}`}>
        <div className="header-content">
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
          {!isAdminView && (
            <>
          <button 
            className="home-button"
            onClick={() => navigate('/')}
            aria-label="Home"
            title="Accueil"
          >
            🏠
          </button>
          <button 
            className="theme-toggle"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? '🌙' : '☀️'}
          </button>
            </>
          )}
        </div>
      </header>
      
      <main className="app-main">
        <Calendar 
          onDateSelect={handleDateSelect} 
          isDarkMode={isDarkMode} 
          refreshTrigger={refreshTrigger}
          binId={binId}
          view="weekly"
          timeSlotType="numerical"
        />
      </main>

      {isModalOpen && selectedDate && (
        <BookingModal
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
          onClose={handleCloseModal}
          onSubmit={handleBookingSubmit}
          isDarkMode={isDarkMode}
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

