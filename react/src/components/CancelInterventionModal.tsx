import React, { useEffect, useRef, useState } from 'react'
import './CancelInterventionModal.css'
import { cancelBooking } from '../services/bookingService'

interface CancelInterventionModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  bookingStatus?: string | null
  isDarkMode?: boolean
  onCancelled?: () => void | Promise<void>
}

const CancelInterventionModal: React.FC<CancelInterventionModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  bookingStatus,
  isDarkMode = true,
  onCancelled,
}) => {
  const [motif, setMotif] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAlreadyCancelled = bookingStatus === 'annule'
  const isAlreadyFinished = bookingStatus === 'termine'
  const isLocked = isAlreadyCancelled || isAlreadyFinished

  useEffect(() => {
    if (isOpen) {
      setMotif('')
      setAttachments([])
      setError(null)
      setSubmitting(false)
    }
  }, [isOpen, bookingId])

  if (!isOpen) return null

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const next: File[] = []
    Array.from(files).forEach((file) => {
      const lower = file.name.toLowerCase()
      const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf')
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(lower)
      if (isPdf || isImage) next.push(file)
    })
    if (next.length === 0) {
      setError('Seuls les fichiers images et PDF sont autorisés.')
      return
    }
    setError(null)
    setAttachments((prev) => [...prev, ...next])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLocked || submitting) return

    const trimmed = motif.trim()
    if (!trimmed) {
      setError('Le motif d\'annulation est obligatoire.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await cancelBooking(bookingId, {
        motif: trimmed,
        attachments,
      })
      if (onCancelled) {
        await onCancelled()
      }
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l\'annulation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={`cancel-intervention-overlay ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
      onClick={onClose}
    >
      <div className="cancel-intervention-wrapper" onClick={(e) => e.stopPropagation()}>
        <form className="cancel-intervention-modal" onSubmit={handleSubmit}>
          <div className="cancel-intervention-header">
            <div>
              <h2>Annuler l&apos;intervention</h2>
              <p>Le concepteur sera notifié par e-mail avec le motif et les pièces jointes.</p>
            </div>
            <button type="button" className="close-button" onClick={onClose} aria-label="Fermer">
              ×
            </button>
          </div>

          <div className="cancel-intervention-body">
            {isAlreadyCancelled && (
              <div className="cancel-status-banner is-cancelled">Cette intervention est déjà annulée.</div>
            )}
            {isAlreadyFinished && (
              <div className="cancel-status-banner is-finished">
                Cette intervention est terminée et ne peut plus être annulée.
              </div>
            )}

            <label className="cancel-field-label" htmlFor="cancel-motif">
              Motif <span className="required">*</span>
            </label>
            <textarea
              id="cancel-motif"
              className="cancel-motif-input"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Expliquez la raison de l'annulation..."
              rows={4}
              disabled={isLocked || submitting}
              required
            />

            <div className="cancel-upload-block">
              <p className="cancel-field-label">Pièces jointes (photos ou PDF)</p>
              <div className="cancel-upload-actions">
                <button
                  type="button"
                  className="cancel-upload-btn"
                  disabled={isLocked || submitting}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Pièce jointe
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf"
                multiple
                hidden
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />

              {attachments.length > 0 && (
                <ul className="cancel-attachment-list">
                  {attachments.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        disabled={submitting}
                        aria-label="Retirer"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <div className="cancel-error">{error}</div>}
          </div>

          <div className="cancel-intervention-footer">
            <button type="button" className="cancel-secondary-btn" onClick={onClose} disabled={submitting}>
              Fermer
            </button>
            <button
              type="submit"
              className="cancel-primary-btn"
              disabled={isLocked || submitting || !motif.trim()}
            >
              {submitting ? 'Annulation...' : 'Confirmer l\'annulation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CancelInterventionModal
