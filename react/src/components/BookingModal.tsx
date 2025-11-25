import React, { useState, useEffect } from 'react'
import './BookingModal.css'

interface BookingData {
  name: string
  phone: string
  designer: string
  message: string
  date: string
  selectedDate: Date
  timeSlot?: string
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
}

interface FormData {
  name: string
  phone: string
  designer: string
  message: string
}

interface FormErrors {
  name?: string
  phone?: string
  designer?: string
}

const BookingModal: React.FC<BookingModalProps> = ({ selectedDate, selectedTimeSlot, onClose, onSubmit, isDarkMode = false, initialData }) => {
  // Get user info from localStorage to auto-fill designer for techniciens
  const [technicienName, setTechnicienName] = useState<string>('')
  
  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        if (userData.role === 'technicien' && userData.name) {
          setTechnicienName(userData.name)
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
    message: initialData?.message || ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  
  // Update designer field when technicien name is loaded (only if not editing)
  useEffect(() => {
    if (technicienName && !initialData?.designer) {
      setFormData(prev => {
        // Only auto-fill if designer is empty
        if (!prev.designer.trim()) {
          return { ...prev, designer: technicienName }
        }
        return prev
      })
    }
  }, [technicienName, initialData?.designer])

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        phone: initialData.phone || '',
        designer: initialData.designer || '',
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
            <input
              type="text"
              id="designer"
              name="designer"
              value={formData.designer}
              onChange={handleInputChange}
              className={errors.designer ? 'error' : ''}
              placeholder="Entrez le nom du concepteur"
              readOnly={!!technicienName}
              style={technicienName ? { 
                backgroundColor: isDarkMode ? '#555' : '#f5f5f5', 
                cursor: 'not-allowed',
                opacity: 0.8
              } : {}}
            />
            {errors.designer && <span className="error-message">{errors.designer}</span>}
            {technicienName && (
              <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                ✓ Automatiquement rempli avec votre nom (non modifiable)
              </small>
            )}
          </div>

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