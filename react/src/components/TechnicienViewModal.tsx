import React, { useState, useEffect } from 'react'
import './TechnicienViewModal.css'
import { BookingRecord } from '../services/bookingService'
import TechnicienCompleteModal from './TechnicienCompleteModal'

interface TechnicienViewModalProps {
  isOpen: boolean
  onClose: () => void
  booking: BookingRecord | null
  isDarkMode?: boolean
  onFinish?: (payload: {
    bookingId: string
    menageFait: boolean
    cftSigne: boolean
    electromenager_fonctionnel?: boolean
    attachments: File[]
  }) => void
}

const TechnicienViewModal: React.FC<TechnicienViewModalProps> = ({
  isOpen,
  onClose,
  booking,
  isDarkMode = true,
  onFinish
}) => {
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [isOpen])

  if (!isOpen || !booking) return null

  const isPoseCalendar = ['calendar1', '1'].includes(booking.calendar_id || '')
  const isSavCalendar = ['calendar2', '2'].includes(booking.calendar_id || '')
  const isMetreCalendar = ['calendar3', '3'].includes(booking.calendar_id || '')
  const isAlreadyFinished = (booking as any).status === 'termine'

  // SAV and Metré: technicien can click "Terminer" only on the same day as the reservation date
  // Pose: technicien can click "Terminer" on the day of the reservation OR the next day (J or J+1) only
  const isSavOrMetre = isSavCalendar || isMetreCalendar
  const isSameDayAsReservation = (() => {
    if (!booking.date) return false
    const today = new Date()
    const resDate = new Date(booking.date + 'T00:00:00')
    return today.getFullYear() === resDate.getFullYear() &&
           today.getMonth() === resDate.getMonth() &&
           today.getDate() === resDate.getDate()
  })()
  const isSameDayOrNextDay = (() => {
    if (!booking.date) return false
    const today = new Date()
    const resDate = new Date(booking.date + 'T00:00:00')
    const nextDay = new Date(resDate)
    nextDay.setDate(nextDay.getDate() + 1)
    const sameDay = today.getFullYear() === resDate.getFullYear() &&
      today.getMonth() === resDate.getMonth() && today.getDate() === resDate.getDate()
    const nextDayMatch = today.getFullYear() === nextDay.getFullYear() &&
      today.getMonth() === nextDay.getMonth() && today.getDate() === nextDay.getDate()
    return sameDay || nextDayMatch
  })()
  const canFinish = (isPoseCalendar || isSavCalendar || isMetreCalendar) && !isAlreadyFinished &&
    (isPoseCalendar ? isSameDayOrNextDay : isSameDayAsReservation)
  const showFinishDisabled = !isAlreadyFinished && (
    (isSavOrMetre && !isSameDayAsReservation) || (isPoseCalendar && !isSameDayOrNextDay)
  )

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr + 'T00:00:00')
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className={`technicien-modal-overlay ${isDarkMode ? 'dark-mode' : 'light-mode'}`} onClick={onClose}>
      <div className="technicien-modal-wrapper">
      <div className="technicien-modal" onClick={(e) => e.stopPropagation()}>
        <div className="technicien-modal-header">
          <h2>Détails de la réservation</h2>
          <button className="close-button" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="technicien-modal-content">
          <div className="info-badge">
            <span className="info-icon">👁️</span>
            <span>Mode lecture seule</span>
          </div>

          <div className="info-group">
            <div className="info-label">Nom du client</div>
            <div className="info-value">{booking.name}</div>
          </div>

          <div className="info-group">
            <div className="info-label">Numéro de téléphone</div>
            <div className="info-value">{booking.phone || 'Non renseigné'}</div>
          </div>

          <div className="info-group">
            <div className="info-label">Concepteur</div>
            <div className="info-value">{booking.designer || 'Non renseigné'}</div>
          </div>

          <div className="info-group">
            <div className="info-label">Date</div>
            <div className="info-value">{formatDate(booking.date)}</div>
          </div>

          {booking.time && booking.time !== '21h00' && (
            <div className="info-group">
              <div className="info-label">Créneau horaire</div>
              <div className="info-value">{booking.time}</div>
            </div>
          )}

          {booking.message && (
            <div className="info-group">
              <div className="info-label">Message / Commentaire</div>
              <div className="info-value message">{booking.message}</div>
            </div>
          )}

          {booking.calendar_id === 'calendar2' && (
            <div className="info-group">
              <div className="info-label">Pose effectuée par Wood agency</div>
              <div className="info-value">
                {booking.pose_effectue_par_wood_agency === null || booking.pose_effectue_par_wood_agency === undefined 
                  ? '-' 
                  : booking.pose_effectue_par_wood_agency ? 'Oui' : 'Non'}
              </div>
            </div>
          )}

          {isAlreadyFinished && (
            <div className="info-group">
              <div className="info-label">Statut</div>
              <div className="info-value" style={{ 
                color: '#10b981', 
                fontWeight: 600,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                padding: '8px 12px',
                borderRadius: '6px',
                display: 'inline-block'
              }}>
                ✓ Terminé
              </div>
            </div>
          )}
        </div>

        <div className="technicien-modal-footer">
          {canFinish && (
            <button 
              className="finish-action-button" 
              onClick={() => setIsCompleteModalOpen(true)}
            >
              Terminer
            </button>
          )}
          {showFinishDisabled && (
            <button
              className="finish-action-button"
              disabled
              title={isPoseCalendar
                ? 'Vous ne pouvez terminer que le jour de la réservation ou le lendemain (J ou J+1)'
                : 'Vous ne pouvez terminer que le jour même de la réservation'}
            >
              Terminer
            </button>
          )}
          <button className="close-action-button" onClick={onClose}>
          Fermer
        </button>
        </div>
      </div>
      </div>

      <TechnicienCompleteModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        bookingId={booking.id}
        bookingCalendarId={booking.calendar_id}
        bookingDate={booking.date}
        bookingStatus={(booking as any).status || 'en_attente'}
        isDarkMode={isDarkMode}
        onFinish={async (payload) => {
          if (onFinish) {
            await onFinish(payload)
          }
          setIsCompleteModalOpen(false)
          onClose() // Close the parent modal after finishing
        }}
      />
    </div>
  )
}

export default TechnicienViewModal

