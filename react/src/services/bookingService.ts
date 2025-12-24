const DEFAULT_CALENDAR_ID = 'calendar1'

// Calendar identifiers (used to align with backend IDs)
export const CALENDAR_CONFIGS: { [key: string]: string } = {
  calendar1: 'calendar1',
  calendar2: 'calendar2',
  calendar3: 'calendar3',
}

const DEFAULT_STORAGE_ID = CALENDAR_CONFIGS[DEFAULT_CALENDAR_ID] || DEFAULT_CALENDAR_ID

// Use relative URL so it works with Vite proxy when frontend is shared on network
// The proxy will forward /api requests to localhost:8000 on the server machine
const API_BASE_URL =
  ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  '/api'

const resolveBinId = (binId?: string): string => {
  return binId || DEFAULT_STORAGE_ID
}

interface BookingApiResponse {
  id: number
  calendar_id: string
  booking_date: string
  booking_time: string
  client_name: string
  client_phone: string
  designer_name: string
  message: string
  created_at: string
}

const toBookingRecord = (apiBooking: BookingApiResponse): BookingRecord => ({
  id: String(apiBooking.id),
  date: apiBooking.booking_date,
  name: apiBooking.client_name,
  phone: apiBooking.client_phone,
  designer: apiBooking.designer_name,
  message: apiBooking.message,
  time: apiBooking.booking_time || '21h00',
  timestamp: new Date(apiBooking.created_at).getTime(),
})

// Helper function to refresh the access token
const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = sessionStorage.getItem('refresh_token')
  if (!refreshToken) {
    return null
  }

  try {
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.access) {
        sessionStorage.setItem('access_token', data.access)
        return data.access
      }
    }
  } catch (error) {
    console.error('Error refreshing token:', error)
  }

  return null
}

const apiRequest = async <T>(path: string, options?: RequestInit): Promise<T> => {
  // Get access token from sessionStorage
  let accessToken = sessionStorage.getItem('access_token')
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  }
  
  // Add Authorization header if token exists
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  
  let response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  })

  // If token expired (401), try to refresh it and retry once
  if (response.status === 401 && accessToken) {
    const newAccessToken = await refreshAccessToken()
    if (newAccessToken) {
      // Update headers with new token
      headers['Authorization'] = `Bearer ${newAccessToken}`
      // Retry the request with new token
      response = await fetch(`${API_BASE_URL}${path}`, {
        headers,
        ...options,
      })
    }
  }

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`
    
    // Clone the response so we can read it multiple times if needed
    const responseClone = response.clone()
    
    try {
      const errorData = await response.json()
      // Handle Django REST Framework error format
      if (errorData.detail) {
        errorMessage = errorData.detail
      } else if (errorData.non_field_errors && errorData.non_field_errors.length > 0) {
        errorMessage = errorData.non_field_errors[0]
      } else if (typeof errorData === 'object') {
        // Extract first error message from validation errors
        const firstKey = Object.keys(errorData)[0]
        if (firstKey && Array.isArray(errorData[firstKey]) && errorData[firstKey].length > 0) {
          errorMessage = errorData[firstKey][0]
        } else if (firstKey && typeof errorData[firstKey] === 'string') {
          errorMessage = errorData[firstKey]
        }
      }
    } catch {
      // If JSON parsing fails, try text from the cloned response
      try {
        const errorText = await responseClone.text()
        if (errorText) {
          errorMessage = errorText
        }
      } catch {
        // If both fail, use default error message
      }
    }
    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

// Calendar name mappings
export const CALENDAR_NAMES: { [key: string]: string } = {
  'calendar1': 'Pose',
  'calendar2': 'Metré',
  'calendar3': 'SAV',
};

// Get bin ID for a calendar (defaults to calendar1 if not found)
export const getBinId = (calendarId: string = 'calendar1'): string => {
  return CALENDAR_CONFIGS[calendarId] || CALENDAR_CONFIGS[DEFAULT_CALENDAR_ID] || DEFAULT_STORAGE_ID;
};

// Get calendar name from bin ID
export const getCalendarName = (binId?: string): string => {
  if (!binId) return 'Pose'; // Default to Pose
  
  // Find which calendar this binId belongs to
  for (const [calendarId, configBinId] of Object.entries(CALENDAR_CONFIGS)) {
    if (configBinId === binId) {
      return CALENDAR_NAMES[calendarId] || 'Pose';
    }
  }
  
  // If binId doesn't match any config, check if it's the default
  if (binId === DEFAULT_STORAGE_ID) {
    return 'Pose';
  }
  
  return 'Pose'; // Default fallback
};

export interface BookingRecord {
  id: string;
  date: string; // YYYY-MM-DD format
  name: string;
  phone: string;
  designer: string;
  message: string;
  time: string;
  timestamp: number;
}

export interface BookingData {
  name: string;
  phone: string;
  designer: string;
  duree?: string;
  message: string;
  date: string;
  selectedDate: Date;
  timeSlot?: string;
}

// Request cache to prevent duplicate API calls (especially from React StrictMode)
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds cache to reduce API load

// Clear cache after mutations (create/update/delete)
export const clearBookingsCache = (calendarId?: string) => {
  const keysToDelete: string[] = []
  requestCache.forEach((_, key) => {
    if (key.startsWith('bookings_')) {
      if (!calendarId || key.includes(calendarId)) {
        keysToDelete.push(key)
      }
    }
  })
  keysToDelete.forEach(key => requestCache.delete(key))
  console.log(`[Cache] Cleared ${keysToDelete.length} bookings cache entries`)
}

export const clearHolidaysCache = (calendarId?: string) => {
  const keysToDelete: string[] = []
  requestCache.forEach((_, key) => {
    if (key.startsWith('holidays_')) {
      if (!calendarId || key.includes(calendarId)) {
        keysToDelete.push(key)
      }
    }
  })
  keysToDelete.forEach(key => requestCache.delete(key))
  console.log(`[Cache] Cleared ${keysToDelete.length} holidays cache entries`)
}

// Get all bookings scoped per calendar (optionally filtered by date range)
export const getAllBookings = async (
  binId?: string,
  options?: { startDate?: string; endDate?: string }
): Promise<BookingRecord[]> => {
  const targetBinId = resolveBinId(binId)
  
  const params = new URLSearchParams({ calendar_id: targetBinId })
  if (options?.startDate) params.append('start_date', options.startDate)
  if (options?.endDate) params.append('end_date', options.endDate)

  const cacheKey = `bookings_${targetBinId}_${params.toString()}`
  const cached = requestCache.get(cacheKey)
  
  // Return cached promise if it's still valid (within cache duration)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[getAllBookings] Using cached request for calendar_id: ${targetBinId}`)
    return cached.promise
  }

  console.log(`[getAllBookings] Querying bookings for calendar_id: ${targetBinId}`)
  
  const requestPromise = (async () => {
    try {
      const data = await apiRequest<BookingApiResponse[]>(`/bookings/?${params.toString()}`)
      console.log(`[getAllBookings] Received ${data.length} bookings from API for calendar_id: ${targetBinId}`)
      const bookings = data.map(toBookingRecord)
      return bookings
    } catch (error) {
      console.warn(`[getAllBookings] Failed to fetch bookings for calendar_id: ${targetBinId}`, error)
      // If the new format fails, try legacy format as fallback (only for backward compatibility)
      if (targetBinId === 'calendar1' || targetBinId === 'calendar2' || targetBinId === 'calendar3') {
        const legacyId = targetBinId === 'calendar1' ? '1' : targetBinId === 'calendar2' ? '2' : '3'
        console.log(`[getAllBookings] Trying legacy format: ${legacyId}`)
        try {
          const legacyParams = new URLSearchParams({ calendar_id: legacyId })
          if (options?.startDate) legacyParams.append('start_date', options.startDate)
          if (options?.endDate) legacyParams.append('end_date', options.endDate)
          const data = await apiRequest<BookingApiResponse[]>(`/bookings/?${legacyParams.toString()}`)
          console.log(`[getAllBookings] Received ${data.length} bookings from API using legacy format`)
          return data.map(toBookingRecord)
        } catch (legacyError) {
          console.warn(`[getAllBookings] Legacy format also failed:`, legacyError)
        }
      }
      return []
    } finally {
      // Remove from cache after a delay to allow for legitimate refreshes
      setTimeout(() => {
        requestCache.delete(cacheKey)
      }, CACHE_DURATION)
    }
  })()

  // Cache the promise
  requestCache.set(cacheKey, { promise: requestPromise, timestamp: Date.now() })
  
  return requestPromise
}

// Get max bookings per day for a calendar (default: 3, calendar1: 2)
const MAX_BOOKINGS_PER_DAY_BY_BIN: { [key: string]: number } = {
  [CALENDAR_CONFIGS['calendar1']]: 2, // Pose calendar (per-day bookings)
  [CALENDAR_CONFIGS['calendar2']]: 8, // Metré calendar (per-day capacity for rates)
  [CALENDAR_CONFIGS['calendar3']]: 3, // SAV calendar (per-day capacity for rates)
};

export const getMaxBookingsPerDay = (binId?: string): number => {
  if (!binId) return 3;
  return MAX_BOOKINGS_PER_DAY_BY_BIN[binId] ?? 3;
};

// Check if a calendar uses time slots (calendar2 and calendar3)
export const usesTimeSlots = (binId?: string): boolean => {
  if (!binId) return false;
  return binId === CALENDAR_CONFIGS['calendar2'] || binId === CALENDAR_CONFIGS['calendar3'];
};

// Check if a date has reached the booking limit
export const isDateFullyBooked = async (date: string, binId?: string, maxBookings?: number): Promise<boolean> => {
  try {
    // Get today's date for comparison (exclude past dates)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date + 'T00:00:00')
    checkDate.setHours(0, 0, 0, 0)
    
    // Don't check past dates
    if (checkDate < today) {
      return false
    }
    
    const allBookings = await getAllBookings(binId);
    // Only count bookings for future dates
    const dateBookings = allBookings.filter(booking => {
      const bookingDate = new Date(booking.date + 'T00:00:00')
      bookingDate.setHours(0, 0, 0, 0)
      return booking.date === date && bookingDate >= today
    });
    const limit = maxBookings ?? getMaxBookingsPerDay(binId);
    
    return dateBookings.length >= limit;
  } catch (error) {
    console.error('Error checking booking limit:', error);
    return false; // Allow booking if we can't check
  }
};

// Add a new booking
export const addBooking = async (bookingData: BookingData, binId?: string, maxBookings?: number): Promise<boolean> => {
  const targetBinId = resolveBinId(binId)
  try {
    // Check if the date is a holiday/invalid day
    const isHolidayDate = await isHoliday(bookingData.date, targetBinId)
    if (isHolidayDate) {
      throw new Error('Cette date est un jour férié ou un jour non disponible. Les réservations ne sont pas autorisées pour cette date.')
    }
    
    // Get existing bookings first
    const existingBookings = await getAllBookings(targetBinId)

    // For calendar2 and calendar3, check if the specific time slot is already booked
    if (usesTimeSlots(targetBinId) && bookingData.timeSlot) {
      // Get today's date for comparison (exclude past dates)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const bookingDate = new Date(bookingData.date + 'T00:00:00')
      bookingDate.setHours(0, 0, 0, 0)
      
      // Only check future dates (exclude past dates)
      if (bookingDate >= today) {
        // Normalize time strings for comparison (trim whitespace, handle case)
        const normalizeTime = (time: string) => time.trim().toLowerCase()
        const normalizedTimeSlot = normalizeTime(bookingData.timeSlot)
        
        const isSlotBooked = existingBookings.some(
          booking => {
            // Only check bookings for future dates
            const existingBookingDate = new Date(booking.date + 'T00:00:00')
            existingBookingDate.setHours(0, 0, 0, 0)
            
            if (existingBookingDate < today) {
              return false // Skip past dates
            }
            
            const normalizedBookingTime = normalizeTime(booking.time || '')
            return booking.date === bookingData.date && normalizedBookingTime === normalizedTimeSlot
          }
        )
        if (isSlotBooked) {
          throw new Error(`Ce créneau (${bookingData.timeSlot}) est déjà réservé pour cette date. Veuillez choisir un autre créneau.`)
        }
      }
    }

    // Check if date is fully booked (only for calendar1, which doesn't use time slots)
    if (!usesTimeSlots(targetBinId)) {
      const limit = maxBookings ?? getMaxBookingsPerDay(targetBinId)
      const isFullyBooked = await isDateFullyBooked(bookingData.date, targetBinId, limit)
      if (isFullyBooked) {
        throw new Error(`This date is fully booked. Maximum ${limit} bookings per day.`)
      }
    }

    // For time-slot calendars (SAV and Metré), timeSlot is required
    // For Pose calendar, timeSlot is optional (defaults to '21h00')
    let bookingTime = bookingData.timeSlot || '21h00'
    
    // If it's a time-slot calendar and no timeSlot provided, this shouldn't happen
    // but we'll use empty string instead of default to trigger backend validation
    if (usesTimeSlots(targetBinId) && !bookingData.timeSlot) {
      console.warn('[addBooking] Time slot calendar but no timeSlot provided!')
      bookingTime = '' // Let backend validation catch this
    }
    
    const bookingPayload = {
      calendar_id: targetBinId,
      booking_date: bookingData.date,
      booking_time: bookingTime,
      client_name: bookingData.name,
      client_phone: bookingData.phone,
      designer_name: bookingData.designer,
      message: bookingData.message,
    }
    
    console.log('[addBooking] Sending booking to API:', bookingPayload)
    console.log('[addBooking] Time slot from bookingData:', bookingData.timeSlot)
    console.log('[addBooking] Calendar uses time slots:', usesTimeSlots(targetBinId))
    
    await apiRequest<BookingApiResponse>('/bookings/', {
      method: 'POST',
      body: JSON.stringify(bookingPayload),
    })

    // Clear cache after successful booking creation
    clearBookingsCache(targetBinId)
    
    return true
  } catch (error) {
    console.error('Error adding booking:', error)
    throw error
  }
}

// Get bookings count for a specific date
export const getBookingsCountForDate = async (date: string, binId?: string): Promise<number> => {
  try {
    const allBookings = await getAllBookings(binId);
    const dateBookings = allBookings.filter(booking => booking.date === date);
    return dateBookings.length;
  } catch (error) {
    console.error('Error getting bookings count:', error);
    return 0;
  }
};

// Check if a specific time slot is booked for a date
export const isTimeSlotBooked = async (date: string, timeSlot: string, binId?: string): Promise<boolean> => {
  try {
    const allBookings = await getAllBookings(binId);
    const slotBookings = allBookings.filter(
      booking => booking.date === date && booking.time === timeSlot
    );
    return slotBookings.length > 0;
  } catch (error) {
    console.error('Error checking time slot booking:', error);
    return false; // Allow booking if we can't check
  }
};

// Reset all bookings for a specific bin (or all bins)
export const resetAllBookings = async (binId?: string): Promise<boolean> => {
  const targetBinId = resolveBinId(binId)

  try {
    await apiRequest(`/bookings/reset/?calendar_id=${targetBinId}`, {
      method: 'DELETE',
    })
    console.log(`Cleared backend bookings for calendar: ${targetBinId}`)

    return true
  } catch (error) {
    console.error('Error resetting bookings:', error)
    return false
  }
}

// Reset all bookings for ALL calendars
export const resetAllCalendars = async (): Promise<void> => {
  console.log('🔄 Resetting all calendars...');
  
  const allBinIds = Object.values(CALENDAR_CONFIGS);
  const uniqueBinIds = [...new Set(allBinIds)]; // Remove duplicates
  
  for (const binId of uniqueBinIds) {
    await resetAllBookings(binId);
  }
  
  console.log('✅ All calendars have been reset to 0 bookings');
};

// Update an existing booking
export const updateBooking = async (bookingId: string, bookingData: {
  calendar_id?: string;
  booking_date?: string;
  booking_time?: string;
  client_name?: string;
  client_phone?: string;
  designer_name?: string;
  message?: string;
}): Promise<BookingRecord> => {
  try {
    console.log('[updateBooking] Updating booking:', bookingId, bookingData)
    
    const response = await apiRequest<BookingApiResponse>(`/bookings/${bookingId}/`, {
      method: 'PUT',
      body: JSON.stringify(bookingData),
    })

    // Clear cache after successful update
    clearBookingsCache(bookingData.calendar_id)

    return toBookingRecord(response)
  } catch (error) {
    console.error('Error updating booking:', error)
    throw error
  }
}

// Delete a booking
export const deleteBooking = async (bookingId: string, calendarId?: string): Promise<boolean> => {
  try {
    console.log('[deleteBooking] Deleting booking:', bookingId)
    
    await apiRequest(`/bookings/${bookingId}/`, {
      method: 'DELETE',
    })

    // Clear cache after successful deletion
    clearBookingsCache(calendarId)

    return true
  } catch (error) {
    console.error('Error deleting booking:', error)
    throw error
  }
}

// Holiday/Invalid Day Management
export interface HolidayRecord {
  id: number
  calendar_id: string
  holiday_date: string // YYYY-MM-DD format
  description: string
  created_at: string
}

interface HolidayApiResponse {
  id: number
  calendar_id: string
  holiday_date: string
  description: string
  created_at: string
}

const toHolidayRecord = (apiHoliday: HolidayApiResponse): HolidayRecord => ({
  id: apiHoliday.id,
  calendar_id: apiHoliday.calendar_id,
  holiday_date: apiHoliday.holiday_date,
  description: apiHoliday.description,
  created_at: apiHoliday.created_at,
})

// Get all holidays for a calendar (optionally filtered by date range)
export const getAllHolidays = async (
  binId?: string,
  options?: { startDate?: string; endDate?: string }
): Promise<HolidayRecord[]> => {
  const targetBinId = resolveBinId(binId)
  
  const params = new URLSearchParams({ calendar_id: targetBinId })
  if (options?.startDate) params.append('start_date', options.startDate)
  if (options?.endDate) params.append('end_date', options.endDate)

  const cacheKey = `holidays_${targetBinId}_${params.toString()}`
  const cached = requestCache.get(cacheKey)
  
  // Return cached promise if it's still valid (within cache duration)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[getAllHolidays] Using cached request for calendar_id: ${targetBinId}`)
    return cached.promise
  }

  const requestPromise = (async () => {
    try {
      const data = await apiRequest<HolidayApiResponse[]>(`/holidays/?${params.toString()}`)
      return data.map(toHolidayRecord)
    } catch (error) {
      console.warn(`[getAllHolidays] Failed to fetch holidays for calendar_id: ${targetBinId}`, error)
      // If the new format fails, try legacy format as fallback (only for backward compatibility)
      if (targetBinId === 'calendar1' || targetBinId === 'calendar2' || targetBinId === 'calendar3') {
        const legacyId = targetBinId === 'calendar1' ? '1' : targetBinId === 'calendar2' ? '2' : '3'
        try {
          const legacyParams = new URLSearchParams({ calendar_id: legacyId })
          if (options?.startDate) legacyParams.append('start_date', options.startDate)
          if (options?.endDate) legacyParams.append('end_date', options.endDate)
          const data = await apiRequest<HolidayApiResponse[]>(`/holidays/?${legacyParams.toString()}`)
          return data.map(toHolidayRecord)
        } catch (legacyError) {
          console.warn(`[getAllHolidays] Legacy format also failed:`, legacyError)
        }
      }
      return []
    } finally {
      // Remove from cache after a delay to allow for legitimate refreshes
      setTimeout(() => {
        requestCache.delete(cacheKey)
      }, CACHE_DURATION)
    }
  })()

  // Cache the promise
  requestCache.set(cacheKey, { promise: requestPromise, timestamp: Date.now() })
  
  return requestPromise
}

// Add a new holiday
export const addHoliday = async (
  calendarId: string,
  holidayDate: string,
  description?: string
): Promise<HolidayRecord> => {
  const targetBinId = resolveBinId(calendarId)
  
  try {
    const holidayPayload = {
      calendar_id: targetBinId,
      holiday_date: holidayDate,
      description: description || '',
    }
    
    const response = await apiRequest<HolidayApiResponse>('/holidays/', {
      method: 'POST',
      body: JSON.stringify(holidayPayload),
    })

    // Clear cache after successful holiday creation
    clearHolidaysCache(targetBinId)

    return toHolidayRecord(response)
  } catch (error) {
    console.error('Error adding holiday:', error)
    throw error
  }
}

// Update an existing holiday
export const updateHoliday = async (
  holidayId: number,
  calendarId: string,
  holidayDate: string,
  description?: string
): Promise<HolidayRecord> => {
  const targetBinId = resolveBinId(calendarId)
  
  try {
    const holidayPayload = {
      calendar_id: targetBinId,
      holiday_date: holidayDate,
      description: description || '',
    }
    
    const response = await apiRequest<HolidayApiResponse>(`/holidays/${holidayId}/`, {
      method: 'PUT',
      body: JSON.stringify(holidayPayload),
    })

    return toHolidayRecord(response)
  } catch (error) {
    console.error('Error updating holiday:', error)
    throw error
  }
}

// Delete a holiday
export const deleteHoliday = async (holidayId: number, calendarId?: string): Promise<boolean> => {
  try {
    await apiRequest(`/holidays/${holidayId}/`, {
      method: 'DELETE',
    })

    // Clear cache after successful deletion
    clearHolidaysCache(calendarId)

    return true
  } catch (error) {
    console.error('Error deleting holiday:', error)
    throw error
  }
}

// Check if a date is a holiday for a calendar
export const isHoliday = async (date: string, binId?: string): Promise<boolean> => {
  try {
    const holidays = await getAllHolidays(binId)
    return holidays.some(holiday => holiday.holiday_date === date)
  } catch (error) {
    console.error('Error checking holiday:', error)
    return false
  }
}

