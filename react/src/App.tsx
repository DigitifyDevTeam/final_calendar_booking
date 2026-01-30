import { useState, useEffect } from 'react'
import Calendar from './components/Calendar'
import BookingModal from './components/BookingModal'
import { addBooking, type BookingData } from './services/bookingService'
import './App.css'

function App() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedDate(null)
  }

  const handleBookingSubmit = async (bookingData: BookingData) => {
    console.log('Booking submitted:', bookingData)
    
    try {
      // Show loading state
      alert('Traitement de votre réservation...')
      
      // Persist the booking locally (until backend is available)
      await addBooking(bookingData)
      
      alert('✅ Réservation confirmée !')
      
      // Force calendar refresh to show updated booking count (without reloading page)
      setRefreshTrigger(prev => prev + 1)
      
    } catch (error) {
      console.error('Booking submission error:', error)
      
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
      <div className="app-logo">
        <img 
          src="/logo.svg" 
          alt="Logo" 
          className="logo-image"
        />
      </div>
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>Réservez Votre Rendez-vous</h1>
            <p>Sélectionnez une date pour réserver votre rendez-vous</p>
          </div>
          <button 
            className="theme-toggle"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? '🌙' : '☀️'}
          </button>
        </div>
      </header>
      
      <main className="app-main">
        <Calendar onDateSelect={handleDateSelect} isDarkMode={isDarkMode} refreshTrigger={refreshTrigger} />
      </main>

      {isModalOpen && selectedDate && (
        <BookingModal
          selectedDate={selectedDate}
          onClose={handleCloseModal}
          onSubmit={handleBookingSubmit}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  )
}

export default App
