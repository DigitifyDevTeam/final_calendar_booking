import React, { useState, useEffect } from 'react'
import './TechnicienCompleteModal.css'
import { finishBooking } from '../services/bookingService'

interface TechnicienCompleteModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  bookingCalendarId?: string
  bookingDate?: string
  bookingStatus?: 'en_attente' | 'termine' | null
  isDarkMode?: boolean
  onFinish?: (payload: {
    bookingId: string
    menageFait: boolean
    cftSigne: boolean
    electromenager_fonctionnel?: boolean
    sav_a_prevoir?: boolean
    attachments: File[]
  }) => void
}

const TechnicienCompleteModal: React.FC<TechnicienCompleteModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  bookingCalendarId,
  bookingDate,
  bookingStatus = 'en_attente',
  isDarkMode = true,
  onFinish
}) => {
  const [menageFait, setMenageFait] = useState(false)
  const [cftSigne, setCftSigne] = useState(false)
  const [electromenagerFonctionnel, setElectromenagerFonctionnel] = useState(false)
  const [savAPrevoir, setSavAPrevoir] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  const isSavCalendar = ['calendar2', '2'].includes(bookingCalendarId || '')
  const isMetreCalendar = ['calendar3', '3'].includes(bookingCalendarId || '')
  const isPoseCalendar = ['calendar1', '1'].includes(bookingCalendarId || '')
  const isSavOrMetre = isSavCalendar || isMetreCalendar
  const showElectromenagerCheckbox = isSavCalendar || isMetreCalendar || isPoseCalendar
  const showSavAPrevoirCheckbox = isSavCalendar || isPoseCalendar
  const isAlreadyFinished = bookingStatus === 'termine'

  // SAV and Metré: can only finish on the same day as the reservation
  // Pose: can only finish on the day of the reservation OR the next day (J or J+1)
  const isSameDayAsReservation = !bookingDate ? true : (() => {
    const today = new Date()
    const resDate = new Date(bookingDate + 'T00:00:00')
    return today.getFullYear() === resDate.getFullYear() &&
           today.getMonth() === resDate.getMonth() &&
           today.getDate() === resDate.getDate()
  })()
  const isSameDayOrNextDay = !bookingDate ? true : (() => {
    const today = new Date()
    const resDate = new Date(bookingDate + 'T00:00:00')
    const nextDay = new Date(resDate)
    nextDay.setDate(nextDay.getDate() + 1)
    const sameDay = today.getFullYear() === resDate.getFullYear() &&
      today.getMonth() === resDate.getMonth() && today.getDate() === resDate.getDate()
    const nextDayMatch = today.getFullYear() === nextDay.getFullYear() &&
      today.getMonth() === nextDay.getMonth() && today.getDate() === nextDay.getDate()
    return sameDay || nextDayMatch
  })()
  const canFinishByDate = isPoseCalendar ? isSameDayOrNextDay : (!isSavOrMetre || isSameDayAsReservation)

  useEffect(() => {
    if (isOpen) {
      setMenageFait(false)
      setCftSigne(false)
      setElectromenagerFonctionnel(false)
      setSavAPrevoir(false)
      setFiles([])
      setSubmitting(false)
    }
  }, [isOpen, bookingId])

  if (!isOpen) return null

  // Check if button should be enabled: same-day (SAV/Metre), checkboxes, files, and not already finished
  const isFinishButtonEnabled = canFinishByDate && menageFait && cftSigne && files.length > 0 && !isAlreadyFinished

  const handleFinish = async () => {
    if (!isFinishButtonEnabled || isAlreadyFinished) {
      if (isAlreadyFinished) {
        alert('Cette réservation a déjà été terminée.')
      } else if (isSavOrMetre && !canFinishByDate) {
        alert('Vous ne pouvez terminer que le jour même de la réservation.')
      } else if (isPoseCalendar && !canFinishByDate) {
        alert('Vous ne pouvez terminer que le jour de la réservation ou le lendemain (J ou J+1).')
      }
      return
    }
    
    setSubmitting(true)
    try {
      // Call the API to finish the booking
      await finishBooking(bookingId, {
        menageFait,
        cftSigne,
        electromenagerFonctionnel: showElectromenagerCheckbox ? electromenagerFonctionnel : undefined,
        savAPrevoir: showSavAPrevoirCheckbox ? savAPrevoir : undefined,
        attachments: files
      })
      
      // Call optional callback if provided
      if (onFinish) {
        await onFinish({
          bookingId,
          menageFait,
          cftSigne,
          electromenager_fonctionnel: showElectromenagerCheckbox ? electromenagerFonctionnel : undefined,
          sav_a_prevoir: showSavAPrevoirCheckbox ? savAPrevoir : undefined,
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
          {isAlreadyFinished && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              marginBottom: '16px',
              fontWeight: 600,
              textAlign: 'center'
            }}>
              ✓ Cette réservation a déjà été terminée
            </div>
          )}
          {isSavOrMetre && !isSameDayAsReservation && !isAlreadyFinished && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              marginBottom: '16px',
              fontWeight: 600,
              textAlign: 'center'
            }}>
              Vous ne pouvez terminer que le jour même de la réservation.
            </div>
          )}
          {isPoseCalendar && !isSameDayOrNextDay && !isAlreadyFinished && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              marginBottom: '16px',
              fontWeight: 600,
              textAlign: 'center'
            }}>
              Vous ne pouvez terminer que le jour de la réservation ou le lendemain (J ou J+1).
            </div>
          )}
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
            {showElectromenagerCheckbox && (
              <label>
                <input
                  type="checkbox"
                  checked={electromenagerFonctionnel}
                  onChange={(e) => setElectromenagerFonctionnel(e.target.checked)}
                />
                <span>L’électroménager est fonctionnel </span>
              </label>
            )}
            {showSavAPrevoirCheckbox && (
              <label>
                <input
                  type="checkbox"
                  checked={savAPrevoir}
                  onChange={(e) => setSavAPrevoir(e.target.checked)}
                />
                <span>Un SAV à prévoir ? </span>
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
            disabled={submitting || !isFinishButtonEnabled || isAlreadyFinished || !canFinishByDate}
            onClick={handleFinish}
          >
            {submitting ? 'En cours...' : isAlreadyFinished ? 'Déjà terminé' : 'Terminer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TechnicienCompleteModal
