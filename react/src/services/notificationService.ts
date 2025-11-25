import { getAllBookings, CALENDAR_CONFIGS, getCalendarName } from './bookingService'
import { getAllHolidays } from './bookingService'

export interface NotificationItem {
  id: string
  type: 'booking' | 'user' | 'holiday'
  title: string
  message: string
  timestamp: number
  data?: any
}

// Get all notifications from different sources
export const getAllNotifications = async (): Promise<NotificationItem[]> => {
  const notifications: NotificationItem[] = []
  const now = Date.now()
  const oneDayAgo = now - (24 * 60 * 60 * 1000)
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)

  try {
    // Get recent bookings (last 24 hours)
    const allCalendars = Object.values(CALENDAR_CONFIGS)
    const allBookingsPromises = allCalendars.map(calendarId => 
      getAllBookings(calendarId).then(bookings => ({ calendarId, bookings }))
    )
    const bookingResults = await Promise.all(allBookingsPromises)
    
    bookingResults.forEach(({ calendarId, bookings }) => {
      bookings.forEach(booking => {
        if (booking.timestamp > oneDayAgo) {
          const calendarName = getCalendarName(calendarId)
          notifications.push({
            id: `booking-${booking.id}`,
            type: 'booking',
            title: 'Nouvelle réservation',
            message: `${booking.name} - ${calendarName}`,
            timestamp: booking.timestamp,
            data: { ...booking, calendarId }
          })
        }
      })
    })
  } catch (error) {
    console.error('Error loading booking notifications:', error)
  }

  try {
    // Get recent holidays (last 7 days)
    const allCalendars = Object.values(CALENDAR_CONFIGS)
    const allHolidaysPromises = allCalendars.map(calendarId => 
      getAllHolidays(calendarId).then(holidays => ({ calendarId, holidays }))
    )
    const holidayResults = await Promise.all(allHolidaysPromises)
    
    holidayResults.forEach(({ calendarId, holidays }) => {
      holidays.forEach(holiday => {
        const createdAt = new Date(holiday.created_at).getTime()
        if (createdAt > sevenDaysAgo) {
          const calendarName = getCalendarName(calendarId)
          notifications.push({
            id: `holiday-${holiday.id}`,
            type: 'holiday',
            title: 'Nouveau jour férié',
            message: `${calendarName} - ${holiday.holiday_date}`,
            timestamp: createdAt,
            data: { ...holiday, calendarId }
          })
        }
      })
    })
  } catch (error) {
    console.error('Error loading holiday notifications:', error)
  }

  // Sort by timestamp (newest first)
  notifications.sort((a, b) => b.timestamp - a.timestamp)

  return notifications
}

// Get recent users (this would need to be fetched from an API)
// For now, we'll handle this in the component since it uses fake data
export const getRecentUsersNotifications = (users: Array<{ id: number; name: string; email: string; role: string; createdAt: string }>): NotificationItem[] => {
  const now = Date.now()
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
  const notifications: NotificationItem[] = []

  users.forEach(user => {
    const createdAt = new Date(user.createdAt).getTime()
    if (createdAt > sevenDaysAgo) {
      notifications.push({
        id: `user-${user.id}`,
        type: 'user',
        title: 'Nouvel utilisateur',
        message: `${user.name} (${user.role})`,
        timestamp: createdAt,
        data: user
      })
    }
  })

  return notifications.sort((a, b) => b.timestamp - a.timestamp)
}

// Helper function to format time ago
export const getTimeAgo = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours} h`
  if (days < 7) return `Il y a ${days} j`
  return new Date(timestamp).toLocaleDateString('fr-FR')
}

