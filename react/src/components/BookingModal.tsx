import React, { useState, useEffect, useMemo } from 'react'
import './BookingModal.css'

interface BookingData {
  name: string
  phone: string
  designer: string
  duree: string
  message: string
  date: string
  selectedDate: Date
  timeSlot?: string
}

interface UserOption {
  id: number
  name: string
  email: string
  role: string
}

interface ExistingBooking {
  date: string // YYYY-MM-DD format
}

interface HolidayRecord {
  holiday_date: string // YYYY-MM-DD format
}

interface BookingModalProps {
  selectedDate: Date
  selectedTimeSlot?: string
  onClose: () => void
  onSubmit: (data: BookingData) => void
  isDarkMode?: boolean
  initialData?: {
    name?: string
    phone?: string
    designer?: string
    message?: string
  }
  users?: UserOption[] // List of users for designer selection (admin only)
  // Props for duration availability (Pose calendar)
  existingBookings?: ExistingBooking[] // All bookings for this calendar
  holidays?: HolidayRecord[] // All holidays for this calendar
  maxBookingsPerDay?: number // Max bookings per day (default: 2 for Pose)
  showDurationField?: boolean // Whether to show duration field (only for Pose)
}

interface FormData {
  name: string
  phone: string
  designer: string
  duree: string
  message: string
}

interface FormErrors {
  name?: string
  phone?: string
  designer?: string
}

const BookingModal: React.FC<BookingModalProps> = ({ 
  selectedDate, 
  selectedTimeSlot, 
  onClose, 
  onSubmit, 
  isDarkMode = false, 
  initialData, 
  users = [],
  existingBookings = [],
  holidays = [],
  maxBookingsPerDay = 2,
  showDurationField = false
}) => {
  // Get user info from localStorage to auto-fill designer for concepteurs
  const [concepteurName, setConcepteurName] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  
  useEffect(() => {
    const user = sessionStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        if (userData.role === 'concepteur' && userData.name) {
          setConcepteurName(userData.name)
        }
        if (userData.role === 'admin') {
          setIsAdmin(true)
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    designer: initialData?.designer || '',
    duree: '1',
    message: initialData?.message || ''
  })
  const [errors, setErrors] = useState<FormErrors>({})

  // Helper function to format date as YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Helper function to add days to a date
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  // Calculate duration availability based on existing bookings and holidays
  const { canFitDuration2, canFitDuration3 } = useMemo(() => {
    if (!showDurationField) {
      return { canFitDuration2: true, canFitDuration3: true }
    }

    // Count bookings for a specific date
    const getBookingCountForDate = (date: Date): number => {
      const dateStr = formatDateString(date)
      return existingBookings.filter(b => b.date === dateStr).length
    }

    // Check if a date is a holiday
    const isHoliday = (date: Date): boolean => {
      const dateStr = formatDateString(date)
      return holidays.some(h => h.holiday_date === dateStr)
    }

    // Check if a date is Sunday (dimanche)
    const isSunday = (date: Date): boolean => {
      return date.getDay() === 0
    }

    // Check if a date is invalid (holiday or Sunday)
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

    // Duration 2 logic:
    // - Creates 2 reservations: 1 on current day + 1 on next valid day (skipping holidays and Sundays)
    // - Both days must have at least 1 available slot (max 2 bookings per day)
    // - If either day is fully booked (2 bookings) or is invalid, unavailable
    const checkDuration2 = (): boolean => {
      // Check current day has at least 1 slot available
      const currentDayCount = getBookingCountForDate(selectedDate)
      if (currentDayCount >= maxBookingsPerDay || isInvalidDay(selectedDate)) {
        return false
      }

      // Check next valid day (skipping holidays and Sundays) has at least 1 slot available
      const nextValidDay = getNextValidDay(selectedDate, 1)
      if (isInvalidDay(nextValidDay)) return false // If we couldn't find a valid day
      const nextDayCount = getBookingCountForDate(nextValidDay)
      if (nextDayCount >= maxBookingsPerDay) {
        return false
      }

      return true
    }

    // Duration 3 logic:
    // - Creates 3 reservations: 1 on current day + 1 on next valid day + 1 on day after next valid day
    // - All three days must have at least 1 available slot (max 2 bookings per day)
    // - Skips holidays and Sundays when finding consecutive days
    // - If any of these days is fully booked (2 bookings) or is invalid, unavailable
    const checkDuration3 = (): boolean => {
      // Check current day has at least 1 slot available
      const currentDayCount = getBookingCountForDate(selectedDate)
      if (currentDayCount >= maxBookingsPerDay || isInvalidDay(selectedDate)) {
        return false
      }

      // Check next valid day (skipping holidays and Sundays) has at least 1 slot available
      const nextValidDay = getNextValidDay(selectedDate, 1)
      if (isInvalidDay(nextValidDay)) return false // If we couldn't find a valid day
      const nextDayCount = getBookingCountForDate(nextValidDay)
      if (nextDayCount >= maxBookingsPerDay) {
        return false
      }

      // Check day after next valid day (skipping holidays and Sundays) has at least 1 slot available
      const dayAfterNextValid = getNextValidDay(nextValidDay, 1)
      if (isInvalidDay(dayAfterNextValid)) return false // If we couldn't find a valid day
      const dayAfterNextCount = getBookingCountForDate(dayAfterNextValid)
      if (dayAfterNextCount >= maxBookingsPerDay) {
        return false
      }

      return true
    }

    return {
      canFitDuration2: checkDuration2(),
      canFitDuration3: checkDuration3()
    }
  }, [selectedDate, existingBookings, holidays, maxBookingsPerDay, showDurationField])
  
  // Update designer field when concepteur name is loaded (only if not editing)
  useEffect(() => {
    if (concepteurName && !initialData?.designer) {
      setFormData(prev => {
        // Only auto-fill if designer is empty
        if (!prev.designer.trim()) {
          return { ...prev, designer: concepteurName }
        }
        return prev
      })
    }
  }, [concepteurName, initialData?.designer])

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        phone: initialData.phone || '',
        designer: initialData.designer || '',
        duree: '1',
        message: initialData.message || ''
      })
    }
  }, [initialData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // For phone number, only allow numbers
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '')
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Le numéro de téléphone est requis'
    } else if (!/^\d+$/.test(formData.phone)) {
      newErrors.phone = 'Le numéro de téléphone ne doit contenir que des chiffres'
    }

    if (!formData.designer.trim()) {
      newErrors.designer = 'Le nom du concepteur est requis'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (validateForm()) {
      // Use local date format to avoid timezone issues
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      
      const bookingData: BookingData = {
        ...formData,
        date: dateString,
        selectedDate: selectedDate,
        timeSlot: selectedTimeSlot
      }
      
      console.log('[BookingModal] Submitting booking:', bookingData)
      onSubmit(bookingData)
    }
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${isDarkMode ? 'dark-mode' : 'light-mode'}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Réservez Votre Rendez-vous</h2>
          <button className="close-button" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="selected-date">
          <strong>Date sélectionnée :</strong> {formatDate(selectedDate)}
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-group">
            <label htmlFor="name">Nom du client *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={errors.name ? 'error' : ''}
              placeholder="Entrez le nom du client"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Numéro de téléphone *</label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={errors.phone ? 'error' : ''}
              placeholder="Entrez le numéro de téléphone"
              required
              inputMode="numeric"
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="designer">Nom du concepteur *</label>
            {isAdmin && users.length > 0 ? (
              <select
                id="designer"
                name="designer"
                value={formData.designer}
                onChange={handleInputChange}
                className={errors.designer ? 'error' : ''}
              >
                <option value="">Sélectionner un concepteur</option>
                {users.filter(user => user.role === 'concepteur').map(user => (
                  <option key={user.id} value={user.name}>
                    {user.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id="designer"
                name="designer"
                value={formData.designer}
                onChange={handleInputChange}
                className={errors.designer ? 'error' : ''}
                placeholder="Entrez le nom du concepteur"
                readOnly={!!concepteurName}
                style={concepteurName ? { 
                  backgroundColor: isDarkMode ? '#555' : '#f5f5f5', 
                  cursor: 'not-allowed',
                  opacity: 0.8
                } : {}}
              />
            )}
            {errors.designer && <span className="error-message">{errors.designer}</span>}
            {concepteurName && !isAdmin && (
              <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                ✓ Automatiquement rempli avec votre nom (non modifiable)
              </small>
            )}
          </div>

          {showDurationField && (
            <div className="form-group">
              <label htmlFor="duree">Durée par jour *</label>
              <select
                id="duree"
                name="duree"
                value={formData.duree}
                onChange={handleInputChange}
              >
                <option value="1">1</option>
                <option value="2" disabled={!canFitDuration2}>
                  2 {!canFitDuration2 && '(indisponible)'}
                </option>
                <option value="3" disabled={!canFitDuration3}>
                  3 {!canFitDuration3 && '(indisponible)'}
                </option>
              </select>
              {(formData.duree === '2' || formData.duree === '3') && (
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  ℹ️ Durée {formData.duree} créera {formData.duree} réservation(s) sur plusieurs jours
                </small>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="message">Message ou commentaire</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Toute information supplémentaire ou demande spéciale"
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="submit-button">
              Réserver
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BookingModal