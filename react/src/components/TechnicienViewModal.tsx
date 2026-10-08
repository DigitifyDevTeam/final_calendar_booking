import React, { useState, useEffect } from 'react'
import './TechnicienViewModal.css'
import { BookingRecord } from '../services/bookingService'
import TechnicienCompleteModal from './TechnicienCompleteModal'
import { canTechnicianFinishByDate } from '../utils/finishWindow'

interface TechnicienViewModalProps {
  isOpen: boolean
  onClose: () => void
  booking: BookingRecord | null
  isDarkMode?: boolean
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

const TechnicienViewModal: React.FC<TechnicienViewModalProps> = ({
  isOpen,
  onClose,
  booking,
  isDarkMode = true,
  onFinish,
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
  const isAlreadyCancelled = (booking as any).status === 'annule'

  // Pose / SAV / Métré: finalize until 48h after the scheduled appointment
  const withinFinishWindow = canTechnicianFinishByDate(booking.date, booking.time)
  const canFinish = (isPoseCalendar || isSavCalendar || isMetreCalendar) &&
    !isAlreadyFinished &&
    !isAlreadyCancelled &&
    withinFinishWindow
  const showFinishDisabled = (isPoseCalendar || isSavCalendar || isMetreCalendar) &&
    !isAlreadyFinished &&
    !isAlreadyCancelled &&
    !withinFinishWindow

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
    <div className={`technicien-modal-overlay ${isDarkMode ? 'dark-mode' : 'light-mode'}`} onClick={isCompleteModalOpen ? undefined : onClose}>
      {!isCompleteModalOpen && (
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

              {isSavCalendar && (
                <>
                  <div className="info-group">
                    <div className="info-label">Livraison</div>
                    <div className="info-value">
                      {(booking as any).livraison === 'livre_chez_client'
                        ? 'Livré chez le client'
                        : (booking as any).livraison === 'venir_chercher_magasin'
                          ? 'Venir chercher au magasin'
                          : (booking as any).livraison || '-'}
                    </div>
                  </div>
                  <div className="info-group">
                    <div className="info-label">Raison</div>
                    <div className="info-value">
                      {(booking as any).raison === 'erreur_poseur'
                        ? 'Erreur Poseur'
                        : (booking as any).raison === 'erreur_concepteur'
                          ? 'Erreur concepteur'
                          : (booking as any).raison === 'erreur_livraison'
                            ? 'Erreur livraison'
                            : (booking as any).raison === 'manquant'
                              ? 'Manquant'
                              : (booking as any).raison || '-'}
                    </div>
                  </div>
                  <div className="info-group">
                    <div className="info-label">Pose effectuée par Wood agency</div>
                    <div className="info-value">
                      {booking.pose_effectue_par_wood_agency === null || booking.pose_effectue_par_wood_agency === undefined 
                        ? '-' 
                        : booking.pose_effectue_par_wood_agency ? 'Oui' : 'Non'}
                    </div>
                  </div>
                </>
              )}

              <div className="info-group">
                <div className="info-label">Statut</div>
                <div
                  className="info-value"
                  style={{
                    color: isAlreadyCancelled ? '#ef4444' : isAlreadyFinished ? '#10b981' : '#284B73',
                    fontWeight: 700,
                    backgroundColor: isAlreadyCancelled
                      ? 'rgba(239, 68, 68, 0.12)'
                      : isAlreadyFinished
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(40, 75, 115, 0.1)',
                    border: `1px solid ${
                      isAlreadyCancelled
                        ? 'rgba(239, 68, 68, 0.45)'
                        : isAlreadyFinished
                          ? 'rgba(16, 185, 129, 0.35)'
                          : 'rgba(40, 75, 115, 0.3)'
                    }`,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    display: 'inline-block',
                  }}
                >
                  {isAlreadyCancelled ? '✕ Annulé' : isAlreadyFinished ? '✓ Terminé' : 'En attente'}
                </div>
              </div>
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
                  title="La finalisation n'est possible que jusqu'à 48 heures après le rendez-vous"
                >
                  Terminer
                </button>
              )}
              {isAlreadyCancelled && (
                <button
                  className="finish-action-button"
                  disabled
                  style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                    borderColor: '#dc2626',
                    color: '#fff',
                    opacity: 0.95,
                    cursor: 'not-allowed',
                    fontWeight: 700,
                  }}
                >
                  ✕ Annulé
                </button>
              )}
              <button className="close-action-button" onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <TechnicienCompleteModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        bookingId={booking.id}
        bookingCalendarId={booking.calendar_id}
        bookingDate={booking.date}
        bookingTime={booking.time}
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

