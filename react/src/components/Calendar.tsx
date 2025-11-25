import React, { useState, useEffect, useRef } from 'react'
import './Calendar.css'
import { getAllBookings, BookingRecord, getMaxBookingsPerDay, usesTimeSlots, getAllHolidays, HolidayRecord, updateBooking, deleteBooking } from '../services/bookingService'
import BookingModal from './BookingModal'

// Orange info icon component
const InfoIcon: React.FC = () => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '100%', display: 'block' }}
  >
    <circle cx="12" cy="12" r="10" stroke="#fa541c" strokeWidth="2" fill="none"/>
    <path d="M12 16V12" stroke="#fa541c" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="8" r="1" fill="#fa541c"/>
  </svg>
)

interface CalendarProps {
  onDateSelect: (date: Date, timeSlot?: string) => void
  isDarkMode?: boolean
  refreshTrigger?: number // When this changes, refresh booking counts
  binId?: string // Unique identifier for this calendar's data
  view?: 'monthly' | 'weekly' // View mode for the calendar
  showTimeSlots?: boolean // Show time slot boxes
  timeSlotType?: 'basic' | 'numerical' | 'pose' | 'sav' // Time slot display type
}

const Calendar: React.FC<CalendarProps> = ({ onDateSelect, isDarkMode = true, refreshTrigger, binId, view = 'monthly', showTimeSlots = true, timeSlotType = 'numerical' }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  
  const [bookingCounts, setBookingCounts] = useState<{[key: string]: number}>({})
  
  // Track if booking data has been loaded (to prevent showing dates as available before we know their status)
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false)
  
  // Track which time slots are booked (format: "date|timeSlot" -> true)
  const [bookedTimeSlots, setBookedTimeSlots] = useState<{[key: string]: boolean}>({})
  // Store booking details for admin view (format: "date|timeSlot" -> BookingRecord)
  const [bookingDetails, setBookingDetails] = useState<{[key: string]: BookingRecord}>({})
  // Store all bookings for admin view (to get all names for Pose calendar)
  const [allBookingsData, setAllBookingsData] = useState<BookingRecord[]>([])
  const [isTechnicien, setIsTechnicien] = useState<boolean>(false)
  const [isRegularUser, setIsRegularUser] = useState<boolean>(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  // Track holidays/invalid days (format: "date" -> true)
  const [holidays, setHolidays] = useState<{[key: string]: boolean}>({})
  // Track editing/deleting bookings for Technicien
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)
  // Track info popup state
  const [infoPopup, setInfoPopup] = useState<{x: number, y: number, names: string[], date: Date, timeSlot?: string} | null>(null)

  // Refs to prevent duplicate API calls from React StrictMode double-invocation
  const holidaysLoadingRef = useRef<string | null>(null)
  const bookingsLoadingRef = useRef<string | null>(null)

  // Check if user is admin, Technicien, or regular user
  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      const userData = JSON.parse(user)
      setIsTechnicien(userData.role === 'technicien')
      setIsRegularUser(userData.role !== 'admin' && userData.role !== 'technicien')
      setUserEmail(userData.email || '')
      setUserName(userData.name || userData.email || '')
      console.log('=== CALENDAR USER INFO ===', {
        role: userData.role,
        email: userData.email,
        name: userData.name,
        isTechnicien: userData.role === 'technicien'
      })
    } else {
      console.log('=== CALENDAR USER INFO === No user found in localStorage')
    }
  }, [])

  const monthNames: string[] = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ]


  // Convert JavaScript day (0=Sunday, 6=Saturday) to header index (0=Monday, 6=Sunday)
  const getDayIndex = (day: number): number => {
    // Sunday (0) -> 6, Monday (1) -> 0, Tuesday (2) -> 1, etc.
    return day === 0 ? 6 : day - 1
  }

  // Get all days of the current month with proper alignment
  const getMonthDays = (date: Date): (Date | null)[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1)
    const firstDayIndex = getDayIndex(firstDay.getDay())
    
    const days: (Date | null)[] = []
    
    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null)
    }
    
    // Add all days from 1 to last day of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  // Get all days of the current week
  const getWeekDays = (date: Date): Date[] => {
    const currentDay = date.getDay() // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay // Adjust to Monday as start of week
    
    const monday = new Date(date)
    monday.setDate(date.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)
    
    const weekDays: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      weekDays.push(day)
    }
    
    return weekDays
  }

  const handleDateClick = (date: Date, timeSlot?: string) => {
    onDateSelect(date, timeSlot)
  }

  const navigateMonth = (direction: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate)
      newDate.setMonth(prevDate.getMonth() + direction)
      return newDate
    })
  }

  const navigateWeek = (direction: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate)
      newDate.setDate(prevDate.getDate() + (direction * 7))
      return newDate
    })
  }


  const isPastDate = (date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // Check if a date is Sunday (day 0 in JavaScript)
  const isSunday = (date: Date): boolean => {
    return date.getDay() === 0
  }

  // Check if a date is a holiday
  const isHolidayDate = (date: Date): boolean => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    return holidays[dateString] || false
  }

  // Check if a date should be disabled (past date, Sunday, or holiday)
  const isDisabledDate = (date: Date): boolean => {
    return isPastDate(date) || isSunday(date) || isHolidayDate(date)
  }

  const monthDays = view === 'monthly' ? getMonthDays(currentDate) : []
  const weekDays = view === 'weekly' ? getWeekDays(currentDate) : []

  // Load holidays for this calendar
  useEffect(() => {
    // Create a unique key for this request to prevent duplicate calls from React StrictMode
    const requestKey = `holidays_${binId}_${refreshTrigger}`
    
    // Skip if we're already loading this exact request
    if (holidaysLoadingRef.current === requestKey) {
      return
    }

    holidaysLoadingRef.current = requestKey

    const loadHolidays = async () => {
      try {
        const allHolidays = await getAllHolidays(binId)
        const holidayMap: {[key: string]: boolean} = {}
        allHolidays.forEach((holiday: HolidayRecord) => {
          holidayMap[holiday.holiday_date] = true
        })
        setHolidays(holidayMap)
      } catch (error) {
        console.error('Error loading holidays:', error)
        setHolidays({})
      } finally {
        // Only clear if this is still the current request (prevents race conditions)
        if (holidaysLoadingRef.current === requestKey) {
          holidaysLoadingRef.current = null
        }
      }
    }

    loadHolidays()

    return () => {
      // Cleanup: only clear if this is still the current request
      if (holidaysLoadingRef.current === requestKey) {
        holidaysLoadingRef.current = null
      }
    }
  }, [refreshTrigger, binId])

  // Load booking counts for ALL dates from storage (not just visible month)
  // This ensures fully-booked days in other months appear gray immediately when navigating
  useEffect(() => {
    // Create a unique key for this request to prevent duplicate calls from React StrictMode
    const requestKey = `bookings_${binId}_${refreshTrigger}`
    
    // Skip if we're already loading this exact request
    if (bookingsLoadingRef.current === requestKey) {
      return
    }

    bookingsLoadingRef.current = requestKey

    const loadBookingCounts = async () => {
      try {
        // Fetch all bookings for this calendar
        const allBookings = await getAllBookings(binId)
        
        // Get today's date (without time) for comparison
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Calculate counts for ALL dates (all months), not just visible month
        // This way when user navigates to December, fully-booked dates are already gray
        // IMPORTANT: Only count bookings for future dates (exclude past dates)
        const counts: {[key: string]: number} = {}
        const slots: {[key: string]: boolean} = {}
        const details: {[key: string]: BookingRecord} = {}
        
        allBookings.forEach((booking: BookingRecord) => {
          // Parse booking date and compare with today
          const bookingDate = new Date(booking.date + 'T00:00:00')
          bookingDate.setHours(0, 0, 0, 0)
          
          // Only count bookings for today or future dates (exclude past dates)
          if (bookingDate >= today) {
            // For calendars with time slots (calendar2/SAV and calendar3/Metré), only count if time slot is present
            // For calendar1/Pose, count all bookings
            if (usesTimeSlots(binId)) {
              // Only count bookings that have a valid time slot (not empty or default)
              if (booking.time && booking.time.trim() && booking.time !== '21h00') {
                const normalizedTime = booking.time.trim().toLowerCase()
                const slotKey = `${booking.date}|${normalizedTime}`
                slots[slotKey] = true
                details[slotKey] = booking // Store booking details for admin
                // Don't increment counts for time-slot calendars (they're tracked per slot)
              }
            } else {
              // For Pose calendar (calendar1), count all bookings per date
              counts[booking.date] = (counts[booking.date] || 0) + 1
            }
          }
        })
        
        console.log(`[Calendar] Loaded ${allBookings.length} bookings for calendar: ${binId}`)
        console.log(`[Calendar] All bookings:`, allBookings)
        console.log(`[Calendar] Booking counts for ${Object.keys(counts).length} future dates:`, counts)
        console.log(`[Calendar] Booked time slots:`, slots)
        console.log(`[Calendar] Today's date:`, today.toISOString().split('T')[0])
        
        // Debug: Check specifically for 2025-11-18
        if (counts['2025-11-18']) {
          console.log(`[Calendar] DEBUG: Found ${counts['2025-11-18']} bookings for 2025-11-18`)
        } else {
          console.log(`[Calendar] DEBUG: No bookings found for 2025-11-18 in counts`)
        }
        
        setBookingCounts(counts)
        setBookedTimeSlots(slots)
        setBookingDetails(details)
        setAllBookingsData(allBookings) // Store all bookings for admin view
        
        // Mark data as loaded
        setIsDataLoaded(true)
      } catch (error) {
        console.error('Error loading booking counts:', error)
        // On error, keep existing counts from localStorage if available (calendar-specific only)
        if (binId) {
          const storageKey = `booking_calendar_data_${binId}`
          const hasLocalStorageData = localStorage.getItem(storageKey)
          if (!hasLocalStorageData) {
            setBookingCounts({})
            setBookedTimeSlots({})
          }
        } else {
          setBookingCounts({})
          setBookedTimeSlots({})
        }
        
        // Still mark as loaded even on error (to show dates, even if with 0 bookings)
        setIsDataLoaded(true)
      } finally {
        // Only clear if this is still the current request (prevents race conditions)
        if (bookingsLoadingRef.current === requestKey) {
          bookingsLoadingRef.current = null
        }
      }
    }

    loadBookingCounts()

    return () => {
      // Cleanup: only clear if this is still the current request
      if (bookingsLoadingRef.current === requestKey) {
        bookingsLoadingRef.current = null
      }
    }
  }, [refreshTrigger, binId]) // Remove monthDays dependency - load all dates once, update on refreshTrigger

  // Get booking status for a date
  const getBookingStatus = (date: Date) => {
    // Use local date string to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    const isDisabled = isDisabledDate(date)
    const maxBookings = getMaxBookingsPerDay(binId)
    
    // If data hasn't loaded yet and date is not disabled, show as disabled (gray) until we know the status
    // This prevents fully-booked dates from showing as available (orange) on first load
    if (!isDataLoaded && !isDisabled) {
      // Data not loaded yet - show as disabled to prevent flickering
      return {
        count: 0,
        isFullyBooked: false,
        isDisabled: true, // Temporarily disabled until data loads
        statusText: ''
      }
    }
    
    // Check if date is a holiday
    const isHoliday = holidays[dateString] || false
    
    // Data is loaded or date is disabled - show actual status
    const count = bookingCounts[dateString] || 0
    // For calendar1 (Pose): if count >= 2, date is fully booked
    // For other calendars with time slots: isFullyBooked is handled per time slot
    const isFullyBooked = !isDisabled && !isHoliday && count >= maxBookings
    
    // Debug logging for specific dates, especially 2025-11-18
    if (dateString === '2025-11-18' || count > 0 || isFullyBooked || isHoliday) {
      console.log(`[getBookingStatus] Date: ${dateString}, Count: ${count}, Max: ${maxBookings}, isFullyBooked: ${isFullyBooked}, isDisabled: ${isDisabled}, isHoliday: ${isHoliday}, binId: ${binId}, bookingCounts keys:`, Object.keys(bookingCounts))
    }
    
    return {
      count: isDisabled || isHoliday ? 0 : count,
      isFullyBooked: isFullyBooked, // Keep isFullyBooked true even if date is not past (for future fully-booked dates)
      isDisabled: isDisabled || isFullyBooked || isHoliday, // Disable if past OR fully booked OR holiday
      statusText: isHoliday ? 'Jour férié' : (isDisabled ? '' : (isFullyBooked ? `${maxBookings} sur ${maxBookings} réservés` : `${count} sur ${maxBookings} réservés`))
    }
  }

  // Helper function to check if a time slot is booked
  const isSlotBooked = (date: Date, timeSlot: string): boolean => {
    // Don't check past dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    
    if (checkDate < today) {
      return false // Past dates are not considered booked
    }
    
    // Use local date string to avoid timezone issues (same format as getBookingStatus)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    // Normalize time slot for comparison (trim and lowercase)
    const normalizedTimeSlot = timeSlot.trim().toLowerCase()
    const slotKey = `${dateString}|${normalizedTimeSlot}`
    const isBooked = bookedTimeSlots[slotKey] || false
    
    // Debug logging for specific dates
    if (dateString === '2025-11-18' && timeSlot) {
      console.log(`[isSlotBooked] Date: ${dateString}, TimeSlot: ${timeSlot}, Normalized: ${normalizedTimeSlot}, Key: ${slotKey}, IsBooked: ${isBooked}`)
    }
    
    return isBooked
  }

  const getBookingForSlot = (date: Date, timeSlot: string): BookingRecord | null => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    const normalizedTimeSlot = timeSlot.trim().toLowerCase()
    const slotKey = `${dateString}|${normalizedTimeSlot}`
    return bookingDetails[slotKey] || null
  }

  const getNamesForDate = (date: Date, timeSlot?: string): string[] => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    // Get today's date for comparison
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    
    // Only show names for future dates
    if (checkDate < today) {
      return []
    }
    
    if (timeSlot) {
      // For time slot calendars (SAV, Metré), get the booking for this specific time slot
      // Only show if it's by another technicien (not the current one)
      const booking = getBookingForSlot(date, timeSlot)
      if (booking && isBookingByOtherTechnicien(booking)) {
        return [booking.name]
      }
      return []
    } else {
      // For Pose calendar, get all bookings for this date that are by other techniciens
      const names: string[] = []
      allBookingsData.forEach((booking: BookingRecord) => {
        if (booking.date === dateString && isBookingByOtherTechnicien(booking)) {
          names.push(booking.name)
        }
      })
      return names
    }
  }

  const handleInfoClick = (e: React.MouseEvent, date: Date, timeSlot?: string) => {
    e.stopPropagation()
    const names = getNamesForDate(date, timeSlot)
    if (names.length > 0) {
      const button = e.currentTarget as HTMLElement
      const calendarContainer = button.closest('.calendar')
      if (calendarContainer) {
        const containerRect = calendarContainer.getBoundingClientRect()
        const buttonRect = button.getBoundingClientRect()
        setInfoPopup({
          x: buttonRect.right - containerRect.left + 8,
          y: buttonRect.top - containerRect.top,
          names: names,
          date: date,
          timeSlot: timeSlot
        })
      }
    }
  }

  // Close info popup when clicking outside or after 2 seconds
  useEffect(() => {
    const handleClickOutside = () => {
      setInfoPopup(null)
    }
    if (infoPopup) {
      document.addEventListener('click', handleClickOutside)
      // Auto-close after 2 seconds
      const autoCloseTimer = setTimeout(() => {
        setInfoPopup(null)
      }, 2000)
      
      return () => {
        document.removeEventListener('click', handleClickOutside)
        clearTimeout(autoCloseTimer)
      }
    }
  }, [infoPopup])

  // Check if a booking belongs to the current Technicien user
  const isBookingByTechnicien = (booking: BookingRecord): boolean => {
    if (!isTechnicien || !userName) {
      console.log('[isBookingByTechnicien] Not a technicien or no name:', { isTechnicien, userName, userEmail })
      return false
    }
    // Match by designer field (should contain technicien's name)
    // The designer field should match the technicien's name
    const designerMatch = booking.designer.toLowerCase().trim() === userName.toLowerCase().trim()
    const designerContains = booking.designer.toLowerCase().includes(userName.toLowerCase())
    const matches = designerMatch || designerContains
    
    console.log('[isBookingByTechnicien]', {
      bookingId: booking.id,
      bookingDesigner: booking.designer,
      bookingName: booking.name,
      userName,
      userEmail,
      designerMatch,
      designerContains,
      matches
    })
    return matches
  }

  // Check if a booking is by another technicien (not the current one)
  const isBookingByOtherTechnicien = (booking: BookingRecord): boolean => {
    if (!isTechnicien) {
      // If not a technicien, show all bookings (regular user behavior)
      return false
    }
    // If it's a booking by the current technicien, return false (don't show info icon)
    return !isBookingByTechnicien(booking)
  }

  // Check if a booking belongs to the current regular user
  const isBookingByUser = (booking: BookingRecord): boolean => {
    if (!isRegularUser || (!userEmail && !userName)) return false
    // Match by email (in name or designer field) or by name
    const emailMatch = userEmail && (
      booking.name.toLowerCase().includes(userEmail.toLowerCase()) ||
      booking.designer.toLowerCase().includes(userEmail.toLowerCase()) ||
      booking.phone === userEmail
    )
    const nameMatch = userName && (
      booking.name.toLowerCase() === userName.toLowerCase() ||
      booking.name.toLowerCase().includes(userName.toLowerCase())
    )
    return emailMatch || nameMatch || false
  }

  // Get booking for a specific date and time slot (for Technicien)
  const getBookingForDateAndSlot = (date: Date, timeSlot?: string): BookingRecord | null => {
    if (!isTechnicien) {
      console.log('[getBookingForDateAndSlot] Not a technicien')
      return null // Only for techniciens
    }
    
    if (timeSlot) {
      // For time slot calendars, return booking only if it belongs to this technicien
      const booking = getBookingForSlot(date, timeSlot)
      const result = booking && isBookingByTechnicien(booking) ? booking : null
      console.log('[getBookingForDateAndSlot] Time slot booking:', { timeSlot, booking, result })
      return result
    } else {
      // For Pose calendar, get the first booking for this date by this technicien
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      
      console.log('[getBookingForDateAndSlot] Looking for Pose booking:', { dateString, allBookingsCount: allBookingsData.length })
      
      const booking = allBookingsData.find(b => {
        const matchesDate = b.date === dateString
        const matchesTechnicien = isBookingByTechnicien(b)
        console.log('[getBookingForDateAndSlot] Checking booking:', { 
          bookingDate: b.date, 
          dateString,
          matchesDate,
          matchesTechnicien,
          booking: b
        })
        return matchesDate && matchesTechnicien
      })
      console.log('[getBookingForDateAndSlot] Found booking:', booking)
      return booking || null
    }
  }

  // Get user's booking for a specific date and time slot (for regular users)
  const getUserBookingForDateAndSlot = (date: Date, timeSlot?: string): BookingRecord | null => {
    if (timeSlot) {
      const booking = getBookingForSlot(date, timeSlot)
      return booking && isBookingByUser(booking) ? booking : null
    } else {
      // For Pose calendar, get the first booking for this date by user
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      
      const booking = allBookingsData.find(b => 
        b.date === dateString && isBookingByUser(b)
      )
      return booking || null
    }
  }

  // Handle edit booking for regular users
  const handleUserEditBooking = (date: Date, timeSlot?: string) => {
    const booking = getUserBookingForDateAndSlot(date, timeSlot)
    if (booking) {
      setEditingBooking(booking)
      setIsEditModalOpen(true)
      setInfoPopup(null) // Close info popup when opening edit modal
    }
  }

  // Handle delete booking for regular users
  const handleUserDeleteBooking = async (date: Date, timeSlot?: string) => {
    const booking = getUserBookingForDateAndSlot(date, timeSlot)
    if (!booking) return

    const confirmMessage = timeSlot 
      ? `Êtes-vous sûr de vouloir supprimer votre réservation du ${new Date(booking.date + 'T00:00:00').toLocaleDateString('fr-FR')} à ${timeSlot} ?`
      : `Êtes-vous sûr de vouloir supprimer votre réservation du ${new Date(booking.date + 'T00:00:00').toLocaleDateString('fr-FR')} ?`
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      await deleteBooking(booking.id)
      alert('✅ Réservation supprimée avec succès')
      setInfoPopup(null)
      // Refresh bookings by reloading
      window.location.reload()
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('❌ Erreur lors de la suppression de la réservation')
    }
  }

  const handleEditBooking = (date: Date, timeSlot?: string) => {
    const booking = getBookingForDateAndSlot(date, timeSlot)
    if (booking) {
      setEditingBooking(booking)
      setIsEditModalOpen(true)
    }
  }

  const handleDeleteBooking = async (date: Date, timeSlot?: string) => {
    const booking = getBookingForDateAndSlot(date, timeSlot)
    if (!booking) return

    const confirmMessage = timeSlot 
      ? `Êtes-vous sûr de vouloir supprimer votre réservation du ${new Date(booking.date + 'T00:00:00').toLocaleDateString('fr-FR')} à ${timeSlot} ?`
      : `Êtes-vous sûr de vouloir supprimer votre réservation du ${new Date(booking.date + 'T00:00:00').toLocaleDateString('fr-FR')} ?`
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      await deleteBooking(booking.id)
      alert('Réservation supprimée avec succès')
      // Refresh bookings by reloading
      window.location.reload()
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Erreur lors de la suppression de la réservation')
    }
  }

  const handleEditModalSubmit = async (bookingData: any) => {
    if (!editingBooking) return

    // Check if user is allowed to edit this booking
    if (isRegularUser && !isBookingByUser(editingBooking)) {
      alert('❌ Vous ne pouvez modifier que vos propres réservations')
      return
    }
    if (isTechnicien && !isBookingByTechnicien(editingBooking)) {
      alert('❌ Vous ne pouvez modifier que vos propres réservations')
      return
    }

    try {
      const updateData = {
        calendar_id: binId,
        booking_date: bookingData.date,
        booking_time: bookingData.timeSlot || '21h00',
        client_name: bookingData.name,
        client_phone: bookingData.phone,
        designer_name: bookingData.designer,
        message: bookingData.message,
      }
      
      await updateBooking(editingBooking.id, updateData)
      alert('✅ Réservation modifiée avec succès')
      setIsEditModalOpen(false)
      setEditingBooking(null)
      // Refresh bookings by reloading
      window.location.reload()
    } catch (error: any) {
      console.error('Error updating booking:', error)
      const errorMessage = error?.message || 'Erreur lors de la modification de la réservation'
      alert(`❌ ${errorMessage}`)
    }
  }

  
  // Check if date numbers should be clickable (only for calendar1, not for calendar2/3 with time slots)
  // Metré calendar (numerical) also doesn't allow clicking date numbers - only time slots
  const isDateNumberClickable = timeSlotType !== 'pose' && timeSlotType !== 'sav' && timeSlotType !== 'numerical'
  
  // Helper function to get the week range for display
  const getWeekRange = (): string => {
    const monday = getWeekDays(currentDate)[0]
    const sunday = getWeekDays(currentDate)[6]
    
    if (monday.getMonth() === sunday.getMonth()) {
      return `${monday.getDate()} - ${sunday.getDate()} ${monthNames[monday.getMonth()]} ${monday.getFullYear()}`
    } else {
      return `${monday.getDate()} ${monthNames[monday.getMonth()].slice(0, 3)} - ${sunday.getDate()} ${monthNames[sunday.getMonth()].slice(0, 3)} ${sunday.getFullYear()}`
    }
  }

  return (
    <div className={`calendar ${isDarkMode ? 'dark-mode' : 'light-mode'}`} style={{ position: 'relative' }}>
      <div className="calendar-header">
        <button 
          className="nav-button" 
          onClick={() => view === 'weekly' ? navigateWeek(-1) : navigateMonth(-1)}
          aria-label={view === 'weekly' ? 'Previous week' : 'Previous month'}
        >
          ‹
        </button>
        <h2 className="month-year">
          {view === 'weekly' 
            ? getWeekRange()
            : `${monthNames[currentDate.getMonth()].charAt(0).toUpperCase() + monthNames[currentDate.getMonth()].slice(1)} ${currentDate.getFullYear()}`
          }
        </h2>
        <button 
          className="nav-button" 
          onClick={() => view === 'weekly' ? navigateWeek(1) : navigateMonth(1)}
          aria-label={view === 'weekly' ? 'Next week' : 'Next month'}
        >
          ›
        </button>
      </div>

      <div className="calendar-container">
        {/* Calendar grid */}
      <div className="calendar-grid">
          {/* Day name headers */}
          <div className="day-headers-row">
            {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((dayName, index) => (
              <div key={index} className="day-header-cell">
                {dayName}
              </div>
            ))}
          </div>
          
          {/* Render based on view mode */}
          {view === 'weekly' ? (
            /* Weekly view - single row */
            <div className="date-headers">
              {weekDays.map((date, index) => {
                const bookingStatus = getBookingStatus(date)
                const isFullyBooked = bookingStatus.isFullyBooked
                const isDisabled = bookingStatus.isDisabled // This includes both past dates and fully booked dates
                return (
                  <div key={index} className={`date-header ${isDisabled ? 'past' : ''} ${isFullyBooked ? 'fully-booked' : ''}`}>
                    <div 
                      className={`date-number ${isDisabled ? 'past' : ''} ${isFullyBooked ? 'fully-booked-number' : ''}`}
                      onClick={isDateNumberClickable ? (() => !isDisabled && !isFullyBooked && handleDateClick(date)) : undefined}
                      style={{ cursor: !isDateNumberClickable ? 'default' : (isDisabled || isFullyBooked ? 'not-allowed' : 'pointer') }}
                    >
                      <span>{date.getDate()}</span>
                      {!usesTimeSlots(binId) && bookingStatus.count > 0 && getNamesForDate(date).length > 0 && (
                        <button
                          className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date)}
                          title="Voir les réservations"
                        >
                          <InfoIcon />
                        </button>
                      )}
                    </div>
                    {showTimeSlots && (
                      <>
                        {timeSlotType === 'basic' ? (
                          <>
                            <div 
                              className={`time-slot ${isDisabled ? 'disabled' : ''}`}
                              onClick={() => !isDisabled && !isFullyBooked && handleDateClick(date)}
                              style={{ cursor: isDisabled || isFullyBooked ? 'not-allowed' : 'pointer' }}
                            >
                              Matin
                            </div>
                            <div 
                              className={`time-slot ${isDisabled ? 'disabled' : ''}`}
                              onClick={() => !isDisabled && !isFullyBooked && handleDateClick(date)}
                              style={{ cursor: isDisabled || isFullyBooked ? 'not-allowed' : 'pointer' }}
                            >
                              Après-midi
                            </div>
                          </>
                        ) : timeSlotType === 'pose' ? (
                          <>
                            {(() => {
                              const slot1Booked = isSlotBooked(date, '8:00-11:00')
                              const slot2Booked = isSlotBooked(date, '11:00-14:00')
                              const slot3Booked = isSlotBooked(date, '14:00-17:00')
                              return (
                                <>
                                  <div 
                                    className={`time-slot ${isDisabled || slot1Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot1Booked && handleDateClick(date, '8:00-11:00')}
                                    style={{ cursor: isDisabled || slot1Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>8:00-11:00</span>
                                    {slot1Booked && getNamesForDate(date, '8:00-11:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                                        onClick={(e) => handleInfoClick(e, date, '8:00-11:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot2Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot2Booked && handleDateClick(date, '11:00-14:00')}
                                    style={{ cursor: isDisabled || slot2Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>11:00-14:00</span>
                                    {slot2Booked && getNamesForDate(date, '11:00-14:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                                        onClick={(e) => handleInfoClick(e, date, '11:00-14:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot3Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot3Booked && handleDateClick(date, '14:00-17:00')}
                                    style={{ cursor: isDisabled || slot3Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>14:00-17:00</span>
                                    {slot3Booked && getNamesForDate(date, '14:00-17:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                                        onClick={(e) => handleInfoClick(e, date, '14:00-17:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                </>
                              )
                            })()}
                          </>
                        ) : timeSlotType === 'sav' ? (
                          <>
                            {(() => {
                              const slot8_00Booked = isSlotBooked(date, '8:00')
                              const slot9_30Booked = isSlotBooked(date, '9:30')
                              const slot11_00Booked = isSlotBooked(date, '11:00')
                              const slot12_30Booked = isSlotBooked(date, '12:30')
                              const slot14_00Booked = isSlotBooked(date, '14:00')
                              const slot15_30Booked = isSlotBooked(date, '15:30')
                              const slot17_00Booked = isSlotBooked(date, '17:00')
                              const slot18_30Booked = isSlotBooked(date, '18:30')
                              
                              return (
                                <>
                                  <div 
                                    className={`time-slot ${isDisabled || slot8_00Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot8_00Booked && handleDateClick(date, '8:00')}
                                    style={{ cursor: isDisabled || slot8_00Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>8:00</span>
                                    {slot8_00Booked && getNamesForDate(date, '8:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '8:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot9_30Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot9_30Booked && handleDateClick(date, '9:30')}
                                    style={{ cursor: isDisabled || slot9_30Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>9:30</span>
                                    {slot9_30Booked && getNamesForDate(date, '9:30').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '9:30')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot11_00Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot11_00Booked && handleDateClick(date, '11:00')}
                                    style={{ cursor: isDisabled || slot11_00Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>11:00</span>
                                    {slot11_00Booked && getNamesForDate(date, '11:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '11:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot12_30Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot12_30Booked && handleDateClick(date, '12:30')}
                                    style={{ cursor: isDisabled || slot12_30Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>12:30</span>
                                    {slot12_30Booked && getNamesForDate(date, '12:30').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '12:30')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot14_00Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot14_00Booked && handleDateClick(date, '14:00')}
                                    style={{ cursor: isDisabled || slot14_00Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>14:00</span>
                                    {slot14_00Booked && getNamesForDate(date, '14:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '14:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot15_30Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot15_30Booked && handleDateClick(date, '15:30')}
                                    style={{ cursor: isDisabled || slot15_30Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>15:30</span>
                                    {slot15_30Booked && getNamesForDate(date, '15:30').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '15:30')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot17_00Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot17_00Booked && handleDateClick(date, '17:00')}
                                    style={{ cursor: isDisabled || slot17_00Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>17:00</span>
                                    {slot17_00Booked && getNamesForDate(date, '17:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '17:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot18_30Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot18_30Booked && handleDateClick(date, '18:30')}
                                    style={{ cursor: isDisabled || slot18_30Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>18:30</span>
                                    {slot18_30Booked && getNamesForDate(date, '18:30').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '18:30')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                </>
                              )
                            })()}
                          </>
                        ) : (
                          <>
                            {(() => {
                              // For numerical time slots (Metré calendar), check if each slot is booked
                              const slot8_10Booked = isSlotBooked(date, '8-10')
                              const slot10_12Booked = isSlotBooked(date, '10-12')
                              const slot14_16Booked = isSlotBooked(date, '14-16')
                              const slot16_18Booked = isSlotBooked(date, '16-18')
                              
                              return (
                                <>
                                  <div 
                                    className={`time-slot ${isDisabled || slot8_10Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot8_10Booked && handleDateClick(date, '8-10')}
                                    style={{ cursor: isDisabled || slot8_10Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>8-10</span>
                                    <div className="time-slot-actions">
                                      {slot8_10Booked && getNamesForDate(date, '8-10').length > 0 && (
                                        <button
                                          className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '8-10')}
                                          title="Voir les réservations"
                                        >
                                          <InfoIcon />
                                        </button>
                                      )}
                                      {isTechnicien && getBookingForDateAndSlot(date, '8-10') && (
                                        <>
                                          <button
                                            className="calendar-edit-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleEditBooking(date, '8-10')
                                            }}
                                            title="Modifier"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            className="calendar-delete-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteBooking(date, '8-10')
                                            }}
                                            title="Supprimer"
                                          >
                                            🗑️
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot10_12Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot10_12Booked && handleDateClick(date, '10-12')}
                                    style={{ cursor: isDisabled || slot10_12Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>10-12</span>
                                    <div className="time-slot-actions">
                                      {slot10_12Booked && getNamesForDate(date, '10-12').length > 0 && (
                                        <button
                                          className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '10-12')}
                                          title="Voir les réservations"
                                        >
                                          <InfoIcon />
                                        </button>
                                      )}
                                      {isTechnicien && getBookingForDateAndSlot(date, '10-12') && (
                                        <>
                                          <button
                                            className="calendar-edit-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleEditBooking(date, '10-12')
                                            }}
                                            title="Modifier"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            className="calendar-delete-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteBooking(date, '10-12')
                                            }}
                                            title="Supprimer"
                                          >
                                            🗑️
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot14_16Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot14_16Booked && handleDateClick(date, '14-16')}
                                    style={{ cursor: isDisabled || slot14_16Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>14-16</span>
                                    <div className="time-slot-actions">
                                      {slot14_16Booked && getNamesForDate(date, '14-16').length > 0 && (
                                        <button
                                          className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '14-16')}
                                          title="Voir les réservations"
                                        >
                                          <InfoIcon />
                                        </button>
                                      )}
                                      {isTechnicien && getBookingForDateAndSlot(date, '14-16') && (
                                        <>
                                          <button
                                            className="calendar-edit-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleEditBooking(date, '14-16')
                                            }}
                                            title="Modifier"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            className="calendar-delete-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteBooking(date, '14-16')
                                            }}
                                            title="Supprimer"
                                          >
                                            🗑️
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot16_18Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot16_18Booked && handleDateClick(date, '16-18')}
                                    style={{ cursor: isDisabled || slot16_18Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>16-18</span>
                                    <div className="time-slot-actions">
                                      {slot16_18Booked && getNamesForDate(date, '16-18').length > 0 && (
                                        <button
                                          className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '16-18')}
                                          title="Voir les réservations"
                                        >
                                          <InfoIcon />
                                        </button>
                                      )}
                                      {isTechnicien && getBookingForDateAndSlot(date, '16-18') && (
                                        <>
                                          <button
                                            className="calendar-edit-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleEditBooking(date, '16-18')
                                            }}
                                            title="Modifier"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            className="calendar-delete-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteBooking(date, '16-18')
                                            }}
                                            title="Supprimer"
                                          >
                                            🗑️
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )
                            })()}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              {/* Monthly view - First row of dates */}
              <div className="date-headers">
                {monthDays.slice(0, 7).map((date, index) => {
              if (date === null) {
                return <div key={index} className="date-header empty"></div>
              }
              const bookingStatus = getBookingStatus(date)
              const isFullyBooked = bookingStatus.isFullyBooked
              const isDisabled = bookingStatus.isDisabled // This includes both past dates and fully booked dates
                return (
                  <div key={index} className={`date-header ${isDisabled ? 'past' : ''} ${isFullyBooked ? 'fully-booked' : ''}`}>
                    <div className="date-header-actions">
                      {!usesTimeSlots(binId) && bookingStatus.count > 0 && getNamesForDate(date).length > 0 && (
                        <button
                          className="calendar-info-button-pose"
                          onClick={(e) => handleInfoClick(e, date)}
                          title="Voir les réservations"
                        >
                          <InfoIcon />
                        </button>
                      )}
                      {isTechnicien && !usesTimeSlots(binId) && getBookingForDateAndSlot(date) && (
                        <>
                          <button
                            className="calendar-edit-button-pose"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditBooking(date)
                            }}
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button
                            className="calendar-delete-button-pose"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteBooking(date)
                            }}
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                    <div 
                      className={`date-number ${isDisabled ? 'past' : ''} ${isFullyBooked ? 'fully-booked-number' : ''} ${!isDateNumberClickable ? 'not-clickable' : ''}`}
                      onClick={isDateNumberClickable ? (() => !isDisabled && !isFullyBooked && handleDateClick(date)) : undefined}
                      style={{ cursor: !isDateNumberClickable ? 'default' : (isDisabled || isFullyBooked ? 'not-allowed' : 'pointer') }}
                    >
                      {date.getDate()}
                    </div>
                  {showTimeSlots && (
                    <>
                      <div 
                        className={`time-slot ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && !isFullyBooked && handleDateClick(date)}
                        style={{ cursor: isDisabled || isFullyBooked ? 'not-allowed' : 'pointer' }}
                      >
                        Matin
                      </div>
                      <div 
                        className={`time-slot ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && !isFullyBooked && handleDateClick(date)}
                        style={{ cursor: isDisabled || isFullyBooked ? 'not-allowed' : 'pointer' }}
                      >
                        Après-midi
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Second row of dates */}
          <div className="date-headers">
            {monthDays.slice(7, 14).map((date, index) => {
              if (date === null) {
                return <div key={`second-${index}`} className="date-header empty"></div>
              }
              const bookingStatus = getBookingStatus(date)
              const isFullyBooked = bookingStatus.isFullyBooked
              const isDisabled = bookingStatus.isDisabled // This includes both past dates and fully booked dates
              return (
                <div key={`second-${index}`} className={`date-header ${isDisabled ? 'past' : ''} ${isFullyBooked ? 'fully-booked' : ''}`}>
                  <div className="date-header-actions">
                    {!usesTimeSlots(binId) && bookingStatus.count > 0 && getNamesForDate(date).length > 0 && (
                      <button
                        className="calendar-info-button-pose"
                        onClick={(e) => handleInfoClick(e, date)}
                        title="Voir les réservations"
                      >
                        <InfoIcon />
                      </button>
                    )}
                    {isTechnicien && !usesTimeSlots(binId) && getBookingForDateAndSlot(date) && (
                      <>
                        <button
                          className="calendar-edit-button-pose"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditBooking(date)
                          }}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          className="calendar-delete-button-pose"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteBooking(date)
                          }}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                  <div 
                    className={`date-number ${isDisabled ? 'past' : ''} ${isFullyBooked ? 'fully-booked-number' : ''}`}
                    onClick={isDateNumberClickable ? (() => !isDisabled && !isFullyBooked && handleDateClick(date)) : undefined}
                    style={{ cursor: !isDateNumberClickable ? 'default' : (isDisabled || isFullyBooked ? 'not-allowed' : 'pointer') }}
                  >
                    {date.getDate()}
                  </div>
                  {showTimeSlots && (
                    <>
                      <div 
                        className={`time-slot ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && !isFullyBooked && handleDateClick(date)}
                        style={{ cursor: isDisabled || isFullyBooked ? 'not-allowed' : 'pointer' }}
                      >
                        Matin
                      </div>
                      <div 
                        className={`time-slot ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && !isFullyBooked && handleDateClick(date)}
                        style={{ cursor: isDisabled || isFullyBooked ? 'not-allowed' : 'pointer' }}
                      >
                        Après-midi
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Third row of dates */}
          <div className="date-headers">
            {monthDays.slice(14, 21).map((date, index) => {
              if (date === null) {
                return <div key={`third-${index}`} className="date-header empty"></div>
              }
              const bookingStatus = getBookingStatus(date)
              const isFullyBooked = bookingStatus.isFullyBooked
              const isDisabled = bookingStatus.isDisabled // This includes both past dates and fully booked dates
              return (
                <div key={`third-${index}`} className={`date-header ${isDisabled ? 'past' : ''} ${isFullyBooked ? 'fully-booked' : ''}`}>
                  <div className="date-header-actions">
                    {!usesTimeSlots(binId) && bookingStatus.count > 0 && getNamesForDate(date).length > 0 && (
                      <button
                        className="calendar-info-button-pose"
                        onClick={(e) => handleInfoClick(e, date)}
                        title="Voir les réservations"
                      >
                        <InfoIcon />
                      </button>
                    )}
                    {isTechnicien && !usesTimeSlots(binId) && getBookingForDateAndSlot(date) && (
                      <>
                        <button
                          className="calendar-edit-button-pose"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditBooking(date)
                          }}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          className="calendar-delete-button-pose"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteBooking(date)
                          }}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                  <div 
                    className={`date-number ${isDisabled ? 'past' : ''} ${isFullyBooked ? 'fully-booked-number' : ''}`}
                    onClick={isDateNumberClickable ? (() => !isDisabled && !isFullyBooked && handleDateClick(date)) : undefined}
                    style={{ cursor: !isDateNumberClickable ? 'default' : (isDisabled || isFullyBooked ? 'not-allowed' : 'pointer') }}
                  >
                    {date.getDate()}
                  </div>
                  {showTimeSlots && (
                    <>
                      <div 
                        className={`time-slot ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && !isFullyBooked && handleDateClick(date)}
                        style={{ cursor: isDisabled || isFullyBooked ? 'not-allowed' : 'pointer' }}
                      >
                        Matin
                      </div>
                      <div 
                        className={`time-slot ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && !isFullyBooked && handleDateClick(date)}
                        style={{ cursor: isDisabled || isFullyBooked ? 'not-allowed' : 'pointer' }}
                      >
                        Après-midi
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Fourth row of dates */}
          <div className="date-headers">
            {monthDays.slice(21, 28).map((date, index) => {
              if (date === null) {
                return <div key={`fourth-${index}`} className="date-header empty"></div>
              }
              const bookingStatus = getBookingStatus(date)
              const isFullyBooked = bookingStatus.isFullyBooked
              const isDisabled = bookingStatus.isDisabled // This includes both past dates and fully booked dates
              return (
                <div key={`fourth-${index}`} className={`date-header ${isDisabled ? 'past' : ''} ${isFullyBooked ? 'fully-booked' : ''}`}>
                  <div className="date-header-actions">
                    {!usesTimeSlots(binId) && bookingStatus.count > 0 && getNamesForDate(date).length > 0 && (
                      <button
                        className="calendar-info-button-pose"
                        onClick={(e) => handleInfoClick(e, date)}
                        title="Voir les réservations"
                      >
                        <InfoIcon />
                      </button>
                    )}
                    {isTechnicien && !usesTimeSlots(binId) && getBookingForDateAndSlot(date) && (
                      <>
                        <button
                          className="calendar-edit-button-pose"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditBooking(date)
                          }}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          className="calendar-delete-button-pose"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteBooking(date)
                          }}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                  <div 
                    className={`date-number ${isDisabled ? 'past' : ''} ${isFullyBooked ? 'fully-booked-number' : ''}`}
                    onClick={isDateNumberClickable ? (() => !isDisabled && !isFullyBooked && handleDateClick(date)) : undefined}
                    style={{ cursor: !isDateNumberClickable ? 'default' : (isDisabled || isFullyBooked ? 'not-allowed' : 'pointer') }}
                  >
                    {date.getDate()}
                  </div>
                  {showTimeSlots && (
                    <>
                      <div 
                        className={`time-slot ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && !isFullyBooked && handleDateClick(date)}
                        style={{ cursor: isDisabled || isFullyBooked ? 'not-allowed' : 'pointer' }}
                      >
                        Matin
                      </div>
                      <div 
                        className={`time-slot ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && !isFullyBooked && handleDateClick(date)}
                        style={{ cursor: isDisabled || isFullyBooked ? 'not-allowed' : 'pointer' }}
                      >
                        Après-midi
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Fifth row of dates (remaining days) */}
          {monthDays.length > 28 && (
            <div className="date-headers">
              {monthDays.slice(28).map((date, index) => {
                if (date === null) {
                  return <div key={`fifth-${index}`} className="date-header empty"></div>
                }
                const bookingStatus = getBookingStatus(date)
                const isFullyBooked = bookingStatus.isFullyBooked
                const isDisabled = bookingStatus.isDisabled // This includes both past dates and fully booked dates
                return (
                  <div key={`fifth-${index}`} className={`date-header ${isDisabled ? 'past' : ''} ${isFullyBooked ? 'fully-booked' : ''}`}>
                    <div 
                      className={`date-number ${isDisabled ? 'past' : ''} ${isFullyBooked ? 'fully-booked-number' : ''}`}
                      onClick={isDateNumberClickable ? (() => !isDisabled && !isFullyBooked && handleDateClick(date)) : undefined}
                      style={{ cursor: !isDateNumberClickable ? 'default' : (isDisabled || isFullyBooked ? 'not-allowed' : 'pointer') }}
                    >
                      <span>{date.getDate()}</span>
                      {!usesTimeSlots(binId) && bookingStatus.count > 0 && getNamesForDate(date).length > 0 && (
                        <button
                          className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date)}
                          title="Voir les réservations"
                        >
                          <InfoIcon />
                        </button>
                      )}
                    </div>
                    {showTimeSlots && (
                      <>
                        {timeSlotType === 'basic' ? (
                          <>
                            <div 
                              className={`time-slot ${isDisabled ? 'disabled' : ''}`}
                              onClick={() => !isDisabled && !isFullyBooked && handleDateClick(date)}
                              style={{ cursor: isDisabled || isFullyBooked ? 'not-allowed' : 'pointer' }}
                            >
                              Matin
                            </div>
                            <div 
                              className={`time-slot ${isDisabled ? 'disabled' : ''}`}
                              onClick={() => !isDisabled && !isFullyBooked && handleDateClick(date)}
                              style={{ cursor: isDisabled || isFullyBooked ? 'not-allowed' : 'pointer' }}
                            >
                              Après-midi
                            </div>
                          </>
                        ) : timeSlotType === 'pose' ? (
                          <>
                            {(() => {
                              const slot1Booked = isSlotBooked(date, '8:00-11:00')
                              const slot2Booked = isSlotBooked(date, '11:00-14:00')
                              const slot3Booked = isSlotBooked(date, '14:00-17:00')
                              return (
                                <>
                                  <div 
                                    className={`time-slot ${isDisabled || slot1Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot1Booked && handleDateClick(date, '8:00-11:00')}
                                    style={{ cursor: isDisabled || slot1Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>8:00-11:00</span>
                                    {slot1Booked && getNamesForDate(date, '8:00-11:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                                        onClick={(e) => handleInfoClick(e, date, '8:00-11:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot2Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot2Booked && handleDateClick(date, '11:00-14:00')}
                                    style={{ cursor: isDisabled || slot2Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>11:00-14:00</span>
                                    {slot2Booked && getNamesForDate(date, '11:00-14:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                                        onClick={(e) => handleInfoClick(e, date, '11:00-14:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot3Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot3Booked && handleDateClick(date, '14:00-17:00')}
                                    style={{ cursor: isDisabled || slot3Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>14:00-17:00</span>
                                    {slot3Booked && getNamesForDate(date, '14:00-17:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                                        onClick={(e) => handleInfoClick(e, date, '14:00-17:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                </>
                              )
                            })()}
                          </>
                        ) : timeSlotType === 'sav' ? (
                          <>
                            {(() => {
                              const slot8_00Booked = isSlotBooked(date, '8:00')
                              const slot9_30Booked = isSlotBooked(date, '9:30')
                              const slot11_00Booked = isSlotBooked(date, '11:00')
                              const slot12_30Booked = isSlotBooked(date, '12:30')
                              const slot14_00Booked = isSlotBooked(date, '14:00')
                              const slot15_30Booked = isSlotBooked(date, '15:30')
                              const slot17_00Booked = isSlotBooked(date, '17:00')
                              const slot18_30Booked = isSlotBooked(date, '18:30')
                              
                              return (
                                <>
                                  <div 
                                    className={`time-slot ${isDisabled || slot8_00Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot8_00Booked && handleDateClick(date, '8:00')}
                                    style={{ cursor: isDisabled || slot8_00Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>8:00</span>
                                    {slot8_00Booked && getNamesForDate(date, '8:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '8:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot9_30Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot9_30Booked && handleDateClick(date, '9:30')}
                                    style={{ cursor: isDisabled || slot9_30Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>9:30</span>
                                    {slot9_30Booked && getNamesForDate(date, '9:30').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '9:30')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot11_00Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot11_00Booked && handleDateClick(date, '11:00')}
                                    style={{ cursor: isDisabled || slot11_00Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>11:00</span>
                                    {slot11_00Booked && getNamesForDate(date, '11:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '11:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot12_30Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot12_30Booked && handleDateClick(date, '12:30')}
                                    style={{ cursor: isDisabled || slot12_30Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>12:30</span>
                                    {slot12_30Booked && getNamesForDate(date, '12:30').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '12:30')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot14_00Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot14_00Booked && handleDateClick(date, '14:00')}
                                    style={{ cursor: isDisabled || slot14_00Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>14:00</span>
                                    {slot14_00Booked && getNamesForDate(date, '14:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '14:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot15_30Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot15_30Booked && handleDateClick(date, '15:30')}
                                    style={{ cursor: isDisabled || slot15_30Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>15:30</span>
                                    {slot15_30Booked && getNamesForDate(date, '15:30').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '15:30')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot17_00Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot17_00Booked && handleDateClick(date, '17:00')}
                                    style={{ cursor: isDisabled || slot17_00Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>17:00</span>
                                    {slot17_00Booked && getNamesForDate(date, '17:00').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '17:00')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot18_30Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot18_30Booked && handleDateClick(date, '18:30')}
                                    style={{ cursor: isDisabled || slot18_30Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>18:30</span>
                                    {slot18_30Booked && getNamesForDate(date, '18:30').length > 0 && (
                                      <button
                                        className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '18:30')}
                                        title="Voir les réservations"
                                      >
                                        <InfoIcon />
                                      </button>
                                    )}
                                  </div>
                                </>
                              )
                            })()}
                          </>
                        ) : (
                          <>
                            {(() => {
                              // For numerical time slots (Metré calendar), check if each slot is booked
                              const slot8_10Booked = isSlotBooked(date, '8-10')
                              const slot10_12Booked = isSlotBooked(date, '10-12')
                              const slot14_16Booked = isSlotBooked(date, '14-16')
                              const slot16_18Booked = isSlotBooked(date, '16-18')
                              
                              return (
                                <>
                                  <div 
                                    className={`time-slot ${isDisabled || slot8_10Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot8_10Booked && handleDateClick(date, '8-10')}
                                    style={{ cursor: isDisabled || slot8_10Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>8-10</span>
                                    <div className="time-slot-actions">
                                      {slot8_10Booked && getNamesForDate(date, '8-10').length > 0 && (
                                        <button
                                          className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '8-10')}
                                          title="Voir les réservations"
                                        >
                                          <InfoIcon />
                                        </button>
                                      )}
                                      {isTechnicien && getBookingForDateAndSlot(date, '8-10') && (
                                        <>
                                          <button
                                            className="calendar-edit-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleEditBooking(date, '8-10')
                                            }}
                                            title="Modifier"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            className="calendar-delete-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteBooking(date, '8-10')
                                            }}
                                            title="Supprimer"
                                          >
                                            🗑️
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot10_12Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot10_12Booked && handleDateClick(date, '10-12')}
                                    style={{ cursor: isDisabled || slot10_12Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>10-12</span>
                                    <div className="time-slot-actions">
                                      {slot10_12Booked && getNamesForDate(date, '10-12').length > 0 && (
                                        <button
                                          className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '10-12')}
                                          title="Voir les réservations"
                                        >
                                          <InfoIcon />
                                        </button>
                                      )}
                                      {isTechnicien && getBookingForDateAndSlot(date, '10-12') && (
                                        <>
                                          <button
                                            className="calendar-edit-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleEditBooking(date, '10-12')
                                            }}
                                            title="Modifier"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            className="calendar-delete-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteBooking(date, '10-12')
                                            }}
                                            title="Supprimer"
                                          >
                                            🗑️
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot14_16Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot14_16Booked && handleDateClick(date, '14-16')}
                                    style={{ cursor: isDisabled || slot14_16Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>14-16</span>
                                    <div className="time-slot-actions">
                                      {slot14_16Booked && getNamesForDate(date, '14-16').length > 0 && (
                                        <button
                                          className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '14-16')}
                                          title="Voir les réservations"
                                        >
                                          <InfoIcon />
                                        </button>
                                      )}
                                      {isTechnicien && getBookingForDateAndSlot(date, '14-16') && (
                                        <>
                                          <button
                                            className="calendar-edit-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleEditBooking(date, '14-16')
                                            }}
                                            title="Modifier"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            className="calendar-delete-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteBooking(date, '14-16')
                                            }}
                                            title="Supprimer"
                                          >
                                            🗑️
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div 
                                    className={`time-slot ${isDisabled || slot16_18Booked ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && !slot16_18Booked && handleDateClick(date, '16-18')}
                                    style={{ cursor: isDisabled || slot16_18Booked ? 'not-allowed' : 'pointer' }}
                                  >
                                    <span>16-18</span>
                                    <div className="time-slot-actions">
                                      {slot16_18Booked && getNamesForDate(date, '16-18').length > 0 && (
                                        <button
                                          className="calendar-info-button"
                          onClick={(e) => handleInfoClick(e, date, '16-18')}
                                          title="Voir les réservations"
                                        >
                                          <InfoIcon />
                                        </button>
                                      )}
                                      {isTechnicien && getBookingForDateAndSlot(date, '16-18') && (
                                        <>
                                          <button
                                            className="calendar-edit-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleEditBooking(date, '16-18')
                                            }}
                                            title="Modifier"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            className="calendar-delete-button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteBooking(date, '16-18')
                                            }}
                                            title="Supprimer"
                                          >
                                            🗑️
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )
                            })()}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Info Popup */}
      {infoPopup && (
        <div 
          className="calendar-info-popup"
          style={{
            position: 'absolute',
            left: `${infoPopup.x}px`,
            top: `${infoPopup.y}px`,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="calendar-info-popup-content">
            <button
              className="calendar-info-popup-close"
              onClick={() => setInfoPopup(null)}
              aria-label="Fermer"
            >
              ×
            </button>
            <div className="calendar-info-popup-title">Réservé pour:</div>
            <div className="calendar-info-popup-names">
              {infoPopup.names.map((name, idx) => (
                <div key={idx}>{name}</div>
              ))}
            </div>
            {/* Edit/Delete buttons for user's own bookings */}
            {isRegularUser && infoPopup && getUserBookingForDateAndSlot(infoPopup.date, infoPopup.timeSlot) && (
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: `1px solid ${isDarkMode ? '#333333' : '#e5e7eb'}`,
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUserEditBooking(infoPopup.date, infoPopup.timeSlot)
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#fa541c',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(250, 84, 28, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ff6b35'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(250, 84, 28, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fa541c'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(250, 84, 28, 0.3)'
                  }}
                >
                  <span>✏️</span>
                  <span>Modifier</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUserDeleteBooking(infoPopup.date, infoPopup.timeSlot)
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isDarkMode ? '#dc2626' : '#ef4444',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#b91c1c' : '#dc2626'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#dc2626' : '#ef4444'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <span>🗑️</span>
                  <span>Supprimer</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal for Technicien */}
      {isEditModalOpen && editingBooking && (
        <BookingModal
          selectedDate={new Date(editingBooking.date + 'T00:00:00')}
          selectedTimeSlot={editingBooking.time && editingBooking.time !== '21h00' ? editingBooking.time : undefined}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingBooking(null)
          }}
          onSubmit={handleEditModalSubmit}
          isDarkMode={isDarkMode}
          initialData={{
            name: editingBooking.name,
            phone: editingBooking.phone,
            designer: editingBooking.designer,
            message: editingBooking.message,
          }}
        />
      )}
    </div>
  )
}

export default Calendar

