import React, { useState, useEffect, useRef } from 'react'
import './TechnicienCompleteModal.css'
import { finishBooking } from '../services/bookingService'

interface TechnicienCompleteModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  bookingCalendarId?: string
  bookingDate?: string
  bookingStatus?: 'en_attente' | 'termine' | 'annule' | null
  isDarkMode?: boolean
  /** Admin can close anytime without date constraints */
  skipDateRestrictions?: boolean
  onFinish?: (payload: {
    bookingId: string
    menageFait?: boolean
    cftSigne: boolean
    electromenager_fonctionnel?: boolean
    sav_a_prevoir?: boolean
    ascenseur_escaliers?: boolean
    message?: string
    attachments: File[]
  }) => void
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp']
const PDF_EXTENSIONS = ['.pdf']
const ALLOWED_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...PDF_EXTENSIONS])

const getFileExtension = (fileName: string): string => {
  const idx = fileName.lastIndexOf('.')
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : ''
}

const isAllowedAttachment = (file: File): boolean => {
  const ext = getFileExtension(file.name)
  if (ALLOWED_EXTENSIONS.has(ext)) return true
  const type = (file.type || '').toLowerCase()
  return type === 'application/pdf' || type.startsWith('image/')
}

const isPdfFile = (file: File): boolean => {
  const ext = getFileExtension(file.name)
  return ext === '.pdf' || (file.type || '').toLowerCase() === 'application/pdf'
}

const fileKey = (file: File): string => `${file.name}__${file.size}__${file.lastModified}`

const TechnicienCompleteModal: React.FC<TechnicienCompleteModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  bookingCalendarId,
  bookingDate,
  bookingStatus = 'en_attente',
  isDarkMode = true,
  skipDateRestrictions = false,
  onFinish
}) => {
  const [menageFait, setMenageFait] = useState(false)
  const [cftSigne, setCftSigne] = useState(false)
  const [electromenagerFonctionnel, setElectromenagerFonctionnel] = useState<boolean | null>(null)
  const [savAPrevoir, setSavAPrevoir] = useState<boolean | null>(null)
  const [ascenseurEscaliers, setAscenseurEscaliers] = useState(false)
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const isSavCalendar = ['calendar2', '2'].includes(bookingCalendarId || '')
  const isMetreCalendar = ['calendar3', '3'].includes(bookingCalendarId || '')
  const isPoseCalendar = ['calendar1', '1'].includes(bookingCalendarId || '')
  const isSavOrMetre = isSavCalendar || isMetreCalendar
  const showMenageCheckbox = !isMetreCalendar
  const showElectromenagerCheckbox = isSavCalendar || isPoseCalendar
  const showSavAPrevoirCheckbox = isSavCalendar || isPoseCalendar
  const showAscenseurEscaliersCheckbox = isMetreCalendar
  const isAlreadyFinished = bookingStatus === 'termine'
  const isAlreadyCancelled = bookingStatus === 'annule'
  const isLocked = isAlreadyFinished || isAlreadyCancelled

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
  const canFinishByDate = skipDateRestrictions
    ? true
    : (isPoseCalendar ? isSameDayOrNextDay : (!isSavOrMetre || isSameDayAsReservation))

  useEffect(() => {
    if (isOpen) {
      setMenageFait(false)
      setCftSigne(false)
      setElectromenagerFonctionnel(null)
      setSavAPrevoir(null)
      setAscenseurEscaliers(false)
      setMessage('')
      setFiles([])
      setUploadError(null)
      setSubmitting(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
      if (pdfInputRef.current) pdfInputRef.current.value = ''
    }
  }, [isOpen, bookingId])

  if (!isOpen) return null

  // Check if button should be enabled: same-day (SAV/Metre), checkboxes, radio answers (Oui/Non), ascenseur (Metré), files, and not already finished
  const menageRequired = !showMenageCheckbox || menageFait
  const electromenagerAnswered = !showElectromenagerCheckbox || electromenagerFonctionnel !== null
  const savAnswered = !showSavAPrevoirCheckbox || savAPrevoir !== null
  const ascenseurRequired = !showAscenseurEscaliersCheckbox || ascenseurEscaliers
  const isFinishButtonEnabled = canFinishByDate && menageRequired && cftSigne && electromenagerAnswered && savAnswered && ascenseurRequired && files.length > 0 && !isLocked

  const addAttachments = (incoming: File[]) => {
    if (incoming.length === 0) return

    const rejected = incoming.filter((file) => !isAllowedAttachment(file))
    const accepted = incoming.filter((file) => isAllowedAttachment(file))

    setFiles((prev) => {
      const existingKeys = new Set(prev.map(fileKey))
      const uniqueNew = accepted.filter((file) => !existingKeys.has(fileKey(file)))
      return [...prev, ...uniqueNew]
    })

    if (rejected.length > 0) {
      setUploadError('Seuls les fichiers PDF et images sont autorisés.')
    } else {
      setUploadError(null)
    }
  }

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : []
    addAttachments(list)
    e.target.value = ''
  }

  const removeAttachment = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setUploadError(null)
  }

  const handleFinish = async () => {
    if (!isFinishButtonEnabled || isLocked) {
      if (isAlreadyFinished) {
        alert('Cette réservation a déjà été terminée.')
      } else if (isAlreadyCancelled) {
        alert('Cette réservation a été annulée.')
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
        message: message.trim(),
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
          message: message.trim(),
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
          {isAlreadyCancelled && (
            <div style={{
              padding: '14px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid #ef4444',
              color: '#ef4444',
              marginBottom: '16px',
              fontWeight: 700,
              textAlign: 'center',
              fontSize: '15px',
            }}>
              ✕ Statut : Annulé
            </div>
          )}
          {isSavOrMetre && !isSameDayAsReservation && !isLocked && !skipDateRestrictions && (
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
          {isPoseCalendar && !isSameDayOrNextDay && !isLocked && !skipDateRestrictions && (
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
            <p className="upload-label">
              Ajouter des pièces jointes (images et PDF, ensemble)
            </p>
            <div className="upload-actions">
              <button
                type="button"
                className="upload-action-button"
                disabled={isLocked || submitting}
                onClick={() => imageInputRef.current?.click()}
              >
                Ajouter des images
              </button>
              <button
                type="button"
                className="upload-action-button"
                disabled={isLocked || submitting}
                onClick={() => pdfInputRef.current?.click()}
              >
                Ajouter des PDF
              </button>
            </div>
            <input
              ref={imageInputRef}
              id="technicien-complete-images"
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.bmp"
              multiple
              className="upload-input-hidden"
              onChange={handleAttachmentSelect}
            />
            <input
              ref={pdfInputRef}
              id="technicien-complete-pdfs"
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="upload-input-hidden"
              onChange={handleAttachmentSelect}
            />
            {uploadError && (
              <p className="upload-error">{uploadError}</p>
            )}
            {files.length > 0 && (
              <div className="upload-preview">
                {files.map((f, idx) => (
                  <span key={`${fileKey(f)}-${idx}`} className={`file-chip ${isPdfFile(f) ? 'file-chip-pdf' : 'file-chip-image'}`}>
                    <span className="file-chip-label">{isPdfFile(f) ? 'PDF' : 'IMG'}</span>
                    <span className="file-chip-name">{f.name}</span>
                    <button
                      type="button"
                      className="file-chip-remove"
                      aria-label={`Retirer ${f.name}`}
                      onClick={() => removeAttachment(idx)}
                      disabled={submitting}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="upload-hint">
              Vous pouvez ajouter plusieurs images et PDF en même temps.
            </p>
          </div>

          <div className="message-row">
            <label htmlFor="technicien-complete-message" className="upload-label">
              💬 Message / Commentaire (optionnel)
            </label>
            <textarea
              id="technicien-complete-message"
              className="completion-message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Indiquez la cause, le détail de l'intervention ou toute information importante…"
              rows={4}
              disabled={isLocked || submitting}
            />
          </div>
        </div>

        <div className="technicien-complete-modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Annuler
          </button>
          <button
            className="finish-button"
            disabled={submitting || !isFinishButtonEnabled || isLocked || !canFinishByDate}
            onClick={handleFinish}
            style={
              isAlreadyCancelled
                ? {
                    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                    borderColor: '#dc2626',
                    color: '#ffffff',
                    opacity: 0.95,
                    cursor: 'not-allowed',
                    fontWeight: 700,
                  }
                : undefined
            }
          >
            {submitting ? 'En cours...' : isAlreadyFinished ? 'Déjà terminé' : isAlreadyCancelled ? '✕ Annulé' : 'Terminer'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

export default TechnicienCompleteModal
