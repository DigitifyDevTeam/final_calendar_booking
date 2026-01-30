import React, { useState, useEffect, useMemo } from 'react'
import { CALENDAR_CONFIGS, getAllBookings, BookingRecord } from '../services/bookingService'
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
  pose_effectue_par_wood_agency?: boolean
  livraison?: string
  raison?: string
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
    date?: string // Date in YYYY-MM-DD format for editing
    timeSlot?: string // Time slot for editing
    pose_effectue_par_wood_agency?: boolean | null
  }
  users?: UserOption[] // List of users for designer selection (admin only)
  calendarId?: string // Calendar ID to determine which fields to show (e.g., 'calendar2' for SAV)
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
  pose_effectue_par_wood_agency: boolean
  livraison?: string // Livraison field for SAV calendar
  raison?: string // Raison field for SAV calendar
  booking_date?: string // Editable date in YYYY-MM-DD format
  booking_time?: string // Editable time slot
}

interface FormErrors {
  name?: string
  phone?: string
  designer?: string
  livraison?: string
  raison?: string
}

const BookingModal: React.FC<BookingModalProps> = ({ 
  selectedDate, 
  selectedTimeSlot, 
  onClose, 
  onSubmit, 
  isDarkMode = false, 
  initialData, 
  users = [],
  calendarId,
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

  // Track original value to detect changes when editing
  const [originalPoseValue, setOriginalPoseValue] = useState<boolean | null | undefined>(initialData?.pose_effectue_par_wood_agency)
  
  // Track bookings for the selected date to filter available time slots (for edit mode)
  const [bookingsForSelectedDate, setBookingsForSelectedDate] = useState<BookingRecord[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  
  // Helper function to format date to YYYY-MM-DD for date input
  const formatDateForInput = (date: Date | string): string => {
    if (typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date
      }
      try {
        const d = new Date(date + 'T00:00:00')
        if (isNaN(d.getTime())) return ''
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } catch {
        return ''
      }
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Determine if we're in edit mode
  const isEditMode = !!initialData
  
  // Get initial date - use initialData.date if editing, otherwise use selectedDate
  const initialDate = isEditMode && initialData?.date 
    ? formatDateForInput(initialData.date)
    : formatDateForInput(selectedDate)
  
  // Get initial time slot - use initialData.timeSlot if editing, otherwise use selectedTimeSlot
  const initialTimeSlot = isEditMode && initialData?.timeSlot
    ? initialData.timeSlot
    : selectedTimeSlot || ''

  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    designer: initialData?.designer || '',
    duree: '1',
    message: initialData?.message || '',
    pose_effectue_par_wood_agency: initialData?.pose_effectue_par_wood_agency ?? false,
    livraison: (initialData as any)?.livraison || '',
    raison: (initialData as any)?.raison || '',
    booking_date: initialDate,
    booking_time: initialTimeSlot
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
      const originalValue = initialData.pose_effectue_par_wood_agency
      setOriginalPoseValue(originalValue)
      const editDate = initialData.date ? formatDateForInput(initialData.date) : formatDateForInput(selectedDate)
      const editTimeSlot = initialData.timeSlot || selectedTimeSlot || ''
      setFormData({
        name: initialData.name || '',
        phone: initialData.phone || '',
        designer: initialData.designer || '',
        duree: '1',
        message: initialData.message || '',
        pose_effectue_par_wood_agency: originalValue ?? false,
        booking_date: editDate,
        booking_time: editTimeSlot
      })
    }
  }, [initialData, selectedDate, selectedTimeSlot])

  // Get all time slot options for a calendar
  const getAllTimeSlotOptions = (calendarId?: string): string[] => {
    if (calendarId === CALENDAR_CONFIGS['calendar2']) {
      // SAV calendar time slots
      return ['8:00-11:00', '11:00-14:00', '14:00-17:00']
    } else if (calendarId === CALENDAR_CONFIGS['calendar3']) {
      // Metré calendar time slots
      return ['8:00', '9:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30']
    }
    return []
  }

  // Get available time slots (filter out booked ones) - only for edit mode
  const getAvailableTimeSlots = useMemo(() => {
    if (!isEditMode || !calendarId) {
      return []
    }
    
    // Only filter for time-slot calendars (SAV and Metré)
    if (calendarId !== CALENDAR_CONFIGS['calendar2'] && calendarId !== CALENDAR_CONFIGS['calendar3']) {
      return []
    }
    
    if (!formData.booking_date) {
      // If no date selected, return all options
      return getAllTimeSlotOptions(calendarId)
    }
    
    const allSlots = getAllTimeSlotOptions(calendarId)
    
    // Get booked time slots for the selected date, excluding the current booking being edited
    const currentBookingTimeSlot = initialData?.timeSlot
    const bookedSlots = bookingsForSelectedDate
      .filter((b: BookingRecord) => {
        // Exclude the current booking's time slot if we're editing
        if (currentBookingTimeSlot && b.time && b.time.trim().toLowerCase() === currentBookingTimeSlot.trim().toLowerCase()) {
          return false
        }
        return b.date === formData.booking_date && b.time
      })
      .map((b: BookingRecord) => b.time)
    
    // Normalize time strings for comparison
    const normalizeTime = (time: string) => time.trim().toLowerCase()
    const normalizedBookedSlots = bookedSlots.map(normalizeTime)
    
    // Filter out booked slots, but always include the current booking's time slot
    const availableSlots = allSlots.filter(slot => {
      const normalizedSlot = normalizeTime(slot)
      // Always include the current booking's time slot
      if (currentBookingTimeSlot && normalizeTime(currentBookingTimeSlot) === normalizedSlot) {
        return true
      }
      return !normalizedBookedSlots.includes(normalizedSlot)
    })
    
    return availableSlots
  }, [formData.booking_date, calendarId, bookingsForSelectedDate, isEditMode, initialData])

  // Fetch bookings when date changes (for edit mode only)
  useEffect(() => {
    if (!isEditMode || !calendarId) {
      setBookingsForSelectedDate([])
      return
    }
    
    // Only fetch for time-slot calendars (SAV and Metré)
    if (calendarId !== CALENDAR_CONFIGS['calendar2'] && calendarId !== CALENDAR_CONFIGS['calendar3']) {
      setBookingsForSelectedDate([])
      return
    }
    
    if (!formData.booking_date) {
      setBookingsForSelectedDate([])
      return
    }
    
    const fetchBookings = async () => {
      setLoadingBookings(true)
      try {
        const bookings = await getAllBookings(calendarId, {
          startDate: formData.booking_date,
          endDate: formData.booking_date
        })
        setBookingsForSelectedDate(bookings)
      } catch (error) {
        console.error('Error fetching bookings for date:', error)
        setBookingsForSelectedDate([])
      } finally {
        setLoadingBookings(false)
      }
    }
    
    fetchBookings()
  }, [formData.booking_date, calendarId, isEditMode])

  // Clear selected time slot if it's no longer available when date changes
  useEffect(() => {
    if (isEditMode && formData.booking_time && getAvailableTimeSlots.length > 0) {
      const normalizeTime = (time: string) => time.trim().toLowerCase()
      const normalizedSelected = normalizeTime(formData.booking_time)
      const isAvailable = getAvailableTimeSlots.some(slot => normalizeTime(slot) === normalizedSelected)
      
      if (!isAvailable && formData.booking_time) {
        // Don't clear if it's the current booking's time slot (it should still be available)
        // Only clear if it's a different slot that's now booked
        const isCurrentBookingSlot = initialData?.timeSlot && normalizeTime(initialData.timeSlot) === normalizedSelected
        if (!isCurrentBookingSlot) {
          setFormData(prev => ({ ...prev, booking_time: '' }))
        }
      }
    }
  }, [getAvailableTimeSlots, formData.booking_time, isEditMode, initialData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    // For phone number, only allow numbers
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '')
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }))
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
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

    // Validate time slot for SAV and Metré calendars in edit mode
    if (isEditMode && calendarId && (calendarId === CALENDAR_CONFIGS['calendar2'] || calendarId === CALENDAR_CONFIGS['calendar3'])) {
      if (!formData.booking_time || !formData.booking_time.trim()) {
        // Add to errors if we had an errors object that supports booking_time
        // For now, we'll just show an alert
        alert('Le créneau horaire est requis pour ce calendrier')
        return false
      }
    }

    // Validate livraison and raison for SAV calendar (required)
    if (calendarId === CALENDAR_CONFIGS['calendar2'] || calendarId === 'calendar2' || calendarId === '2') {
      if (!formData.livraison || !formData.livraison.trim()) {
        newErrors.livraison = 'Le champ livraison est obligatoire'
      }
      if (!formData.raison || !formData.raison.trim()) {
        newErrors.raison = 'Le champ raison est obligatoire'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (validateForm()) {
      // Use editable date if in edit mode, otherwise use selectedDate
      let dateString: string
      let finalDate: Date
      if (isEditMode && formData.booking_date) {
        dateString = formData.booking_date
        finalDate = new Date(dateString + 'T00:00:00')
      } else {
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
        dateString = `${year}-${month}-${day}`
        finalDate = selectedDate
      }
      
      // Use editable time slot if in edit mode, otherwise use selectedTimeSlot
      const finalTimeSlot = isEditMode && formData.booking_time 
        ? formData.booking_time 
        : selectedTimeSlot
      
      // For editing: if original was null and user didn't change it, keep it undefined (don't send)
      // For new bookings: always send the value (defaults to false)
      let poseValue: boolean | undefined = undefined
      if (calendarId === 'calendar2') {
        const isEditing = initialData !== undefined
        if (isEditing && (originalPoseValue === null || originalPoseValue === undefined)) {
          // Editing an existing booking that was null - only send if user explicitly checked it
          // If unchecked, don't send so it stays null
          if (formData.pose_effectue_par_wood_agency === true) {
            poseValue = true
          }
          // If false, leave as undefined (won't be sent, stays null)
        } else {
          // New booking OR editing a booking that already had a value - send current value
          poseValue = formData.pose_effectue_par_wood_agency
        }
      }
      
      console.log('[BookingModal] formData.livraison:', formData.livraison, 'calendarId:', calendarId)
      
      const bookingData: BookingData = {
        ...formData,
        date: dateString,
        selectedDate: finalDate,
        timeSlot: finalTimeSlot,
        pose_effectue_par_wood_agency: poseValue,
        livraison: (calendarId === CALENDAR_CONFIGS['calendar2'] || calendarId === 'calendar2' || calendarId === '2') ? formData.livraison : undefined,
        raison: (calendarId === CALENDAR_CONFIGS['calendar2'] || calendarId === 'calendar2' || calendarId === '2') ? formData.raison : undefined
      }
      
      console.log('[BookingModal] Submitting booking:', bookingData)
      console.log('[BookingModal] bookingData.livraison:', bookingData.livraison)
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

        {!isEditMode && (
        <div className="selected-date">
          <strong>Date sélectionnée :</strong> {formatDate(selectedDate)}
        </div>
        )}

        <form onSubmit={handleSubmit} className="booking-form">
          {isEditMode && (
            <>
              <div className="form-group">
                <label htmlFor="booking_date">
                  Date * <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>(Vous pouvez modifier la date)</span>
                </label>
                {formData.booking_date && (
                  <div className="selected-date-display" style={{ marginBottom: '8px', fontSize: '0.9rem', color: '#666' }}>
                    Date sélectionnée : {new Date(formData.booking_date + 'T00:00:00').toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                )}
                <input
                  type="date"
                  id="booking_date"
                  name="booking_date"
                  value={formData.booking_date || ''}
                  onChange={handleInputChange}
                  style={{ cursor: 'pointer' }}
                />
              </div>

              {(calendarId === CALENDAR_CONFIGS['calendar2'] || calendarId === CALENDAR_CONFIGS['calendar3']) && (
                <div className="form-group">
                  <label htmlFor="booking_time">Créneau horaire *</label>
                  {loadingBookings && formData.booking_date && (
                    <small style={{ display: 'block', color: '#666', marginBottom: '4px', fontSize: '0.85rem' }}>
                      Chargement des créneaux disponibles...
                    </small>
                  )}
                  <select
                    id="booking_time"
                    name="booking_time"
                    value={formData.booking_time || ''}
                    onChange={handleInputChange}
                    disabled={loadingBookings}
                  >
                    <option value="">Sélectionner un créneau</option>
                    {(() => {
                      // Always include the current booking's time slot if it exists and is not already in the list
                      const currentSlot = initialData?.timeSlot
                      const slotsToShow = [...getAvailableTimeSlots]
                      if (currentSlot && !slotsToShow.includes(currentSlot)) {
                        slotsToShow.push(currentSlot)
                      }
                      
                      if (slotsToShow.length > 0) {
                        return slotsToShow.map(slot => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))
                      } else if (formData.booking_date) {
                        return <option value="" disabled>Tous les créneaux sont réservés pour cette date</option>
                      } else {
                        return <option value="" disabled>Sélectionnez d'abord une date</option>
                      }
                    })()}
                  </select>
                  {formData.booking_date && getAvailableTimeSlots.length === 0 && !loadingBookings && (
                    <small style={{ display: 'block', color: '#ff4444', marginTop: '4px', fontSize: '0.85rem' }}>
                      ⚠️ Tous les créneaux sont réservés pour cette date. Veuillez choisir une autre date.
                    </small>
                  )}
                </div>
              )}
            </>
          )}
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

          {calendarId === 'calendar2' && (
            <>
              <div className="form-group">
                <label htmlFor="pose_effectue_par_wood_agency" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    id="pose_effectue_par_wood_agency"
                    name="pose_effectue_par_wood_agency"
                    checked={formData.pose_effectue_par_wood_agency}
                    onChange={handleInputChange}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Pose effectuée par Wood agency</span>
                </label>
              </div>
              <div className="form-group">
                <label htmlFor="livraison">
                  Livraison *
                </label>
                <select
                  id="livraison"
                  name="livraison"
                  value={formData.livraison || ''}
                  onChange={(e) => {
                    console.log('[BookingModal] livraison select changed:', e.target.value)
                    handleInputChange(e)
                  }}
                  className={errors.livraison ? 'error' : ''}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: errors.livraison ? '2px solid #284B73' : '1px solid #333',
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#111827',
                    fontSize: '14px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  <option value="">Sélectionner une option</option>
                  <option value="livre_chez_client">Livre chez le client</option>
                  <option value="venir_chercher_magasin">Venir chercher au magasin</option>
                </select>
                {errors.livraison && <span className="error-message">{errors.livraison}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="raison">
                  Raison *
                </label>
                <select
                  id="raison"
                  name="raison"
                  value={formData.raison || ''}
                  onChange={(e) => {
                    console.log('[BookingModal] raison select changed:', e.target.value)
                    handleInputChange(e)
                  }}
                  className={errors.raison ? 'error' : ''}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: errors.raison ? '2px solid #284B73' : '1px solid #333',
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#111827',
                    fontSize: '14px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  <option value="">Sélectionner une option</option>
                  <option value="erreur_poseur">Erreur Poseur</option>
                  <option value="erreur_concepteur">Erreur concepteur</option>
                  <option value="erreur_livraison">Erreur livraison</option>
                  <option value="manquant">Manquant</option>
                </select>
                {errors.raison && <span className="error-message">{errors.raison}</span>}
              </div>
            </>
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