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
    menageFait?: boolean
    cftSigne: boolean
    electromenager_fonctionnel?: boolean
    sav_a_prevoir?: boolean
    ascenseur_escaliers?: boolean
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
  const [electromenagerFonctionnel, setElectromenagerFonctionnel] = useState<boolean | null>(null)
  const [savAPrevoir, setSavAPrevoir] = useState<boolean | null>(null)
  const [ascenseurEscaliers, setAscenseurEscaliers] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  const isSavCalendar = ['calendar2', '2'].includes(bookingCalendarId || '')
  const isMetreCalendar = ['calendar3', '3'].includes(bookingCalendarId || '')
  const isPoseCalendar = ['calendar1', '1'].includes(bookingCalendarId || '')
  const isSavOrMetre = isSavCalendar || isMetreCalendar
  const showMenageCheckbox = !isMetreCalendar
  const showElectromenagerCheckbox = isSavCalendar || isPoseCalendar
  const showSavAPrevoirCheckbox = isSavCalendar || isPoseCalendar
  const showAscenseurEscaliersCheckbox = isMetreCalendar
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
      setElectromenagerFonctionnel(null)
      setSavAPrevoir(null)
      setAscenseurEscaliers(false)
      setFiles([])
      setSubmitting(false)
    }
  }, [isOpen, bookingId])

  if (!isOpen) return null

  // Check if button should be enabled: same-day (SAV/Metre), checkboxes, radio answers (Oui/Non), ascenseur (Metré), files, and not already finished
  const menageRequired = !showMenageCheckbox || menageFait
  const electromenagerAnswered = !showElectromenagerCheckbox || electromenagerFonctionnel !== null
  const savAnswered = !showSavAPrevoirCheckbox || savAPrevoir !== null
  const ascenseurRequired = !showAscenseurEscaliersCheckbox || ascenseurEscaliers
  const isFinishButtonEnabled = canFinishByDate && menageRequired && cftSigne && electromenagerAnswered && savAnswered && ascenseurRequired && files.length > 0 && !isAlreadyFinished

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
        menageFait: showMenageCheckbox ? menageFait : undefined,
        cftSigne,
        electromenagerFonctionnel: showElectromenagerCheckbox && electromenagerFonctionnel !== null ? electromenagerFonctionnel : undefined,
        savAPrevoir: showSavAPrevoirCheckbox && savAPrevoir !== null ? savAPrevoir : undefined,
        ascenseurEscaliers: showAscenseurEscaliersCheckbox ? ascenseurEscaliers : undefined,
        attachments: files
      })
      
      // Call optional callback if provided
      if (onFinish) {
        await onFinish({
          bookingId,
          menageFait: showMenageCheckbox ? menageFait : undefined,
          cftSigne,
          electromenager_fonctionnel: showElectromenagerCheckbox && electromenagerFonctionnel !== null ? electromenagerFonctionnel : undefined,
          sav_a_prevoir: showSavAPrevoirCheckbox && savAPrevoir !== null ? savAPrevoir : undefined,
          ascenseur_escaliers: showAscenseurEscaliersCheckbox ? ascenseurEscaliers : undefined,
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
      <div className="technicien-complete-modal-wrapper">
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
            {showMenageCheckbox && (
              <label>
                <input
                  type="checkbox"
                  checked={menageFait}
                  onChange={(e) => setMenageFait(e.target.checked)}
                />
                <span>Le ménage est fait </span>
              </label>
            )}
            <label>
              <input
                type="checkbox"
                checked={cftSigne}
                onChange={(e) => setCftSigne(e.target.checked)}
              />
              <span>Le CFT est signé </span>
            </label>
            {showAscenseurEscaliersCheckbox && (
              <label>
                <input
                  type="checkbox"
                  checked={ascenseurEscaliers}
                  onChange={(e) => setAscenseurEscaliers(e.target.checked)}
                />
                <span>J'ai pris l'ascenseur et les escaliers</span>
              </label>
            )}
            {showElectromenagerCheckbox && (
              <div className="radio-group">
                <span className="radio-group-label">L'électroménager est fonctionnel</span>
                <div className="radio-options">
                  <label>
                    <input
                      type="radio"
                      name="electromenager"
                      checked={electromenagerFonctionnel === true}
                      onChange={() => setElectromenagerFonctionnel(true)}
                    />
                    <span>Oui</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="electromenager"
                      checked={electromenagerFonctionnel === false}
                      onChange={() => setElectromenagerFonctionnel(false)}
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>
            )}
            {showSavAPrevoirCheckbox && (
              <div className="radio-group">
                <span className="radio-group-label">Un SAV à prévoir ?</span>
                <div className="radio-options">
                  <label>
                    <input
                      type="radio"
                      name="sav_prevoir"
                      checked={savAPrevoir === true}
                      onChange={() => setSavAPrevoir(true)}
                    />
                    <span>Oui</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="sav_prevoir"
                      checked={savAPrevoir === false}
                      onChange={() => setSavAPrevoir(false)}
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>
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
    </div>
  )
}

export default TechnicienCompleteModal
