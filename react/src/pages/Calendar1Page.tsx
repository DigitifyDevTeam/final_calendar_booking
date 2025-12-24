import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Calendar from '../components/Calendar'
import BookingModal from '../components/BookingModal'
import NoelDecorations from '../components/NoelDecorations'
import { addBooking, getBinId as getBinIdFromConfig, type BookingData, getAllBookings, getAllHolidays, BookingRecord, HolidayRecord } from '../services/bookingService'
import { getAllUsers, UserRecord } from '../services/userService'
import { Sun, Moon, LogOut } from 'lucide-react'
import '../App.css'

interface Calendar1PageProps {
  disableAnimations?: boolean
  isAdminView?: boolean
}

function Calendar1Page({ disableAnimations = false, isAdminView = false }: Calendar1PageProps) {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null)
  const [loadingNotification, setLoadingNotification] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [usersList, setUsersList] = useState<UserRecord[]>([])
  const [existingBookings, setExistingBookings] = useState<BookingRecord[]>([])
  const [holidays, setHolidays] = useState<HolidayRecord[]>([])

  // Get the bin ID for calendar1 - ensures it uses its own data
  const binId = getBinIdFromConfig('calendar1')

  // Check if user is admin and load users list
  useEffect(() => {
    const user = sessionStorage.getItem('user')
    if (user) {
      const userData = JSON.parse(user)
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

  // Load bookings and holidays for duration availability calculation
  const loadBookingsAndHolidays = async () => {
    try {
      const [bookings, holidaysData] = await Promise.all([
        getAllBookings(binId),
        getAllHolidays(binId)
      ])
      setExistingBookings(bookings)
      setHolidays(holidaysData)
    } catch (error) {
      console.error('Error loading bookings/holidays:', error)
    }
  }

  useEffect(() => {
    loadBookingsAndHolidays()
  }, [binId, refreshTrigger])

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

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    navigate('/')
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedDate(null)
  }

  // Helper function to add days to a date
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  // Helper function to format date as YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Calculate which dates to book based on duration and availability
  const calculateBookingDates = (startDate: Date, duration: number): string[] => {
    const dates: string[] = []

    // Helper to check if date is a holiday
    const isHoliday = (date: Date): boolean => {
      const dateStr = formatDateString(date)
      return holidays.some(h => h.holiday_date === dateStr)
    }

    // Helper to check if date is Sunday (dimanche)
    const isSunday = (date: Date): boolean => {
      return date.getDay() === 0
    }

    // Helper to check if date is invalid (holiday or Sunday)
    const isInvalidDay = (date: Date): boolean => {
      return isHoliday(date) || isSunday(date)
    }

    // Get the next valid day (skipping holidays and Sundays)
    const getNextValidDay = (startDate: Date, skipCount: number = 1): Date => {
      let currentDate = addDays(startDate, skipCount)
      let attempts = 0
      const maxAttempts = 14 // Prevent infinite loop
      
      while (isInvalidDay(currentDate) && attempts < maxAttempts) {
        currentDate = addDays(currentDate, 1)
        attempts++
      }
      
      return currentDate
    }

    if (duration === 1) {
      // Duration 1: 1 reservation on current day
      dates.push(formatDateString(startDate))
    } else if (duration === 2) {
      // Duration 2: 1 reservation on current day + 1 reservation on next valid day (skipping holidays and Sundays)
      dates.push(formatDateString(startDate))
      const nextValidDay = getNextValidDay(startDate, 1)
      dates.push(formatDateString(nextValidDay))
    } else if (duration === 3) {
      // Duration 3: 1 reservation on current day + 1 on next valid day + 1 on day after next valid day (skipping holidays and Sundays)
      dates.push(formatDateString(startDate))
      const nextValidDay = getNextValidDay(startDate, 1)
      dates.push(formatDateString(nextValidDay))
      const dayAfterNextValid = getNextValidDay(nextValidDay, 1)
      dates.push(formatDateString(dayAfterNextValid))
    }

    return dates
  }

  const handleBookingSubmit = async (bookingData: BookingData) => {
    console.log('Booking submitted:', bookingData)
    
    try {
      // Show loading state
      setLoadingNotification('Traitement de votre réservation...')
      
      const duration = parseInt(bookingData.duree || '1') || 1
      
      if (duration === 1) {
        // Single booking - existing logic
        await addBooking(bookingData, binId)
      } else {
        // Multiple bookings based on duration
        const bookingDates = calculateBookingDates(bookingData.selectedDate, duration)
        console.log(`[Calendar1Page] Creating ${bookingDates.length} bookings for duration ${duration}:`, bookingDates)
        
        // Create all bookings sequentially
        for (const dateStr of bookingDates) {
          const bookingForDate = {
            ...bookingData,
            date: dateStr
          }
          await addBooking(bookingForDate, binId)
          // Small delay between bookings to avoid race conditions
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      // Wait a bit to ensure API has processed all bookings
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Clear loading notification
      setLoadingNotification(null)
      
      const durationText = duration > 1 ? ` (${duration} réservations créées)` : ''
      setNotificationMessage(`✅ Réservation confirmée${durationText}. ⚠️ ATTENTION cette réservation ne remplace pas l\'envoi du dossier via smart`)
      
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
        <div 
          className="header-content" 
          style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', minWidth: '80px' }}>
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
          
          <div style={{ textAlign: 'center', gridColumn: 2 }}>
            {isAdminView ? (
              <div>
                <h1>Administration - Pose</h1>
                <p>Gestion des réservations Pose</p>
              </div>
            ) : (
            <div>
              <h1>Réservez Votre Rendez-vous de Pose</h1>
              <p>Sélectionnez une date pour réserver votre rendez-vous</p>
            </div>
            )}
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            justifyContent: 'flex-end', 
            minWidth: '120px'
          }}
          className="desktop-header-icons"
          >
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
      </header>
      
      <main className="app-main">
        <Calendar 
          onDateSelect={handleDateSelect} 
          isDarkMode={isDarkMode} 
          refreshTrigger={refreshTrigger}
          binId={binId}
          view="monthly"
          showTimeSlots={false}
          timeSlotType="basic"
        />
      </main>

      {isModalOpen && selectedDate && (
        <BookingModal
          selectedDate={selectedDate}
          onClose={handleCloseModal}
          onSubmit={handleBookingSubmit}
          isDarkMode={isDarkMode}
          users={isAdmin ? usersList : []}
          existingBookings={existingBookings.map(b => ({ date: b.date }))}
          holidays={holidays.map(h => ({ holiday_date: h.holiday_date }))}
          maxBookingsPerDay={2}
          showDurationField={true}
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

export default Calendar1Page

