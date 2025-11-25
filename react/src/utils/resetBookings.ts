// Utility function to reset all bookings
// You can call this from the browser console:
// import { resetAllCalendars } from './services/bookingService'; resetAllCalendars();
// Or open the console and type: window.resetAllBookings()

import { resetAllCalendars } from '../services/bookingService';

// Make it available globally for easy console access
declare global {
  interface Window {
    resetAllBookings?: () => Promise<void>
  }
}

if (typeof window !== 'undefined') {
  window.resetAllBookings = async () => {
    const confirmed = confirm('⚠️ Are you sure you want to reset ALL bookings to 0? This cannot be undone!')
    if (confirmed) {
      console.log('🔄 Starting reset...')
      await resetAllCalendars()
      alert('✅ All bookings have been reset! Please refresh the page.')
      window.location.reload()
    }
  }
}

export { resetAllCalendars }

