import React, { useState, useEffect } from 'react'
import { X, Store, Users, Check } from 'lucide-react'
import { UserRecord } from '../services/userService'
import './MagasinModal.css'

interface MagasinModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: MagasinFormData) => void
  magasin?: any // Existing magasin for edit mode
  concepteurs: UserRecord[] // List of available concepteurs
  isDarkMode?: boolean
}

export interface MagasinFormData {
  name: string
  responsable_email: string
  concepteurs: number[]
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MagasinModal: React.FC<MagasinModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  magasin,
  concepteurs
}) => {
  const [formData, setFormData] = useState<MagasinFormData>({
    name: '',
    responsable_email: '',
    concepteurs: []
  })
  const [errors, setErrors] = useState<Partial<Record<keyof MagasinFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (magasin) {
      // Edit mode - populate form with existing magasin data
      // concepteurs can be either an array of IDs (numbers) or an array of objects with id property
      let concepteurIds: number[] = []
      if (magasin.concepteurs && Array.isArray(magasin.concepteurs)) {
        if (magasin.concepteurs.length > 0) {
          // Check if it's an array of numbers or objects
          if (typeof magasin.concepteurs[0] === 'number') {
            concepteurIds = magasin.concepteurs as number[]
          } else {
            // It's an array of objects, extract IDs
            concepteurIds = (magasin.concepteurs as any[]).map((c: any) => c.id || c).filter((id: any) => id != null)
          }
        }
      }
      // Fallback to concepteurs_details if concepteurs is not available
      if (concepteurIds.length === 0 && magasin.concepteurs_details && Array.isArray(magasin.concepteurs_details)) {
        concepteurIds = magasin.concepteurs_details.map((c: any) => c.id).filter((id: any) => id != null)
      }
      
      setFormData({
        name: magasin.name || '',
        responsable_email: magasin.responsable_email || '',
        concepteurs: concepteurIds
      })
    } else {
      // Create mode - reset form
      setFormData({
        name: '',
        responsable_email: '',
        concepteurs: []
      })
    }
    setErrors({})
    setIsSubmitting(false)
  }, [magasin, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleConcepteurToggle = (concepteurId: number) => {
    setFormData(prev => {
      const currentConcepteurs = prev.concepteurs || []
      const isSelected = currentConcepteurs.includes(concepteurId)

      if (isSelected) {
        setErrors(e => ({ ...e, concepteurs: undefined }))
        return {
          ...prev,
          concepteurs: currentConcepteurs.filter(id => id !== concepteurId)
        }
      }

      setErrors(e => ({ ...e, concepteurs: undefined }))
      return {
        ...prev,
        concepteurs: [...currentConcepteurs, concepteurId]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const newErrors: Partial<Record<keyof MagasinFormData, string>> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du magasin est requis'
    }

    const responsableEmail = formData.responsable_email.trim()
    if (!responsableEmail) {
      newErrors.responsable_email = "L'adresse e-mail du responsable du magasin est requise"
    } else if (!EMAIL_REGEX.test(responsableEmail)) {
      newErrors.responsable_email = 'Veuillez saisir une adresse e-mail valide'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        name: formData.name.trim(),
        responsable_email: responsableEmail,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const bgColor = '#000000' // Always black background
  const textColor = '#ffffff'
  const textSecondary = '#9ca3af'
  const borderColor = '#1a1a1a'
  const inputBg = '#0a0a0a'
  const hoverBg = '#1a1a1a'
  const orangeColor = '#284B73'

  return (
    <div className="magasin-modal-overlay" onClick={onClose}>
      <div 
        className="magasin-modal-container" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          backgroundColor: bgColor,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(250, 84, 28, 0.1)'
        }}
      >
        {/* Header */}
        <div className="magasin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'transparent',
              border: `2px solid ${orangeColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${orangeColor}40`
            }}>
              <Store size={24} color={orangeColor} />
            </div>
            <div>
              <h2 style={{ 
                color: textColor, 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: 700,
                letterSpacing: '-0.5px'
              }}>
                {magasin ? 'Modifier le magasin' : 'Créer un nouveau magasin'}
              </h2>
              <p style={{ 
                color: textSecondary, 
                margin: '4px 0 0 0', 
                fontSize: '14px',
                fontWeight: 400
              }}>
                {magasin ? 'Mettez à jour les informations du magasin' : 'Ajoutez un nouveau magasin à votre système'}
              </p>
            </div>
          </div>
          <button 
            className="magasin-modal-close" 
            onClick={onClose}
            style={{ 
              color: orangeColor,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = hoverBg
              e.currentTarget.style.color = orangeColor
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = orangeColor
            }}
          >
            <X size={20} color={orangeColor} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="magasin-modal-form">
          {/* Store Name Field */}
          <div className="magasin-form-group">
            <label htmlFor="name" style={{ 
              color: textColor,
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '8px',
              display: 'block'
            }}>
              Nom du magasin <span style={{ color: '#284B73' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'magasin-input-error' : 'magasin-input'}
                style={{
                  backgroundColor: inputBg,
                  color: textColor,
                  borderColor: errors.name ? '#284B73' : borderColor,
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: `2px solid ${errors.name ? '#284B73' : borderColor}`,
                  fontSize: '15px',
                  fontWeight: 400,
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = errors.name ? '#284B73' : orangeColor
                  e.currentTarget.style.boxShadow = errors.name 
                    ? `0 0 0 3px ${orangeColor}15` 
                    : `0 0 0 3px ${orangeColor}15`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.name ? '#284B73' : borderColor
                  e.currentTarget.style.boxShadow = 'none'
                }}
                placeholder="Entrez le nom du magasin"
              />
            </div>
            {errors.name && (
              <span style={{ 
                color: '#284B73', 
                fontSize: '13px', 
                marginTop: '6px',
                display: 'block',
                fontWeight: 500
              }}>
                {errors.name}
              </span>
            )}
          </div>

          {/* Responsable email Field */}
          <div className="magasin-form-group">
            <label htmlFor="responsable_email" style={{
              color: textColor,
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '8px',
              display: 'block'
            }}>
              E-mail du responsable du magasin <span style={{ color: '#284B73' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                id="responsable_email"
                name="responsable_email"
                value={formData.responsable_email}
                onChange={handleChange}
                className={errors.responsable_email ? 'magasin-input-error' : 'magasin-input'}
                style={{
                  backgroundColor: inputBg,
                  color: textColor,
                  borderColor: errors.responsable_email ? '#284B73' : borderColor,
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: `2px solid ${errors.responsable_email ? '#284B73' : borderColor}`,
                  fontSize: '15px',
                  fontWeight: 400,
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = errors.responsable_email ? '#284B73' : orangeColor
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${orangeColor}15`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.responsable_email ? '#284B73' : borderColor
                  e.currentTarget.style.boxShadow = 'none'
                }}
                placeholder="responsable@exemple.com"
                autoComplete="email"
              />
            </div>
            {errors.responsable_email && (
              <span style={{
                color: '#284B73',
                fontSize: '13px',
                marginTop: '6px',
                display: 'block',
                fontWeight: 500
              }}>
                {errors.responsable_email}
              </span>
            )}
          </div>

          {/* Concepteurs Section */}
          <div className="magasin-form-group">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <label style={{ 
                color: textColor,
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Users size={18} color={orangeColor} />
                Concepteurs associés
              </label>
              {formData.concepteurs.length > 0 && (
                <span style={{
                  backgroundColor: `${orangeColor}20`,
                  color: orangeColor,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {formData.concepteurs.length} sélectionné{formData.concepteurs.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            <div style={{
              maxHeight: '320px',
              overflowY: 'auto',
              border: `2px solid ${borderColor}`,
              borderRadius: '12px',
              padding: '8px',
              backgroundColor: inputBg,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {concepteurs.length === 0 ? (
                <div style={{ 
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: textSecondary
                }}>
                  <Users size={48} color={orangeColor} style={{ opacity: 0.5, marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
                    Aucun concepteur disponible
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                    Créez d'abord des comptes concepteurs
                  </p>
                </div>
              ) : (
                concepteurs.map(concepteur => {
                  const isSelected = formData.concepteurs.includes(concepteur.id)
                  return (
                    <div
                      key={concepteur.id}
                      onClick={() => handleConcepteurToggle(concepteur.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        backgroundColor: isSelected 
                          ? `${orangeColor}20`
                          : 'transparent',
                        border: `2px solid ${isSelected ? orangeColor : 'transparent'}`,
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = hoverBg
                          e.currentTarget.style.borderColor = borderColor
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.borderColor = 'transparent'
                        }
                      }}
                    >
                      {/* Custom Checkbox */}
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: `2px solid ${isSelected ? orangeColor : borderColor}`,
                        backgroundColor: isSelected ? orangeColor : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '14px',
                        flexShrink: 0,
                        transition: 'all 0.2s'
                      }}>
                        {isSelected && (
                          <Check size={16} color="#ffffff" strokeWidth={3} />
                        )}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: 600, 
                          color: textColor,
                          fontSize: '15px',
                          marginBottom: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          {concepteur.name}
                        </div>
                        <div style={{ 
                          fontSize: '13px', 
                          color: textSecondary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {concepteur.email}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            {errors.concepteurs && (
              <span style={{
                color: '#f87171',
                fontSize: '13px',
                marginTop: '8px',
                display: 'block',
                fontWeight: 500,
                lineHeight: 1.4
              }}>
                {errors.concepteurs}
              </span>
            )}
          </div>

          {/* Footer Actions */}
          <div className="magasin-modal-footer">
            <button
              type="button"
              className="magasin-modal-cancel"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                backgroundColor: '#1a1a1a',
                color: textColor,
                border: `2px solid ${borderColor}`,
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: isSubmitting ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = hoverBg
                  e.currentTarget.style.borderColor = borderColor
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = '#1a1a1a'
                }
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="magasin-modal-submit"
              disabled={isSubmitting}
              style={{
                background: isSubmitting 
                  ? '#1a1a1a'
                  : `linear-gradient(135deg, ${orangeColor} 0%, #F7931E 100%)`,
                color: '#ffffff',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: isSubmitting 
                  ? 'none' 
                  : `0 4px 12px ${orangeColor}40`,
                opacity: isSubmitting ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = `0 6px 16px ${orangeColor}50`
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = `0 4px 12px ${orangeColor}40`
                }
              }}
            >
              {isSubmitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }} />
                  {magasin ? 'Modification...' : 'Création...'}
                </span>
              ) : (
                magasin ? 'Modifier' : 'Créer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MagasinModal
