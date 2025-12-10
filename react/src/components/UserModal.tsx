import React, { useState, useEffect } from 'react'
import './UserModal.css'

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: UserFormData) => void
  user?: any // Existing user for edit mode
  isDarkMode?: boolean
}

export interface UserFormData {
  name: string
  email: string
  phone: string
  role: 'admin' | 'concepteur' | 'technicien'
  password: string
  confirm_password?: string
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  isDarkMode = true
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    phone: '',
    role: 'concepteur',
    password: ''
  })
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData | 'confirmPassword', string>>>({})

  useEffect(() => {
    if (user) {
      // Edit mode - populate form with existing user data
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'concepteur',
        password: '' // Don't populate password in edit mode
      })
      setConfirmPassword('')
    } else {
      // Create mode - reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'concepteur',
        password: ''
      })
      setConfirmPassword('')
    }
    setErrors({})
  }, [user, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    // Handle confirm password separately
    if (name === 'confirmPassword') {
      setConfirmPassword(value)
      // Clear error when user starts typing
      if (errors.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: undefined }))
      }
      return
    }
    
    // For phone number, only allow numbers
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '')
      setFormData(prev => ({ ...prev, [name]: numericValue }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    // Clear error for this field
    if (errors[name as keyof UserFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
    
    // Also clear confirmPassword error if password changes
    if (name === 'password' && errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UserFormData | 'confirmPassword', string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Le téléphone est requis'
    } else if (formData.phone.length < 8) {
      newErrors.phone = 'Le numéro de téléphone doit contenir au moins 8 chiffres'
    }

    if (!formData.role) {
      newErrors.role = 'Le rôle est requis'
    }

    // Password is required only when creating a new user
    if (!user && !formData.password.trim()) {
      newErrors.password = 'Le mot de passe est requis'
    } else if (!user && formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères'
    }

    // Password confirmation validation (only for new users or when password is being changed)
    if (!user) {
      // For new users, confirmPassword is required
      if (!confirmPassword.trim()) {
        newErrors.confirmPassword = 'Veuillez confirmer le mot de passe'
      } else if (formData.password !== confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
      }
    } else if (formData.password.trim()) {
      // For editing users, if password is provided, confirmPassword is required
      if (!confirmPassword.trim()) {
        newErrors.confirmPassword = 'Veuillez confirmer le mot de passe'
      } else if (formData.password !== confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (validateForm()) {
      // Include confirm_password in the form data for API validation
      onSubmit({
        ...formData,
        confirm_password: confirmPassword
      })
    }
  }

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the overlay, not on any child elements
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={`user-modal-overlay ${isDarkMode ? 'dark-mode' : 'light-mode'}`} onClick={handleOverlayClick}>
      <div className="user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-modal-header">
          <h2>{user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="user-modal-form">
          <div className="form-group">
            <label htmlFor="name">Nom *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={errors.name ? 'error' : ''}
              placeholder="Ex: Jean Dupont"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={errors.email ? 'error' : ''}
              placeholder="Ex: jean.dupont@example.com"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Téléphone *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={errors.phone ? 'error' : ''}
              placeholder="Ex: 0612345678"
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="role">Rôle *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className={errors.role ? 'error' : ''}
            >
              <option value="concepteur">Concepteur</option>
              <option value="technicien">Technicien</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && <span className="error-message">{errors.role}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Mot de passe {!user && '*'}
              {user && <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#999' }}>(Laisser vide pour ne pas modifier)</span>}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={errors.password ? 'error' : ''}
              placeholder={user ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {(!user || formData.password.trim()) && (
            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirmer le mot de passe *
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleInputChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Confirmer le mot de passe"
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="submit-button">
              {user ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserModal

