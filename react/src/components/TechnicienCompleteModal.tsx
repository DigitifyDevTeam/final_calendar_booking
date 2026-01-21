import React, { useState, useEffect } from 'react'
import './TechnicienCompleteModal.css'
import { finishBooking } from '../services/bookingService'

interface TechnicienCompleteModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  bookingCalendarId?: string
  isDarkMode?: boolean
  onFinish?: (payload: {
    bookingId: string
    menageFait: boolean
    cftSigne: boolean
    electromenagerFonctionnel?: boolean
    attachments: File[]
  }) => void
}

const TechnicienCompleteModal: React.FC<TechnicienCompleteModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  bookingCalendarId,
  isDarkMode = true,
  onFinish
}) => {
  const [menageFait, setMenageFait] = useState(false)
  const [cftSigne, setCftSigne] = useState(false)
  const [electromenagerFonctionnel, setElectromenagerFonctionnel] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  const isSavCalendar = ['calendar2', '2'].includes(bookingCalendarId || '')
  const isMetreCalendar = ['calendar3', '3'].includes(bookingCalendarId || '')

  useEffect(() => {
    if (isOpen) {
      setMenageFait(false)
      setCftSigne(false)
      setElectromenagerFonctionnel(false)
      setFiles([])
      setSubmitting(false)
    }
  }, [isOpen, bookingId])

  if (!isOpen) return null

  const handleFinish = async () => {
    setSubmitting(true)
    try {
      // Call the API to finish the booking
      await finishBooking(bookingId, {
        menageFait,
        cftSigne,
        electromenagerFonctionnel: (isSavCalendar || isMetreCalendar) ? electromenagerFonctionnel : undefined,
        attachments: files
      })
      
      // Call optional callback if provided
      if (onFinish) {
        await onFinish({
          bookingId,
          menageFait,
          cftSigne,
          electromenagerFonctionnel: (isSavCalendar || isMetreCalendar) ? electromenagerFonctionnel : undefined,
          attachments: files
        })
      }
      
      alert('Réservation finalisée avec succès!')
      onClose()
    } catch (error: any) {
      console.error('Error finishing reservation:', error)
      alert(error?.message || 'Erreur lors de la finalisation de la réservation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`technicien-complete-modal-overlay ${isDarkMode ? 'dark-mode' : 'light-mode'}`} onClick={onClose}>
      <div className="technicien-complete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="technicien-complete-modal-header">
          <h2>Finaliser l'intervention</h2>
          <button className="close-button" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="technicien-complete-modal-content">
          <div className="checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={menageFait}
                onChange={(e) => setMenageFait(e.target.checked)}
              />
              <span>Le ménage est fait </span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={cftSigne}
                onChange={(e) => setCftSigne(e.target.checked)}
              />
              <span>Le CFT est signé </span>
            </label>
            {(isSavCalendar || isMetreCalendar) && (
              <label>
                <input
                  type="checkbox"
                  checked={electromenagerFonctionnel}
                  onChange={(e) => setElectromenagerFonctionnel(e.target.checked)}
                />
                <span>L’électroménager est fonctionnel </span>
              </label>
            )}
          </div>

          <div className="upload-row">
            <label htmlFor="technicien-complete-files" className="upload-label">
              Ajouter un ou plusieurs fichiers (PDF ou images)
            </label>
            <input
              id="technicien-complete-files"
              type="file"
              accept=".pdf,image/*"
              multiple
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : []
                setFiles((prev) => [...prev, ...list])
              }}
            />
            {files.length > 0 && (
              <div className="upload-preview">
                {files.map((f, idx) => (
                  <span key={idx} className="file-chip">{f.name}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="technicien-complete-modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Annuler
          </button>
          <button
            className="finish-button"
            disabled={submitting}
            onClick={handleFinish}
          >
            {submitting ? 'En cours...' : 'Terminer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TechnicienCompleteModal
