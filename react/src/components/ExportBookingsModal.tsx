import React, { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { BookingRecord, getCalendarName } from '../services/bookingService'
import './ExportBookingsModal.css'

export type ExportFieldKey =
  | 'id'
  | 'date'
  | 'time'
  | 'calendar'
  | 'client'
  | 'phone'
  | 'designer'
  | 'message'
  | 'pose_wood'
  | 'livraison'
  | 'raison'
  | 'facture'
  | 'statut'
  | 'created_at'

export interface ExportFieldDef {
  key: ExportFieldKey
  label: string
  defaultSelected?: boolean
}

export const EXPORT_FIELDS: ExportFieldDef[] = [
  { key: 'date', label: 'Date', defaultSelected: true },
  { key: 'time', label: 'Créneau / Heure', defaultSelected: true },
  { key: 'calendar', label: 'Calendrier', defaultSelected: true },
  { key: 'client', label: 'Client', defaultSelected: true },
  { key: 'phone', label: 'Téléphone', defaultSelected: true },
  { key: 'designer', label: 'Concepteur', defaultSelected: true },
  { key: 'message', label: 'Message / Commentaire', defaultSelected: true },
  { key: 'pose_wood', label: 'Pose Wood Agency', defaultSelected: true },
  { key: 'livraison', label: 'Livraison', defaultSelected: false },
  { key: 'raison', label: 'Raison (SAV)', defaultSelected: false },
  { key: 'facture', label: 'Facturé', defaultSelected: true },
  { key: 'statut', label: 'Statut', defaultSelected: true },
  { key: 'created_at', label: 'Créé le', defaultSelected: true },
  { key: 'id', label: 'ID réservation', defaultSelected: false },
]

interface ExportBookingsModalProps {
  isOpen: boolean
  onClose: () => void
  bookings: BookingRecord[]
  isDarkMode?: boolean
}

const formatDateShort = (dateString: string): string => {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-')
  if (!year || !month || !day) return dateString
  return `${day}/${month}/${year}`
}

const formatDateTime = (timestamp: number): string => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatPoseWood = (booking: BookingRecord): string => {
  const cal = (booking as any).calendarId || booking.calendar_id
  if (cal !== 'calendar2' && cal !== '2') return '-'
  if (booking.pose_effectue_par_wood_agency === null || booking.pose_effectue_par_wood_agency === undefined) {
    return '-'
  }
  return booking.pose_effectue_par_wood_agency ? 'Oui' : 'Non'
}

const formatFacture = (booking: BookingRecord): string => {
  const cal = (booking as any).calendarId || booking.calendar_id
  if (cal !== 'calendar1' && cal !== '1') return '-'
  return (booking.statut_facturation || 'en_attente') === 'facture' ? 'Facturé' : 'En attente'
}

const formatStatut = (booking: BookingRecord): string => {
  return booking.status === 'termine' ? 'Terminé' : 'En attente'
}

const getFieldValue = (booking: BookingRecord, key: ExportFieldKey): string | number => {
  const calendarId = (booking as any).calendarId || booking.calendar_id
  switch (key) {
    case 'id':
      return booking.id
    case 'date':
      return formatDateShort(booking.date)
    case 'time':
      return booking.time && booking.time !== '21h00' ? booking.time : '-'
    case 'calendar':
      return getCalendarName(calendarId)
    case 'client':
      return booking.name || ''
    case 'phone':
      return booking.phone || ''
    case 'designer':
      return booking.designer || ''
    case 'message':
      return booking.message || ''
    case 'pose_wood':
      return formatPoseWood(booking)
    case 'livraison':
      return booking.livraison || '-'
    case 'raison':
      return booking.raison || '-'
    case 'facture':
      return formatFacture(booking)
    case 'statut':
      return formatStatut(booking)
    case 'created_at':
      return formatDateTime(booking.timestamp)
    default: {
      const _exhaustive: never = key
      return _exhaustive
    }
  }
}

const ExportBookingsModal: React.FC<ExportBookingsModalProps> = ({
  isOpen,
  onClose,
  bookings,
  isDarkMode = true,
}) => {
  const [selected, setSelected] = useState<Record<ExportFieldKey, boolean>>(() => {
    const initial = {} as Record<ExportFieldKey, boolean>
    EXPORT_FIELDS.forEach((field) => {
      initial[field.key] = field.defaultSelected !== false
    })
    return initial
  })

  useEffect(() => {
    if (!isOpen) return
    const initial = {} as Record<ExportFieldKey, boolean>
    EXPORT_FIELDS.forEach((field) => {
      initial[field.key] = field.defaultSelected !== false
    })
    setSelected(initial)
  }, [isOpen])

  if (!isOpen) return null

  const selectedFields = EXPORT_FIELDS.filter((field) => selected[field.key])
  const canExport = selectedFields.length > 0 && bookings.length > 0

  const toggleField = (key: ExportFieldKey) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const selectAll = () => {
    const next = {} as Record<ExportFieldKey, boolean>
    EXPORT_FIELDS.forEach((field) => {
      next[field.key] = true
    })
    setSelected(next)
  }

  const selectNone = () => {
    const next = {} as Record<ExportFieldKey, boolean>
    EXPORT_FIELDS.forEach((field) => {
      next[field.key] = false
    })
    setSelected(next)
  }

  const handleExport = () => {
    if (!canExport) return

    const rows = bookings.map((booking) => {
      const row: Record<string, string | number> = {}
      selectedFields.forEach((field) => {
        row[field.label] = getFieldValue(booking, field.key)
      })
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Réservations')

    const colWidths = selectedFields.map((field) => {
      const headerLen = field.label.length
      const maxCell = rows.reduce((max, row) => {
        const value = String(row[field.label] ?? '')
        return Math.max(max, value.length)
      }, 0)
      return { wch: Math.min(Math.max(headerLen, maxCell) + 2, 40) }
    })
    worksheet['!cols'] = colWidths

    const today = new Date()
    const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    XLSX.writeFile(workbook, `reservations_${stamp}.xlsx`)
    onClose()
  }

  return (
    <div
      className={`export-bookings-modal-overlay ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
      onClick={onClose}
    >
      <div className="export-bookings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-bookings-modal-header">
          <h2>Extraction Excel</h2>
          <button type="button" className="close-button" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="export-bookings-modal-content">
          <p className="export-summary">
            {bookings.length} réservation(s) filtrée(s) seront exportées.
            Sélectionnez les champs à inclure :
          </p>

          <div className="export-field-actions">
            <button type="button" className="link-button" onClick={selectAll}>
              Tout sélectionner
            </button>
            <button type="button" className="link-button" onClick={selectNone}>
              Tout désélectionner
            </button>
          </div>

          <div className="export-fields-grid">
            {EXPORT_FIELDS.map((field) => (
              <label key={field.key} className="export-field-item">
                <input
                  type="checkbox"
                  checked={!!selected[field.key]}
                  onChange={() => toggleField(field.key)}
                />
                <span>{field.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="export-bookings-modal-footer">
          <button type="button" className="cancel-button" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="export-confirm-button"
            disabled={!canExport}
            onClick={handleExport}
            title={
              bookings.length === 0
                ? 'Aucune réservation à exporter avec les filtres actuels'
                : selectedFields.length === 0
                  ? 'Sélectionnez au moins un champ'
                  : ''
            }
          >
            Exporter ({bookings.length})
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportBookingsModal
