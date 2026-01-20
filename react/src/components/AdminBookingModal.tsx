import React, { useState, useEffect, useMemo } from 'react'
import { CALENDAR_CONFIGS, getAllBookings, BookingRecord } from '../services/bookingService'
import './AdminBookingModal.css'

interface UserOption {
  id: number
  name: string
  email: string
  role: string
}

interface AdminBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AdminBookingFormData) => void
  booking?: any // Existing booking for edit mode
  isDarkMode?: boolean
  users?: UserOption[] // List of users for designer selection (admin only)
}

export interface AdminBookingFormData {
  calendar_id: string
  booking_date: string
  booking_time: string
  client_name: string
  client_phone: string
  designer_name: string
  message: string
  pose_effectue_par_wood_agency?: boolean
}

const AdminBookingModal: React.FC<AdminBookingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  booking,
  isDarkMode = true,
  users = []
}) => {
  // Track original value to detect changes when editing
  const [originalPoseValue, setOriginalPoseValue] = useState<boolean | null | undefined>(null)
  
  const [formData, setFormData] = useState<AdminBookingFormData>({
    calendar_id: CALENDAR_CONFIGS['calendar1'],
    booking_date: '',
    booking_time: '',
    client_name: '',
    client_phone: '',
    designer_name: '',
    message: '',
    pose_effectue_par_wood_agency: false
  })
  const [errors, setErrors] = useState<Partial<Record<keyof AdminBookingFormData, string>>>({})
  
  // Track bookings for the selected date to filter available time slots
  const [bookingsForSelectedDate, setBookingsForSelectedDate] = useState<BookingRecord[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  // Helper function to format date to YYYY-MM-DD for date input
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return ''
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    // Try to parse and format the date
    try {
      const date = new Date(dateString + 'T00:00:00')
      if (isNaN(date.getTime())) return ''
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return dateString
    }
  }

  useEffect(() => {
    if (booking) {
      // Edit mode - populate form with existing booking data
      const originalValue = (booking as any).pose_effectue_par_wood_agency
      setOriginalPoseValue(originalValue)
      // Get calendar_id from booking (check both calendarId and calendar_id properties)
      const bookingCalendarId = (booking as any).calendarId || (booking as any).calendar_id || CALENDAR_CONFIGS['calendar1']
      
      setFormData({
        calendar_id: bookingCalendarId,
        booking_date: formatDateForInput(booking.date || ''),
        booking_time: booking.time && booking.time !== '21h00' ? booking.time : '',
        client_name: booking.name || '',
        client_phone: booking.phone || '',
        designer_name: booking.designer || '',
        message: booking.message || '',
        pose_effectue_par_wood_agency: originalValue ?? false
      })
    } else {
      // Create mode - reset form
      setOriginalPoseValue(null)
      setFormData({
        calendar_id: CALENDAR_CONFIGS['calendar1'],
        booking_date: '',
        booking_time: '',
        client_name: '',
        client_phone: '',
        designer_name: '',
        message: '',
        pose_effectue_par_wood_agency: false
      })
    }
    setErrors({})
  }, [booking, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    // For phone number, only allow numbers
    if (name === 'client_phone') {
      const numericValue = value.replace(/\D/g, '')
      setFormData(prev => ({ ...prev, [name]: numericValue }))
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      // If calendar changes, clear time slot (different calendars have different time slots)
      if (name === 'calendar_id') {
        setFormData(prev => ({ ...prev, [name]: value, booking_time: '' }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
      }
    }
    
    // Clear error for this field
    if (errors[name as keyof AdminBookingFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AdminBookingFormData, string>> = {}

    // Only validate calendar_id when creating a new booking (not editing)
    if (!booking && !formData.calendar_id.trim()) {
      newErrors.calendar_id = 'Le calendrier est requis'
    }

    if (!formData.booking_date.trim()) {
      newErrors.booking_date = 'La date est requise'
    }

    // For time slot calendars (Metré and SAV), time is required
    // Use the calendar_id from formData if creating, or from booking if editing
    const currentCalendarId = booking ? (booking.calendarId || formData.calendar_id) : formData.calendar_id
    const timeSlotCalendars = [CALENDAR_CONFIGS['calendar2'], CALENDAR_CONFIGS['calendar3']]
    if (timeSlotCalendars.includes(currentCalendarId) && !formData.booking_time.trim()) {
      newErrors.booking_time = 'Le créneau horaire est requis pour ce calendrier'
    }

    if (!formData.client_name.trim()) {
      newErrors.client_name = 'Le nom du client est requis'
    }

    if (!formData.client_phone.trim()) {
      newErrors.client_phone = 'Le téléphone est requis'
    } else if (formData.client_phone.length < 8) {
      newErrors.client_phone = 'Le numéro de téléphone doit contenir au moins 8 chiffres'
    }

    if (!formData.designer_name.trim()) {
      newErrors.designer_name = 'Le nom du concepteur est requis'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (validateForm()) {
      // Determine the calendar_id to use (check both calendarId and calendar_id properties)
      const currentCalendarId = booking 
        ? ((booking as any).calendarId || (booking as any).calendar_id || formData.calendar_id)
        : formData.calendar_id
      const isPoseCalendar = currentCalendarId === CALENDAR_CONFIGS['calendar1']
      
      // For Pose calendar, use default time if not provided
      // For other calendars, keep the time as is (it's required and validated)
      const bookingData: any = {
        ...formData,
        calendar_id: currentCalendarId, // Always include calendar_id for backend validation
        booking_time: isPoseCalendar && !formData.booking_time ? '21h00' : (formData.booking_time || '')
      }
      
      // Handle pose_effectue_par_wood_agency for SAV calendar
      if (currentCalendarId === CALENDAR_CONFIGS['calendar2']) {
        const isEditing = booking !== undefined
        if (isEditing && (originalPoseValue === null || originalPoseValue === undefined)) {
          // Editing an existing booking that was null - only send if user explicitly checked it
          // If unchecked, don't send so it stays null
          if (formData.pose_effectue_par_wood_agency === true) {
            bookingData.pose_effectue_par_wood_agency = true
          }
          // If false, don't include in bookingData (won't be sent, stays null)
        } else {
          // New booking OR editing a booking that already had a value - send current value
          bookingData.pose_effectue_par_wood_agency = formData.pose_effectue_par_wood_agency
        }
      }
      
      onSubmit(bookingData)
    }
  }

  // Get all possible time slots for a calendar
  const getAllTimeSlotOptions = (calendarId: string): string[] => {
    if (calendarId === CALENDAR_CONFIGS['calendar2']) {
      // SAV calendar time slots
      return ['8:00-11:00', '11:00-14:00', '14:00-17:00']
    } else if (calendarId === CALENDAR_CONFIGS['calendar3']) {
      // Metré calendar time slots
      return ['8:00', '9:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30']
    }
    return []
  }

  // Get available time slots (filter out booked ones)
  const getAvailableTimeSlots = useMemo(() => {
    // Use booking's calendar_id if editing, otherwise use formData.calendar_id
    let calendarId: string | undefined
    if (booking) {
      calendarId = (booking as any).calendarId || (booking as any).calendar_id || formData.calendar_id
    } else {
      calendarId = formData.calendar_id
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
    
    // Get the original booking date to check if date has changed
    const originalBookingDate = booking?.date ? formatDateForInput(booking.date) : null
    const dateHasChanged = booking && originalBookingDate && formData.booking_date !== originalBookingDate
    
    // Get booked time slots for the selected date
    const bookedSlots = bookingsForSelectedDate
      .filter((b: BookingRecord) => {
        // Exclude the current booking being edited (only if date hasn't changed)
        if (booking && b.id === booking.id && !dateHasChanged) {
          return false
        }
        return b.date === formData.booking_date && b.time
      })
      .map((b: BookingRecord) => b.time)
    
    // Normalize time strings for comparison
    const normalizeTime = (time: string) => time.trim().toLowerCase()
    const normalizedBookedSlots = bookedSlots.map(normalizeTime)
    
    // Get current booking's time slot
    const currentBookingTimeSlot = booking?.time
    
    // Filter out booked slots
    // Only include current booking's time slot if:
    // 1. Date hasn't changed (still on original date), OR
    // 2. Date changed but that time slot is NOT booked on the new date
    const availableSlots = allSlots.filter(slot => {
      const normalizedSlot = normalizeTime(slot)
      
      // If this is the current booking's time slot
      if (currentBookingTimeSlot && normalizeTime(currentBookingTimeSlot) === normalizedSlot) {
        // If date hasn't changed, always include it
        if (!dateHasChanged) {
          return true
        }
        // If date changed, only include if it's NOT booked on the new date
        return !normalizedBookedSlots.includes(normalizedSlot)
      }
      
      // For other slots, exclude if booked
      return !normalizedBookedSlots.includes(normalizedSlot)
    })
    
    return availableSlots
  }, [formData.booking_date, formData.calendar_id, bookingsForSelectedDate, booking])

  // Fetch bookings when date changes
  useEffect(() => {
    if (!formData.booking_date) {
      setBookingsForSelectedDate([])
      return
    }
    
    // Determine calendar ID
    let calendarId: string | undefined
    if (booking) {
      calendarId = (booking as any).calendarId || (booking as any).calendar_id || formData.calendar_id
    } else {
      calendarId = formData.calendar_id
    }
    
    // Only fetch for time-slot calendars (SAV and Metré)
    if (calendarId !== CALENDAR_CONFIGS['calendar2'] && calendarId !== CALENDAR_CONFIGS['calendar3']) {
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
  }, [formData.booking_date, formData.calendar_id, booking])

  // Also fetch bookings when calendar changes (for new bookings)
  useEffect(() => {
    if (!booking && formData.booking_date && (formData.calendar_id === CALENDAR_CONFIGS['calendar2'] || formData.calendar_id === CALENDAR_CONFIGS['calendar3'])) {
      const fetchBookings = async () => {
        setLoadingBookings(true)
        try {
          const bookings = await getAllBookings(formData.calendar_id, {
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
    }
  }, [formData.calendar_id, booking])

  // Clear selected time slot if it's no longer available when date changes
  useEffect(() => {
    if (formData.booking_time && formData.booking_date) {
      const normalizeTime = (time: string) => time.trim().toLowerCase()
      const normalizedSelected = normalizeTime(formData.booking_time)
      const isAvailable = getAvailableTimeSlots.some(slot => normalizeTime(slot) === normalizedSelected)
      
      if (!isAvailable && getAvailableTimeSlots.length > 0) {
        // Clear the time slot if it's no longer available (but only if there are other options)
        setFormData(prev => ({ ...prev, booking_time: '' }))
      }
    }
  }, [getAvailableTimeSlots, formData.booking_time, formData.booking_date])

  if (!isOpen) return null

  // Use available time slots (filtered by date)
  const timeSlotOptions = getAvailableTimeSlots
  const isTimeSlotCalendar = timeSlotOptions.length > 0 || (formData.calendar_id === CALENDAR_CONFIGS['calendar2'] || formData.calendar_id === CALENDAR_CONFIGS['calendar3'])

  return (
    <div className={`admin-booking-modal-overlay ${isDarkMode ? 'dark-mode' : 'light-mode'}`} onClick={onClose}>
      <div className="admin-booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-booking-modal-header">
          <h2>{booking ? 'Modifier la réservation' : 'Nouvelle réservation'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="admin-booking-modal-form">
          {!booking && (
            <div className="form-group">
              <label htmlFor="calendar_id">Calendrier *</label>
              <select
                id="calendar_id"
                name="calendar_id"
                value={formData.calendar_id}
                onChange={handleInputChange}
                className={errors.calendar_id ? 'error' : ''}
              >
                <option value={CALENDAR_CONFIGS['calendar1']}>Pose</option>
                <option value={CALENDAR_CONFIGS['calendar2']}>SAV</option>
                <option value={CALENDAR_CONFIGS['calendar3']}>Metré</option>
              </select>
              {errors.calendar_id && <span className="error-message">{errors.calendar_id}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="booking_date">Date * {booking && <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>(Vous pouvez modifier la date)</span>}</label>
            {formData.booking_date && (
              <div className="selected-date-display">
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
              value={formData.booking_date}
              onChange={handleInputChange}
              className={errors.booking_date ? 'error' : ''}
              style={{ cursor: 'pointer' }}
            />
            {errors.booking_date && <span className="error-message">{errors.booking_date}</span>}
          </div>

          {isTimeSlotCalendar && (
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
                value={formData.booking_time}
                onChange={handleInputChange}
                className={errors.booking_time ? 'error' : ''}
                disabled={loadingBookings}
              >
                <option value="">Sélectionner un créneau</option>
                {timeSlotOptions.length > 0 ? (
                  timeSlotOptions.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                  ))
                ) : formData.booking_date ? (
                  <option value="" disabled>Tous les créneaux sont réservés pour cette date</option>
                ) : (
                  <option value="" disabled>Sélectionnez d'abord une date</option>
                )}
              </select>
              {errors.booking_time && <span className="error-message">{errors.booking_time}</span>}
              {formData.booking_date && timeSlotOptions.length === 0 && !loadingBookings && (
                <small style={{ display: 'block', color: '#ff4444', marginTop: '4px', fontSize: '0.85rem' }}>
                  ⚠️ Tous les créneaux sont réservés pour cette date. Veuillez choisir une autre date.
                </small>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="client_name">Nom du client *</label>
            <input
              type="text"
              id="client_name"
              name="client_name"
              value={formData.client_name}
              onChange={handleInputChange}
              className={errors.client_name ? 'error' : ''}
            />
            {errors.client_name && <span className="error-message">{errors.client_name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="client_phone">Téléphone *</label>
            <input
              type="tel"
              id="client_phone"
              name="client_phone"
              value={formData.client_phone}
              onChange={handleInputChange}
              className={errors.client_phone ? 'error' : ''}
              placeholder="Ex: 0612345678"
            />
            {errors.client_phone && <span className="error-message">{errors.client_phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="designer_name">Nom du concepteur *</label>
            {users.length > 0 ? (
              <select
                id="designer_name"
                name="designer_name"
                value={formData.designer_name}
                onChange={handleInputChange}
                className={errors.designer_name ? 'error' : ''}
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
                id="designer_name"
                name="designer_name"
                value={formData.designer_name}
                onChange={handleInputChange}
                className={errors.designer_name ? 'error' : ''}
              />
            )}
            {errors.designer_name && <span className="error-message">{errors.designer_name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="message">Message / Commentaire</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={4}
            />
          </div>

          {(formData.calendar_id === CALENDAR_CONFIGS['calendar2'] || (booking && ((booking as any).calendarId || (booking as any).calendar_id || formData.calendar_id) === CALENDAR_CONFIGS['calendar2'])) && (
            <div className="form-group">
              <label htmlFor="pose_effectue_par_wood_agency" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="pose_effectue_par_wood_agency"
                  name="pose_effectue_par_wood_agency"
                  checked={formData.pose_effectue_par_wood_agency ?? false}
                  onChange={handleInputChange}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Pose effectué par Wood agency</span>
              </label>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="submit-button">
              {booking ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminBookingModal

