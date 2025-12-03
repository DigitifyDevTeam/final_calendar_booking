import React, { useState, useEffect } from 'react'
import { CALENDAR_CONFIGS } from '../services/bookingService'
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
}

const AdminBookingModal: React.FC<AdminBookingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  booking,
  isDarkMode = true,
  users = []
}) => {
  const [formData, setFormData] = useState<AdminBookingFormData>({
    calendar_id: CALENDAR_CONFIGS['calendar1'],
    booking_date: '',
    booking_time: '',
    client_name: '',
    client_phone: '',
    designer_name: '',
    message: ''
  })
  const [errors, setErrors] = useState<Partial<Record<keyof AdminBookingFormData, string>>>({})

  useEffect(() => {
    if (booking) {
      // Edit mode - populate form with existing booking data
      setFormData({
        calendar_id: booking.calendarId || CALENDAR_CONFIGS['calendar1'],
        booking_date: booking.date || '',
        booking_time: booking.time && booking.time !== '21h00' ? booking.time : '',
        client_name: booking.name || '',
        client_phone: booking.phone || '',
        designer_name: booking.designer || '',
        message: booking.message || ''
      })
    } else {
      // Create mode - reset form
      setFormData({
        calendar_id: CALENDAR_CONFIGS['calendar1'],
        booking_date: '',
        booking_time: '',
        client_name: '',
        client_phone: '',
        designer_name: '',
        message: ''
      })
    }
    setErrors({})
  }, [booking, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // For phone number, only allow numbers
    if (name === 'client_phone') {
      const numericValue = value.replace(/\D/g, '')
      setFormData(prev => ({ ...prev, [name]: numericValue }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
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

    // For time slot calendars (SAV and Metré), time is required
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
      // Determine the calendar_id to use
      const currentCalendarId = booking ? (booking.calendarId || formData.calendar_id) : formData.calendar_id
      const isPoseCalendar = currentCalendarId === CALENDAR_CONFIGS['calendar1']
      
      // For Pose calendar, use default time if not provided
      // For other calendars, keep the time as is (it's required and validated)
      const bookingData = {
        ...formData,
        calendar_id: currentCalendarId, // Always include calendar_id for backend validation
        booking_time: isPoseCalendar && !formData.booking_time ? '21h00' : (formData.booking_time || '')
      }
      
      onSubmit(bookingData)
    }
  }

  const getTimeSlotOptions = (): string[] => {
    // Use booking's calendar_id if editing, otherwise use formData.calendar_id
    const calendarId = booking ? (booking.calendarId || formData.calendar_id) : formData.calendar_id
    if (calendarId === CALENDAR_CONFIGS['calendar2']) {
      // SAV calendar time slots
      return ['9h00', '10h30', '14h00']
    } else if (calendarId === CALENDAR_CONFIGS['calendar3']) {
      // Metré calendar time slots
      return ['8-10', '10-12', '14-16', '16-18']
    }
    return []
  }

  if (!isOpen) return null

  const timeSlotOptions = getTimeSlotOptions()
  const isTimeSlotCalendar = timeSlotOptions.length > 0

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
            <label htmlFor="booking_date">Date *</label>
            <input
              type="date"
              id="booking_date"
              name="booking_date"
              value={formData.booking_date}
              onChange={handleInputChange}
              className={errors.booking_date ? 'error' : ''}
            />
            {errors.booking_date && <span className="error-message">{errors.booking_date}</span>}
          </div>

          {isTimeSlotCalendar && (
            <div className="form-group">
              <label htmlFor="booking_time">Créneau horaire *</label>
              <select
                id="booking_time"
                name="booking_time"
                value={formData.booking_time}
                onChange={handleInputChange}
                className={errors.booking_time ? 'error' : ''}
              >
                <option value="">Sélectionner un créneau</option>
                {timeSlotOptions.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
              {errors.booking_time && <span className="error-message">{errors.booking_time}</span>}
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
                {users.filter(user => user.role !== 'admin').map(user => (
                  <option key={user.id} value={user.name}>
                    {user.name} (Technicien)
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

