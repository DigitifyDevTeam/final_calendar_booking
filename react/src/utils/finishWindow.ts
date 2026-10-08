const FINISH_WINDOW_MS = 48 * 60 * 60 * 1000

/**
 * Parse appointment start from booking date + time.
 * Pose placeholder "21h00" is treated as start of day.
 */
export function getAppointmentStart(bookingDate?: string, bookingTime?: string): Date | null {
  if (!bookingDate) return null

  let hour = 0
  let minute = 0
  const raw = (bookingTime || '').trim().toLowerCase()
  if (raw && raw !== '21h00') {
    const startPart = raw.split('-')[0].trim()
    const match = startPart.match(/^(\d{1,2})[h:](\d{2})?$/)
    if (match) {
      const parsedHour = Number(match[1])
      const parsedMinute = Number(match[2] || 0)
      if (parsedHour >= 0 && parsedHour <= 23 && parsedMinute >= 0 && parsedMinute <= 59) {
        hour = parsedHour
        minute = parsedMinute
      }
    }
  }

  const start = new Date(bookingDate + 'T00:00:00')
  if (Number.isNaN(start.getTime())) return null
  start.setHours(hour, minute, 0, 0)
  return start
}

/**
 * Technicien may finalize from the appointment day until 48h after appointment start.
 */
export function canTechnicianFinishByDate(bookingDate?: string, bookingTime?: string): boolean {
  const start = getAppointmentStart(bookingDate, bookingTime)
  if (!start) return false

  const dayStart = new Date(bookingDate + 'T00:00:00')
  const deadline = new Date(start.getTime() + FINISH_WINDOW_MS)
  const now = new Date()
  return now >= dayStart && now <= deadline
}

/** Calendar days a technicien may still open for possible finalization (today and last 2 days). */
export function isWithinTechnicianFinishCalendarWindow(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const earliest = new Date(today)
  earliest.setDate(earliest.getDate() - 2)
  const check = new Date(date)
  check.setHours(0, 0, 0, 0)
  return check.getTime() >= earliest.getTime() && check.getTime() <= today.getTime()
}
