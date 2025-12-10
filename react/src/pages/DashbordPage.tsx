import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import HomePage from './HomePage'
import Calendar3Page from './Calendar3Page'
import Calendar1Page from './Calendar1Page'
import Calendar2Page from './Calendar2Page'
import { getAllBookings, BookingRecord, CALENDAR_NAMES, getCalendarName } from '../services/bookingService'
import { getAllNotifications, NotificationItem, getTimeAgo as getNotificationTimeAgo } from '../services/notificationService'
import { getAllUsers } from '../services/userService'
import {
  Calendar,
  CalendarCheck,
  ChevronsRight,
  Moon,
  Sun,
  Home,
  Settings,
  LogOut,
  TrendingUp,
  Users as UsersIcon,
  Bell,
  ClipboardList,
  ChevronDown,
  Minus,
  Percent,
  Menu,
  X
} from 'lucide-react'
import './DashbordPage.css'

function DashbordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isTechnicien, setIsTechnicien] = useState<boolean>(false)
  const [chartAnimation, setChartAnimation] = useState(false)
  const [recentBookings, setRecentBookings] = useState<BookingRecord[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(true)
  const [topClients, setTopClients] = useState<Array<{ name: string; count: number }>>([])
  const [isLoadingTopClients, setIsLoadingTopClients] = useState(true)
  const [calendarsExpanded, setCalendarsExpanded] = useState<boolean>(true)
  // Real stats data
  const [totalBookings, setTotalBookings] = useState<number>(0)
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [savBookings, setSavBookings] = useState<number>(0)
  const [poseBookings, setPoseBookings] = useState<number>(0)
  const [metreBookings, setMetreBookings] = useState<number>(0)
  const [chartData, setChartData] = useState<Array<{ month: string; Metré: number; Pose: number; SAV: number; day?: number; cumulMetré?: number; cumulPose?: number; cumulSAV?: number }>>([])
  const [topClientsAll, setTopClientsAll] = useState<
    Array<{ name: string; pose: number; sav: number; metre: number; total: number }>
  >([])
  const [allBookingsForChart, setAllBookingsForChart] = useState<BookingRecord[]>([])
  const [bookingRate, setBookingRate] = useState<number>(0)
  const [poseRate, setPoseRate] = useState<number>(0)
  const [metreRate, setMetreRate] = useState<number>(0)
  const [savRate, setSavRate] = useState<number>(0)
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([])
  const [chartViewMode, setChartViewMode] = useState<'month' | 'week'>('month')
  const [monthOffset, setMonthOffset] = useState<number>(0) // 0 = current month, -1 = previous, +1 = next
  const [weekOffset, setWeekOffset] = useState<number>(0) // 0 = current week, -1 = previous, +1 = next
  const [topClientsView, setTopClientsView] = useState<'total' | 'month' | 'week'>('month')

  const computeTopClientsByView = (
    bookings: (BookingRecord & { calendarId?: string })[],
    view: 'total' | 'month' | 'week'
  ) => {
    if (!bookings || bookings.length === 0) return []

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const startOfWeek = new Date(now)
    const day = startOfWeek.getDay()
    const diffToMonday = (day === 0 ? -6 : 1) - day
    startOfWeek.setDate(startOfWeek.getDate() + diffToMonday)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const filtered = bookings.filter((booking: any) => {
      const date = new Date(booking.date + 'T00:00:00')
      if (Number.isNaN(date.getTime())) return false

      if (view === 'total') {
        return true
      }

      if (view === 'month') {
        return date.getFullYear() === currentYear && date.getMonth() === currentMonth
      }

      return date >= startOfWeek && date <= endOfWeek
    })

    const concepteurCounts: {
      [key: string]: { pose: number; sav: number; metre: number; total: number }
    } = {}

    filtered.forEach((booking: any) => {
      const concepteurName = booking.designer || booking.name || 'Inconnu'
      const entry = concepteurCounts[concepteurName] || { pose: 0, sav: 0, metre: 0, total: 0 }
      const calendarId = booking.calendarId
      if (calendarId === 'calendar1') entry.pose += 1
      else if (calendarId === 'calendar2') entry.metre += 1
      else if (calendarId === 'calendar3') entry.sav += 1
      entry.total = entry.pose + entry.sav + entry.metre
      concepteurCounts[concepteurName] = entry
    })

    return Object.entries(concepteurCounts)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }

  const getCurrentWeekRangeLabel = () => {
    const now = new Date()
    const start = new Date(now)
    const day = start.getDay()
    const diffToMonday = (day === 0 ? -6 : 1) - day
    start.setDate(start.getDate() + diffToMonday)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    const format = (d: Date) =>
      d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit'
      })

    return `${format(start)} au ${format(end)}`
  }

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    
    // Check if user is admin or technicien
    const user = sessionStorage.getItem('user')
    if (user) {
      const userData = JSON.parse(user)
      setIsAdmin(userData.role === 'admin')
      setIsTechnicien(userData.role === 'technicien')
    }
  }, [isDarkMode])

  // Trigger animations on mount
  useEffect(() => {
    // Delay to ensure page is loaded
    const timer = setTimeout(() => {
      setTimeout(() => setChartAnimation(true), 300)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  // Handle responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Load bookings data once and use it for both recent bookings and top clients
  useEffect(() => {
    const loadBookingsData = async () => {
      try {
        setIsLoadingBookings(true)
        setIsLoadingTopClients(true)
        
        // Fetch bookings from all calendars in parallel
        const calendarIds = ['calendar1', 'calendar2', 'calendar3']
        const bookingPromises = calendarIds.map(async (calendarId) => {
          try {
            const bookings = await getAllBookings(calendarId)
            return bookings.map(booking => ({ ...booking, calendarId }))
          } catch (error) {
            console.warn(`Failed to fetch bookings for ${calendarId}:`, error)
            return []
          }
        })
        
        const bookingArrays = await Promise.all(bookingPromises)
        const allBookings = bookingArrays.flat()

        // Calculate real statistics
        const poseCount = bookingArrays[0]?.length || 0 // calendar1 = Pose
        const metreCount = bookingArrays[1]?.length || 0 // calendar2 = Metré
        const savCount = bookingArrays[2]?.length || 0 // calendar3 = SAV
        
        setTotalBookings(allBookings.length)
        setPoseBookings(poseCount)
        setSavBookings(savCount)
        setMetreBookings(metreCount)

        // Calculate booking rate (Taux d'engorgement) based on capacity
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        // Get total days in current month
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
        
        // Filter bookings for current month by calendar
        const poseBookingsThisMonth = bookingArrays[0]?.filter(booking => {
          const bookingDate = new Date(booking.date)
          return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear
        }) || []
        
        const metreBookingsThisMonth = bookingArrays[1]?.filter(booking => {
          const bookingDate = new Date(booking.date)
          return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear
        }) || []
        
        const savBookingsThisMonth = bookingArrays[2]?.filter(booking => {
          const bookingDate = new Date(booking.date)
          return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear
        }) || []
        
        // Calculate rates based on capacity
        // Pose: 2 per day, Metré: 8 per day, SAV: 3 per day
        const poseCapacity = daysInMonth * 2
        const metreCapacity = daysInMonth * 8
        const savCapacity = daysInMonth * 3
        const totalCapacity = poseCapacity + metreCapacity + savCapacity
        
        const calculatedPoseRate = poseCapacity > 0 ? Math.round((poseBookingsThisMonth.length / poseCapacity) * 100) : 0
        const calculatedMetreRate = metreCapacity > 0 ? Math.round((metreBookingsThisMonth.length / metreCapacity) * 100) : 0
        const calculatedSavRate = savCapacity > 0 ? Math.round((savBookingsThisMonth.length / savCapacity) * 100) : 0
        
        const totalBookingsThisMonth = poseBookingsThisMonth.length + metreBookingsThisMonth.length + savBookingsThisMonth.length
        const rate = totalCapacity > 0 ? Math.round((totalBookingsThisMonth / totalCapacity) * 100) : 0
        
        setPoseRate(calculatedPoseRate)
        setMetreRate(calculatedMetreRate)
        setSavRate(calculatedSavRate)
        setBookingRate(rate)

        // Store all bookings for chart generation
        setAllBookingsForChart(allBookings)

        // Process recent bookings (top 5 most recent)
        const sortedBookings = allBookings
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 10)
        setRecentBookings(sortedBookings)

        // Process top clients (SAV calendar only)
        const savBookingsOnly = allBookings.filter(booking => (booking as any).calendarId === 'calendar3')
        const clientCounts: { [key: string]: number } = {}
        savBookingsOnly.forEach(booking => {
          const clientName = booking.name
          if (clientName) {
            clientCounts[clientName] = (clientCounts[clientName] || 0) + 1
          }
        })

        // Convert to array, sort by count (descending), and take top 10
        const topClientsList = Object.entries(clientCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
        
        setTopClients(topClientsList)

        setTopClientsAll(computeTopClientsByView(allBookings as any, topClientsView))
      } catch (error) {
        console.error('Error loading bookings data:', error)
        setTopClients([])
        setTopClientsAll([])
      } finally {
        setIsLoadingBookings(false)
        setIsLoadingTopClients(false)
      }
    }

    loadBookingsData()
  }, [])

  // Generate chart data based on view mode (month or week)
  useEffect(() => {
    if (allBookingsForChart.length === 0) {
      setChartData([])
      return
    }

    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    const chartDataPoints: Array<{ month: string; Metré: number; Pose: number; SAV: number; day?: number; cumulMetré?: number; cumulPose?: number; cumulSAV?: number }> = []

    // Get target month based on offset (for month view) or current month (for week view)
    const now = new Date()
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    const targetMonth = targetDate.getMonth()
    const targetYear = targetDate.getFullYear()
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()

    if (chartViewMode === 'month') {
      // Generate daily data for the target month with cumulative totals
      let cumulMetré = 0
      let cumulPose = 0
      let cumulSAV = 0
      
      for (let day = 1; day <= daysInTargetMonth; day++) {
        const dayBookings = allBookingsForChart.filter(booking => {
          const dateParts = booking.date.split('-')
          if (dateParts.length === 3) {
            const bookingYear = parseInt(dateParts[0], 10)
            const bookingMonth = parseInt(dateParts[1], 10) - 1
            const bookingDay = parseInt(dateParts[2], 10)
            return bookingMonth === targetMonth && bookingYear === targetYear && bookingDay === day
          }
          return false
        })
        
        const metreDayCount = dayBookings.filter(b => (b as any).calendarId === 'calendar2').length
        const poseDayCount = dayBookings.filter(b => (b as any).calendarId === 'calendar1').length
        const savDayCount = dayBookings.filter(b => (b as any).calendarId === 'calendar3').length
        
        // Accumulate totals
        cumulMetré += metreDayCount
        cumulPose += poseDayCount
        cumulSAV += savDayCount
        
        // Only show label for first and last day
        const label = (day === 1 || day === daysInTargetMonth)
          ? `${day} ${monthNames[targetMonth]}`
          : ''
        
        chartDataPoints.push({
          month: label,
          Metré: metreDayCount,
          Pose: poseDayCount,
          SAV: savDayCount,
          day: day,
          cumulMetré: cumulMetré,
          cumulPose: cumulPose,
          cumulSAV: cumulSAV
        })
      }
    } else {
      // Generate data for the current week (7 days)
      // Get the current date and find the Monday of the current week
      const today = new Date()
      const currentWeekStart = new Date(today)
      const dayOfWeek = today.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust to Monday
      currentWeekStart.setDate(today.getDate() + diff + (weekOffset * 7))
      currentWeekStart.setHours(0, 0, 0, 0)
      
      // Generate 7 days of the week
      let cumulMetré = 0
      let cumulPose = 0
      let cumulSAV = 0
      
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDay = new Date(currentWeekStart)
        currentDay.setDate(currentWeekStart.getDate() + dayOffset)
        
        const dayBookings = allBookingsForChart.filter(booking => {
          const dateParts = booking.date.split('-')
          if (dateParts.length === 3) {
            const bookingYear = parseInt(dateParts[0], 10)
            const bookingMonth = parseInt(dateParts[1], 10) - 1
            const bookingDay = parseInt(dateParts[2], 10)
            return bookingMonth === currentDay.getMonth() && 
                   bookingYear === currentDay.getFullYear() && 
                   bookingDay === currentDay.getDate()
          }
          return false
        })
        
        const metreDayCount = dayBookings.filter(b => (b as any).calendarId === 'calendar2').length
        const poseDayCount = dayBookings.filter(b => (b as any).calendarId === 'calendar1').length
        const savDayCount = dayBookings.filter(b => (b as any).calendarId === 'calendar3').length
        
        // Accumulate totals
        cumulMetré += metreDayCount
        cumulPose += poseDayCount
        cumulSAV += savDayCount
        
        // Create label with day number and month abbreviation (e.g., "1 Déc", "2 Déc")
        const dayNumber = currentDay.getDate()
        const monthAbbr = monthNames[currentDay.getMonth()]
        const dayLabel = `${dayNumber} ${monthAbbr}`
        
        chartDataPoints.push({
          month: dayLabel,
          Metré: metreDayCount,
          Pose: poseDayCount,
          SAV: savDayCount,
          day: dayNumber, // Store day number for tooltip
          cumulMetré: cumulMetré,
          cumulPose: cumulPose,
          cumulSAV: cumulSAV
        })
      }
    }

    setChartData(chartDataPoints)
  }, [allBookingsForChart, chartViewMode, monthOffset, weekOffset])

  // Recompute top concepteurs when view changes or bookings refresh
  useEffect(() => {
    setTopClientsAll(computeTopClientsByView(allBookingsForChart as any, topClientsView))
  }, [topClientsView, allBookingsForChart])

  // Load users count
  useEffect(() => {
    const loadUsersCount = async () => {
      try {
        const users = await getAllUsers()
        setTotalUsers(users.length)
      } catch (error) {
        console.error('Error loading users count:', error)
        setTotalUsers(0)
      }
    }
    loadUsersCount()
  }, [])

  // Load all notifications
  const loadNotifications = async () => {
    try {
      const notifications = await getAllNotifications()
      setAllNotifications(notifications)
      setUnreadCount(notifications.length)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  useEffect(() => {
    loadNotifications()
    // Refresh notifications every 60 seconds (reduced from 30s to lower API load)
    const interval = setInterval(loadNotifications, 60000)
    // Listen for custom refresh events
    const handleRefresh = () => loadNotifications()
    window.addEventListener('notificationRefresh', handleRefresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('notificationRefresh', handleRefresh)
    }
  }, []) // Remove recentBookings dependency - notifications should load independently

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (notificationsOpen && !target.closest('[data-notifications-dropdown]')) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [notificationsOpen])

  // Calculate max value for chart - ensure minimum of 5 for clean Y-axis labels
  const rawMaxValue = chartData.length > 0 
    ? Math.max(...chartData.flatMap(d => [d.Metré, d.Pose, d.SAV]), 1) 
    : 5
  // Round up to nearest multiple of 5 for cleaner labels (5, 10, 15, 20, etc.)
  const maxValue = Math.max(5, Math.ceil(rawMaxValue / 5) * 5)
  const clampY = (value: number) => Math.min(380, Math.max(0, value)) // keep chart above X-axis

  // Helper function to calculate time ago
  const getTimeAgo = (timestamp: number): string => {
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

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    // Dispatch custom event to notify calendar pages about dark mode change
    window.dispatchEvent(new CustomEvent('darkModeChanged', { detail: { isDarkMode: newDarkMode } }))
  }

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    navigate('/')
  }

  const [orangeColor, setOrangeColor] = useState<string>(() => {
    const saved = localStorage.getItem('accentColor')
    return saved || '#fa541c'
  })

  // Listen for settings updates
  useEffect(() => {
    const handleSettingsUpdate = () => {
      const saved = localStorage.getItem('accentColor')
      if (saved) {
        setOrangeColor(saved)
        document.documentElement.style.setProperty('--accent-color', saved)
      }
    }
    
    window.addEventListener('settingsUpdated', handleSettingsUpdate)
    window.addEventListener('storage', handleSettingsUpdate)
    
    // Check on mount
    const saved = localStorage.getItem('accentColor')
    if (saved) {
      setOrangeColor(saved)
      document.documentElement.style.setProperty('--accent-color', saved)
    }
    
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate)
      window.removeEventListener('storage', handleSettingsUpdate)
    }
  }, [])
  const bgColor = isDarkMode ? '#000000' : '#f5f5f5'
  const cardBg = isDarkMode ? '#1a1a1a' : '#ffffff'
  const textColor = isDarkMode ? '#ffffff' : '#111827'
  const textSecondary = isDarkMode ? '#9ca3af' : '#6b7280'
  const borderColor = isDarkMode ? '#333333' : '#e5e7eb'

  return (
    <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: bgColor }}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-menu-overlay active"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            display: isMobile ? 'block' : 'none',
            position: 'fixed',
            top: '60px', // Start below the header
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998
          }}
        />
      )}
      
      {/* Mobile Header */}
      {isMobile && (
        <div 
          className="mobile-header"
          style={{
            display: 'flex',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            backgroundColor: isDarkMode ? '#000000' : '#ffffff',
            zIndex: 1000, // Higher than overlay to ensure buttons are always clickable
            padding: '0 16px',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '8px',
                color: textColor,
                zIndex: 1001, // Ensure button is always on top
                position: 'relative'
              }}
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${orangeColor} 0%, #ff6b35 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar style={{ width: '16px', height: '16px', color: '#ffffff' }} />
            </div>
            <span style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>Tableau de Bord</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              data-notifications-dropdown
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              style={{
                position: 'relative',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: textSecondary,
                cursor: 'pointer'
              }}
            >
              <Bell style={{ width: '20px', height: '20px' }} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  minWidth: '16px',
                  height: '16px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#ffffff'
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={toggleDarkMode}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: textSecondary,
                cursor: 'pointer'
              }}
            >
              {isDarkMode ? <Sun style={{ width: '18px', height: '18px' }} /> : <Moon style={{ width: '18px', height: '18px' }} />}
            </button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
      {/* Sidebar */}
      <nav
        className={`dashboard-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          position: isMobile ? 'fixed' : 'sticky',
          top: isMobile ? '60px' : 0, // Start below mobile header
          left: 0,
          height: isMobile ? 'calc(100vh - 60px)' : '100vh', // Adjust height for mobile header
          width: isMobile ? '280px' : (sidebarOpen ? '256px' : '64px'),
          borderRight: `1px solid ${borderColor}`,
          backgroundColor: isDarkMode ? '#000000' : '#ffffff',
          padding: '8px',
          paddingBottom: '60px',
          transition: 'width 0.3s ease, transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          transform: isMobile ? (mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          zIndex: 999
        }}
      >
        {/* Logo Section */}
        <div style={{
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: `linear-gradient(135deg, ${orangeColor} 0%, #ff6b35 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(250, 84, 28, 0.3)'
          }}>
            <Calendar style={{ width: '20px', height: '20px', color: '#ffffff' }} />
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>Tableau de Bord</div>
              <div style={{ fontSize: '12px', color: textSecondary }}>Tableau de Bord</div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <SidebarItem
            Icon={Home}
            title="Accueil"
            isActive={location.pathname === '/' || location.pathname === '/dashboard'}
            open={sidebarOpen}
            onClick={() => navigate('/dashboard')}
            isDarkMode={isDarkMode}
            orangeColor={orangeColor}
            textColor={textColor}
            textSecondary={textSecondary}
          />
          
          {isAdmin && (
            <SidebarItem
              Icon={ClipboardList}
              title="Réservation"
              isActive={location.pathname === '/réservation'}
              open={sidebarOpen}
              onClick={() => navigate('/réservation')}
              isDarkMode={isDarkMode}
              orangeColor={orangeColor}
              textColor={textColor}
              textSecondary={textSecondary}
            />
          )}
          
          {isAdmin && (
            <SidebarItem
              Icon={CalendarCheck}
              title="Gestion des jours-fériés"
              isActive={location.pathname === '/jours-feries'}
              open={sidebarOpen}
              onClick={() => navigate('/jours-feries')}
              isDarkMode={isDarkMode}
              orangeColor={orangeColor}
              textColor={textColor}
              textSecondary={textSecondary}
            />
          )}
          
          {isAdmin && (
            <SidebarItem
              Icon={UsersIcon}
              title="Utilisateurs"
              isActive={location.pathname === '/utilisateurs'}
              open={sidebarOpen}
              onClick={() => navigate('/utilisateurs')}
              isDarkMode={isDarkMode}
              orangeColor={orangeColor}
              textColor={textColor}
              textSecondary={textSecondary}
            />
          )}
          
          <button
            onClick={() => setCalendarsExpanded(!calendarsExpanded)}
            style={{
              width: '100%',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              color: textSecondary,
              borderLeft: '3px solid transparent',
              transition: 'all 0.2s',
              fontSize: '14px',
              fontWeight: 500
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
              e.currentTarget.style.color = textColor
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = textSecondary
            }}
          >
            <Calendar style={{ width: '20px', height: '20px', flexShrink: 0 }} />
            {sidebarOpen && (
              <>
                <span style={{ flex: 1, textAlign: 'left' }}>Calendriers</span>
                {calendarsExpanded ? (
                  <Minus style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                ) : (
                  <ChevronDown style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                )}
              </>
          )}
          </button>
          
          {(isAdmin || isTechnicien) && calendarsExpanded && (
            <div style={{ paddingLeft: '20px' }}>
          <SidebarItem
            Icon={Calendar}
                title="SAV"
                isActive={location.pathname === '/sav'}
            open={sidebarOpen}
                onClick={() => navigate('/sav')}
            isDarkMode={isDarkMode}
            orangeColor={orangeColor}
            textColor={textColor}
            textSecondary={textSecondary}
          />
            <SidebarItem
                Icon={Calendar}
                title="Pose"
                isActive={location.pathname === '/pose'}
              open={sidebarOpen}
                onClick={() => navigate('/pose')}
              isDarkMode={isDarkMode}
              orangeColor={orangeColor}
              textColor={textColor}
              textSecondary={textSecondary}
            />
              <SidebarItem
                Icon={Calendar}
                title="Metré"
                isActive={location.pathname === '/metre'}
                open={sidebarOpen}
                onClick={() => navigate('/metre')}
                isDarkMode={isDarkMode}
                orangeColor={orangeColor}
                textColor={textColor}
                textSecondary={textSecondary}
              />
            </div>
          )}
        </div>

        {/* Settings Section */}
        {sidebarOpen && (
          <div style={{
            borderTop: `1px solid ${borderColor}`,
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            marginBottom: '8px'
          }}>
            <div style={{
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 500,
              color: textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Paramètres
            </div>
            <SidebarItem
              Icon={isDarkMode ? Sun : Moon}
              title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
              isActive={false}
              open={sidebarOpen}
              onClick={toggleDarkMode}
              isDarkMode={isDarkMode}
              orangeColor={orangeColor}
              textColor={textColor}
              textSecondary={textSecondary}
            />
            <SidebarItem
              Icon={Settings}
              title="Paramètres"
              isActive={location.pathname === '/parametres'}
              open={sidebarOpen}
              onClick={() => navigate('/parametres')}
              isDarkMode={isDarkMode}
              orangeColor={orangeColor}
              textColor={textColor}
              textSecondary={textSecondary}
            />
          </div>
        )}

        {/* Logout Section */}
        <div style={{
          borderTop: `1px solid ${borderColor}`,
          paddingTop: '8px',
          paddingBottom: '8px',
          marginBottom: '8px'
        }}>
            <SidebarItem
              Icon={LogOut}
              title="Déconnexion"
              isActive={false}
              open={sidebarOpen}
              onClick={handleLogout}
              isDarkMode={isDarkMode}
              orangeColor={orangeColor}
              textColor={textColor}
              textSecondary={textSecondary}
            />
          </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: `1px solid ${borderColor}`,
            padding: '12px',
            backgroundColor: 'transparent',
            borderLeft: 'none',
            borderRight: 'none',
            borderBottom: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: textSecondary,
            transition: 'background-color 0.2s',
            height: '48px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronsRight style={{
              width: '16px',
              height: '16px',
              transform: sidebarOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }} />
          </div>
          {sidebarOpen && (
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Masquer</span>
          )}
        </button>
      </nav>

      {/* Main Content */}
      <div 
        className="dashboard-main"
        style={{
          flex: 1,
          overflow: 'visible',
          backgroundColor: bgColor,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: isMobile ? '60px' : 0
        }}
      >
        {location.pathname === '/calendrier' ? (
          <HomePage disableAnimations={true} isAdminView={true} />
        ) : location.pathname === '/metre' ? (
          <Calendar2Page disableAnimations={true} isAdminView={true} />
        ) : location.pathname === '/pose' ? (
          <Calendar1Page disableAnimations={true} isAdminView={true} />
        ) : location.pathname === '/sav' ? (
          <Calendar3Page disableAnimations={true} isAdminView={true} />
        ) : (
          <div 
            className="dashboard-content"
            style={{
              padding: isMobile ? '16px' : '24px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}
          >
        {/* Header */}
        <div 
          className="dashboard-header"
          style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            marginBottom: isMobile ? '20px' : '32px',
            animation: 'fadeInDown 0.5s ease-out',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '16px' : '0'
          }}
        >
          <div>
            <h1 style={{
              fontSize: '30px',
              fontWeight: 700,
              color: textColor,
              marginBottom: '4px'
            }}>
              Tableau de Bord
            </h1>
            <p style={{
              fontSize: '16px',
              color: textSecondary,
              marginTop: '4px'
            }}>
              Bienvenue sur votre tableau de bord
            </p>
          </div>
          <div 
            className="header-actions"
            style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}
          >
            <button 
              data-notifications-dropdown
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              style={{
                position: 'relative',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                color: textSecondary,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = textColor
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = textSecondary
                e.currentTarget.style.backgroundColor = cardBg
              }}
            >
              <Bell style={{ width: '20px', height: '20px' }} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  minWidth: '18px',
                  height: '18px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#ffffff',
                  padding: '0 4px'
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div 
                data-notifications-dropdown
                className="notifications-dropdown"
                style={{
                  position: 'fixed',
                  top: isMobile ? '60px' : '72px',
                  right: isMobile ? '12px' : '24px',
                  width: isMobile ? 'min(420px, calc(100vw - 24px))' : '380px',
                  maxHeight: '70vh',
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '12px',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                  zIndex: 3000,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{
                  padding: '16px',
                  borderBottom: `1px solid ${borderColor}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: textColor
                  }}>
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span style={{
                      fontSize: '12px',
                      color: '#ef4444',
                      fontWeight: 600
                    }}>
                      {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div style={{
                  overflowY: 'auto',
                  maxHeight: '400px',
                  flex: 1
                }}>
                  {allNotifications.length === 0 ? (
                    <div style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: textSecondary
                    }}>
                      Aucune notification
                    </div>
                  ) : (
                    allNotifications.slice(0, 10).map((notification) => {
                      const timeAgo = getNotificationTimeAgo(notification.timestamp)
                      const getNotificationDetails = () => {
                        if (notification.type === 'booking') {
                          const booking = notification.data as any
                          const calendarName = getCalendarName(booking.calendarId)
                          return {
                            subtitle: `${booking.name} - ${calendarName}`,
                            details: `${booking.date} ${booking.time && booking.time !== '21h00' ? `à ${booking.time}` : ''}`,
                                onClick: () => {
                                  setNotificationsOpen(false)
                                  navigate('/réservation', { state: { highlightBookingId: booking.id, calendarId: booking.calendarId } })
                                }
                          }
                        } else if (notification.type === 'holiday') {
                          const holiday = notification.data as any
                          const calendarName = getCalendarName(holiday.calendarId)
                          const formatDate = (dateString: string): string => {
                            const date = new Date(dateString + 'T00:00:00')
                            return date.toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          }
                          return {
                            subtitle: `${calendarName} - ${formatDate(holiday.holiday_date)}`,
                            details: 'Jour férié ajouté',
                            onClick: () => {
                              setNotificationsOpen(false)
                              navigate('/jours-feries')
                            }
                          }
                        } else if (notification.type === 'user') {
                          const user = notification.data
                          const getRoleLabel = (role: string): string => {
                            const roleLabels: { [key: string]: string } = {
                              'admin': 'Administrateur',
                              'concepteur': 'Concepteur',
                              'technicien': 'Technicien',
                              'user': 'Utilisateur'
                            }
                            return roleLabels[role] || role
                          }
                          return {
                            subtitle: `${user.name} (${getRoleLabel(user.role)})`,
                            details: user.email,
                            onClick: () => {
                              setNotificationsOpen(false)
                              navigate('/utilisateurs')
                            }
                          }
                        }
                        return { subtitle: '', details: '', onClick: () => {} }
                      }
                      const details = getNotificationDetails()
                      return (
                        <div
                          key={notification.id}
                          onClick={details.onClick}
                          style={{
                            padding: '12px 16px',
                            borderBottom: `1px solid ${borderColor}`,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isDarkMode ? '#2a2a2a' : '#f9fafb'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '12px'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: textColor,
                                marginBottom: '4px'
                              }}>
                                {notification.title}
                              </div>
                              <div style={{
                                fontSize: '13px',
                                color: textSecondary,
                                marginBottom: '4px'
                              }}>
                                {details.subtitle}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: textSecondary
                              }}>
                                {details.details}
                              </div>
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: textSecondary,
                              whiteSpace: 'nowrap'
                            }}>
                              {timeAgo}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                {allNotifications.length > 0 && (
                  <div style={{
                    padding: '12px 16px',
                    borderTop: `1px solid ${borderColor}`,
                    textAlign: 'center'
                  }}>
                    <button
                      onClick={() => {
                        setNotificationsOpen(false)
                        if (allNotifications[0]?.type === 'booking') {
                          navigate('/réservation')
                        } else if (allNotifications[0]?.type === 'holiday') {
                          navigate('/jours-feries')
                        } else {
                          navigate('/utilisateurs')
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: orangeColor,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      Voir toutes les notifications
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={toggleDarkMode}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                backgroundColor: cardBg,
                color: textSecondary,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = textColor
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = textSecondary
                e.currentTarget.style.backgroundColor = cardBg
              }}
            >
              {isDarkMode ? (
                <Sun style={{ width: '16px', height: '16px' }} />
              ) : (
                <Moon style={{ width: '16px', height: '16px' }} />
              )}
            </button>
            <button 
              onClick={handleLogout}
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                color: textSecondary,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = textColor
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = textSecondary
                e.currentTarget.style.backgroundColor = cardBg
              }}
            >
              <LogOut style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div 
          className="stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: isMobile ? '12px' : '24px',
            marginBottom: isMobile ? '20px' : '32px',
            animation: 'fadeInUp 0.6s ease-out'
          }}
        >
          <StatCardContent
            title="Taux d'engorgement"
            value={`${bookingRate} %`}
            change={`Pose: ${poseRate}% | SAV: ${savRate}% | Metré: ${metreRate}%`}
            Icon={Percent}
            iconBg={isDarkMode ? `${orangeColor}30` : `${orangeColor}20`}
            iconColor={orangeColor}
            cardBg={cardBg}
            textColor={textColor}
            textSecondary={textSecondary}
            borderColor={borderColor}
          />
          <StatCardContent
            title="Utilisateurs"
            value={totalUsers.toLocaleString('fr-FR')}
            change="Comptes enregistrés"
            Icon={UsersIcon}
            iconBg={isDarkMode ? '#10b98130' : '#10b98120'}
            iconColor="#10b981"
            cardBg={cardBg}
            textColor={textColor}
            textSecondary={textSecondary}
            borderColor={borderColor}
          />
          <StatCardContent
            title="Total Réservations"
            value={totalBookings.toLocaleString('fr-FR')}
            change={`Pose: ${poseBookings} | SAV: ${savBookings} | Metré: ${metreBookings}`}
            Icon={CalendarCheck}
            iconBg={isDarkMode ? '#8b5cf630' : '#8b5cf620'}
            iconColor="#8b5cf6"
            cardBg={cardBg}
            textColor={textColor}
            textSecondary={textSecondary}
            borderColor={borderColor}
          />
          <StatCardContent
            title="Réservations SAV"
            value={savBookings.toLocaleString('fr-FR')}
            change="Interventions SAV"
            Icon={Calendar}
            iconBg={isDarkMode ? `${orangeColor}30` : `${orangeColor}20`}
            iconColor={orangeColor}
            cardBg={cardBg}
            textColor={textColor}
            textSecondary={textSecondary}
            borderColor={borderColor}
          />
        </div>

        {/* Content Grid */}
        <div 
          className="content-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
            gridTemplateRows: 'auto auto',
            gap: isMobile ? '16px' : '32px',
            animation: 'fadeInUp 0.8s ease-out',
            flex: 1,
            minHeight: 0
          }}
        >
          {/* Chart Section - Top Left */}
          <div style={{
            backgroundColor: cardBg,
            borderRadius: '16px',
            padding: '24px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            animation: 'fadeInUp 1s ease-out',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)'
            e.currentTarget.style.borderColor = borderColor === '#333333' ? '#444444' : '#d1d5db'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
            e.currentTarget.style.borderColor = borderColor
          }}
          >
            <div 
              className="chart-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                marginBottom: '20px',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '0'
              }}
            >
              <h3 style={{
                fontSize: isMobile ? '16px' : '20px',
                fontWeight: 600,
                color: textColor,
                margin: 0
              }}>
                Évolution des Réservations
              </h3>
              <div 
                className="chart-controls"
                style={{
                  display: 'flex',
                  gap: '8px',
                  backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
                  borderRadius: '8px',
                  padding: '4px',
                  border: `1px solid ${borderColor}`,
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: isMobile ? 'center' : 'flex-start'
                }}
              >
                <button
                  onClick={() => setChartViewMode('month')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: chartViewMode === 'month' 
                      ? orangeColor 
                      : 'transparent',
                    color: chartViewMode === 'month' 
                      ? '#ffffff' 
                      : textSecondary,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: chartViewMode === 'month' ? 600 : 500,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (chartViewMode !== 'month') {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#2a2a2a' : '#e5e7eb'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (chartViewMode !== 'month') {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  Par mois
                </button>
                <button
                  onClick={() => {
                    setChartViewMode('week')
                    setMonthOffset(0) // Reset to current month when switching to week view
                    setWeekOffset(0) // Reset to current week when switching to week view
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: chartViewMode === 'week' 
                      ? orangeColor 
                      : 'transparent',
                    color: chartViewMode === 'week' 
                      ? '#ffffff' 
                      : textSecondary,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: chartViewMode === 'week' ? 600 : 500,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (chartViewMode !== 'week') {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#2a2a2a' : '#e5e7eb'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (chartViewMode !== 'week') {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  Par semaine
                </button>
              </div>
            </div>
            
            {/* Month Navigation - only show in month view */}
            {chartViewMode === 'month' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <button
                  onClick={() => setMonthOffset(prev => prev - 1)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isDarkMode ? '#262626' : '#ffffff',
                    color: textSecondary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    fontSize: '18px',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = orangeColor
                    e.currentTarget.style.color = '#ffffff'
                    e.currentTarget.style.borderColor = orangeColor
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#262626' : '#ffffff'
                    e.currentTarget.style.color = textSecondary
                    e.currentTarget.style.borderColor = borderColor
                  }}
                >
                  ‹
                </button>
                <div style={{
                  minWidth: '180px',
                  textAlign: 'center',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: textColor,
                  padding: '8px 20px',
                  borderRadius: '20px',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${borderColor}`
                }}>
                  {(() => {
                    const fullMonthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
                    const now = new Date()
                    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
                    return `${fullMonthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`
                  })()}
                </div>
                <button
                  onClick={() => setMonthOffset(prev => prev + 1)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isDarkMode ? '#262626' : '#ffffff',
                    color: textSecondary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    fontSize: '18px',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = orangeColor
                    e.currentTarget.style.color = '#ffffff'
                    e.currentTarget.style.borderColor = orangeColor
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#262626' : '#ffffff'
                    e.currentTarget.style.color = textSecondary
                    e.currentTarget.style.borderColor = borderColor
                  }}
                >
                  ›
                </button>
                {monthOffset !== 0 && (
                  <button
                    onClick={() => setMonthOffset(0)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      backgroundColor: orangeColor,
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      marginLeft: '4px',
                      boxShadow: `0 2px 8px ${orangeColor}40`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)'
                      e.currentTarget.style.boxShadow = `0 4px 12px ${orangeColor}60`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = `0 2px 8px ${orangeColor}40`
                    }}
                  >
                    Ce mois
                  </button>
                )}
              </div>
            )}

            {/* Week Navigation - only show in week view */}
            {chartViewMode === 'week' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <button
                  onClick={() => setWeekOffset(prev => prev - 1)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isDarkMode ? '#262626' : '#ffffff',
                    color: textSecondary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    fontSize: '18px',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = orangeColor
                    e.currentTarget.style.color = '#ffffff'
                    e.currentTarget.style.borderColor = orangeColor
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#262626' : '#ffffff'
                    e.currentTarget.style.color = textSecondary
                    e.currentTarget.style.borderColor = borderColor
                  }}
                >
                  ‹
                </button>
                <div style={{
                  minWidth: '180px',
                  textAlign: 'center',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: textColor,
                  padding: '8px 20px',
                  borderRadius: '20px',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${borderColor}`
                }}>
                  {(() => {
                    const today = new Date()
                    const currentWeekStart = new Date(today)
                    const dayOfWeek = today.getDay()
                    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
                    currentWeekStart.setDate(today.getDate() + diff + (weekOffset * 7))
                    const weekEnd = new Date(currentWeekStart)
                    weekEnd.setDate(currentWeekStart.getDate() + 6)
                    
                    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
                    const startDay = currentWeekStart.getDate()
                    const endDay = weekEnd.getDate()
                    const startMonth = monthNames[currentWeekStart.getMonth()]
                    const endMonth = monthNames[weekEnd.getMonth()]
                    
                    if (startMonth === endMonth) {
                      return `${startDay}-${endDay} ${startMonth}`
                    } else {
                      return `${startDay} ${startMonth} - ${endDay} ${endMonth}`
                    }
                  })()}
                </div>
                <button
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isDarkMode ? '#262626' : '#ffffff',
                    color: textSecondary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    fontSize: '18px',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = orangeColor
                    e.currentTarget.style.color = '#ffffff'
                    e.currentTarget.style.borderColor = orangeColor
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#262626' : '#ffffff'
                    e.currentTarget.style.color = textSecondary
                    e.currentTarget.style.borderColor = borderColor
                  }}
                >
                  ›
                </button>
                {weekOffset !== 0 && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      backgroundColor: orangeColor,
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      marginLeft: '4px',
                      boxShadow: `0 2px 8px ${orangeColor}40`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)'
                      e.currentTarget.style.boxShadow = `0 4px 12px ${orangeColor}60`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = `0 2px 8px ${orangeColor}40`
                    }}
                  >
                    Cette semaine
                  </button>
                )}
              </div>
            )}
            
            {/* Professional Legend */}
            <div 
              className="chart-legend"
              style={{
                display: 'flex',
                gap: isMobile ? '8px' : '16px',
                marginBottom: isMobile ? '16px' : '24px',
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '20px',
                backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  boxShadow: '0 0 6px rgba(59, 130, 246, 0.6)'
                }}></div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#3b82f6' }}>Metré</span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '20px',
                backgroundColor: isDarkMode ? `${orangeColor}15` : `${orangeColor}10`,
                border: `1px solid ${orangeColor}30`
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: orangeColor,
                  boxShadow: `0 0 6px ${orangeColor}80`
                }}></div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: orangeColor }}>Pose</span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '20px',
                backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)'
                }}></div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#10b981' }}>SAV</span>
              </div>
            </div>

            {/* Chart */}
            <div 
              className="chart-container"
              style={{ position: 'relative', width: '100%', flex: 1, minHeight: isMobile ? '300px' : '420px', overflow: 'visible' }}
            >
              {chartData.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '420px',
                  color: textSecondary,
                  fontSize: '16px',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <Calendar style={{ width: '48px', height: '48px', opacity: 0.5 }} />
                  <span>Aucune réservation pour afficher le graphique</span>
                </div>
              ) : (
              <svg width="100%" height="100%" style={{ overflow: 'visible' }} viewBox="0 0 900 430" preserveAspectRatio="xMidYMid meet">
                {/* Subtle grid lines - horizontal */}
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const y = (i / 5) * 380 + 10
                  return (
                    <line
                      key={`grid-${i}`}
                      x1="60"
                      y1={y}
                      x2="860"
                      y2={y}
                      stroke={isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                      strokeWidth="1"
                      style={{
                        animation: chartAnimation ? `fadeIn 0.5s ease-out ${i * 0.05}s both` : 'none'
                      }}
                    />
                  )
                })}

                {/* Y-axis labels with background */}
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const value = Math.round((maxValue / 5) * (5 - i))
                  const y = (i / 5) * 380 + 10
                  return (
                    <g key={`y-label-${i}`}>
                      <text
                        x="50"
                        y={y + 4}
                        textAnchor="end"
                        fontSize="11"
                        fontWeight="500"
                        fill={textSecondary}
                        style={{
                          animation: chartAnimation ? `fadeIn 0.5s ease-out ${i * 0.05}s both` : 'none'
                        }}
                      >
                        {value}
                      </text>
                    </g>
                  )
                })}

                {/* Gradient definitions for area fills */}
                <defs>
                  <linearGradient id="metreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="poseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={orangeColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={orangeColor} stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="savGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Chart area */}
                <g transform="translate(60, 10)">
                  {/* X-axis labels - only first and last day */}
                  {chartData.length > 0 && chartData.map((data, index) => {
                    const chartWidth = 800
                    const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                    const x = (index / divisor) * chartWidth
                    
                    // Only render if there's a label (first or last day)
                    if (!data.month) return null
                    
                    return (
                      <text
                        key={`x-label-${index}`}
                        x={x}
                        y="395"
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="500"
                        fill={textSecondary}
                        style={{
                          animation: chartAnimation ? `fadeInUp 0.5s ease-out 0.6s both` : 'none'
                        }}
                      >
                        {data.month}
                      </text>
                    )
                  })}

                  {/* Metré area fill with smooth curve */}
                  {chartData.length > 0 && (
                    <path
                      d={(() => {
                        const chartWidth = 800
                        const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                        const points: {x: number, y: number}[] = chartData.map((data, index) => ({
                          x: (index / divisor) * chartWidth,
                          y: clampY(380 - (data.Metré / maxValue) * 380)
                        }))
                        
                        // Create smooth curve using cardinal spline
                        let path = `M ${points[0].x} 380 L ${points[0].x} ${points[0].y}`
                        for (let i = 0; i < points.length - 1; i++) {
                          const p0 = points[Math.max(0, i - 1)]
                          const p1 = points[i]
                          const p2 = points[i + 1]
                          const p3 = points[Math.min(points.length - 1, i + 2)]
                          
                          const cp1x = p1.x + (p2.x - p0.x) / 6
                          const cp1y = clampY(p1.y + (p2.y - p0.y) / 6)
                          const cp2x = p2.x - (p3.x - p1.x) / 6
                          const cp2y = clampY(p2.y - (p3.y - p1.y) / 6)
                          
                          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
                        }
                        path += ` L ${points[points.length - 1].x} 380 Z`
                        return path
                      })()}
                      fill="url(#metreGradient)"
                      style={{
                        opacity: chartAnimation ? 1 : 0,
                        transition: 'opacity 1s ease-out 0.5s'
                      }}
                    />
                  )}

                  {/* Pose area fill with smooth curve */}
                  {chartData.length > 0 && (
                    <path
                      d={(() => {
                        const chartWidth = 800
                        const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                        const points: {x: number, y: number}[] = chartData.map((data, index) => ({
                          x: (index / divisor) * chartWidth,
                          y: clampY(380 - (data.Pose / maxValue) * 380)
                        }))
                        
                        let path = `M ${points[0].x} 380 L ${points[0].x} ${points[0].y}`
                        for (let i = 0; i < points.length - 1; i++) {
                          const p0 = points[Math.max(0, i - 1)]
                          const p1 = points[i]
                          const p2 = points[i + 1]
                          const p3 = points[Math.min(points.length - 1, i + 2)]
                          
                          const cp1x = p1.x + (p2.x - p0.x) / 6
                          const cp1y = clampY(p1.y + (p2.y - p0.y) / 6)
                          const cp2x = p2.x - (p3.x - p1.x) / 6
                          const cp2y = clampY(p2.y - (p3.y - p1.y) / 6)
                          
                          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
                        }
                        path += ` L ${points[points.length - 1].x} 380 Z`
                        return path
                      })()}
                      fill="url(#poseGradient)"
                      style={{
                        opacity: chartAnimation ? 1 : 0,
                        transition: 'opacity 1s ease-out 0.7s'
                      }}
                    />
                  )}

                  {/* SAV area fill with smooth curve */}
                  {chartData.length > 0 && (
                    <path
                      d={(() => {
                        const chartWidth = 800
                        const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                        const points: {x: number, y: number}[] = chartData.map((data, index) => ({
                          x: (index / divisor) * chartWidth,
                          y: clampY(380 - (data.SAV / maxValue) * 380)
                        }))
                        
                        let path = `M ${points[0].x} 380 L ${points[0].x} ${points[0].y}`
                        for (let i = 0; i < points.length - 1; i++) {
                          const p0 = points[Math.max(0, i - 1)]
                          const p1 = points[i]
                          const p2 = points[i + 1]
                          const p3 = points[Math.min(points.length - 1, i + 2)]
                          
                          const cp1x = p1.x + (p2.x - p0.x) / 6
                          const cp1y = clampY(p1.y + (p2.y - p0.y) / 6)
                          const cp2x = p2.x - (p3.x - p1.x) / 6
                          const cp2y = clampY(p2.y - (p3.y - p1.y) / 6)
                          
                          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
                        }
                        path += ` L ${points[points.length - 1].x} 380 Z`
                        return path
                      })()}
                      fill="url(#savGradient)"
                      style={{
                        opacity: chartAnimation ? 1 : 0,
                        transition: 'opacity 1s ease-out 0.9s'
                      }}
                    />
                  )}

                  {/* Metré smooth line */}
                  {chartData.length > 0 && (
                    <path
                      d={(() => {
                        const chartWidth = 800
                        const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                        const points: {x: number, y: number}[] = chartData.map((data, index) => ({
                          x: (index / divisor) * chartWidth,
                          y: clampY(380 - (data.Metré / maxValue) * 380)
                        }))
                        
                        let path = `M ${points[0].x} ${points[0].y}`
                        for (let i = 0; i < points.length - 1; i++) {
                          const p0 = points[Math.max(0, i - 1)]
                          const p1 = points[i]
                          const p2 = points[i + 1]
                          const p3 = points[Math.min(points.length - 1, i + 2)]
                          
                          const cp1x = p1.x + (p2.x - p0.x) / 6
                          const cp1y = clampY(p1.y + (p2.y - p0.y) / 6)
                          const cp2x = p2.x - (p3.x - p1.x) / 6
                          const cp2y = clampY(p2.y - (p3.y - p1.y) / 6)
                          
                          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
                        }
                        return path
                      })()}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: chartAnimation ? '2000' : '0',
                        strokeDashoffset: chartAnimation ? '0' : '2000',
                        transition: 'stroke-dashoffset 1.5s ease-out',
                        filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
                      }}
                    />
                  )}

                  {/* Pose smooth line */}
                  {chartData.length > 0 && (
                    <path
                      d={(() => {
                        const chartWidth = 800
                        const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                        const points: {x: number, y: number}[] = chartData.map((data, index) => ({
                          x: (index / divisor) * chartWidth,
                          y: clampY(380 - (data.Pose / maxValue) * 380)
                        }))
                        
                        let path = `M ${points[0].x} ${points[0].y}`
                        for (let i = 0; i < points.length - 1; i++) {
                          const p0 = points[Math.max(0, i - 1)]
                          const p1 = points[i]
                          const p2 = points[i + 1]
                          const p3 = points[Math.min(points.length - 1, i + 2)]
                          
                          const cp1x = p1.x + (p2.x - p0.x) / 6
                          const cp1y = clampY(p1.y + (p2.y - p0.y) / 6)
                          const cp2x = p2.x - (p3.x - p1.x) / 6
                          const cp2y = clampY(p2.y - (p3.y - p1.y) / 6)
                          
                          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
                        }
                        return path
                      })()}
                      fill="none"
                      stroke={orangeColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: chartAnimation ? '2000' : '0',
                        strokeDashoffset: chartAnimation ? '0' : '2000',
                        transition: 'stroke-dashoffset 1.5s ease-out 0.2s',
                        filter: `drop-shadow(0 2px 4px ${orangeColor}40)`
                      }}
                    />
                  )}

                  {/* SAV smooth line */}
                  {chartData.length > 0 && (
                    <path
                      d={(() => {
                        const chartWidth = 800
                        const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                        const points: {x: number, y: number}[] = chartData.map((data, index) => ({
                          x: (index / divisor) * chartWidth,
                          y: clampY(380 - (data.SAV / maxValue) * 380)
                        }))
                        
                        let path = `M ${points[0].x} ${points[0].y}`
                        for (let i = 0; i < points.length - 1; i++) {
                          const p0 = points[Math.max(0, i - 1)]
                          const p1 = points[i]
                          const p2 = points[i + 1]
                          const p3 = points[Math.min(points.length - 1, i + 2)]
                          
                          const cp1x = p1.x + (p2.x - p0.x) / 6
                          const cp1y = clampY(p1.y + (p2.y - p0.y) / 6)
                          const cp2x = p2.x - (p3.x - p1.x) / 6
                          const cp2y = clampY(p2.y - (p3.y - p1.y) / 6)
                          
                          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
                        }
                        return path
                      })()}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: chartAnimation ? '2000' : '0',
                        strokeDashoffset: chartAnimation ? '0' : '2000',
                        transition: 'stroke-dashoffset 1.5s ease-out 0.4s',
                        filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3))'
                      }}
                    />
                  )}

                  {/* Data points and hover zones */}
                  {chartData.length > 0 && chartData.map((data, index) => {
                    const chartWidth = 800
                    const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                    const x = (index / divisor) * chartWidth
                    const isHovered = hoveredMonth === index
                    const hasData = data.Metré > 0 || data.Pose > 0 || data.SAV > 0
                    
                    // Calculate Y positions for tooltip positioning
                    const metreY = clampY(380 - (data.Metré / maxValue) * 380)
                    const poseY = clampY(380 - (data.Pose / maxValue) * 380)
                    const savY = clampY(380 - (data.SAV / maxValue) * 380)
                    
                    return (
                      <g 
                        key={`points-${index}`}
                        onMouseEnter={() => setHoveredMonth(index)}
                        onMouseLeave={() => setHoveredMonth(null)}
                        style={{ cursor: hasData ? 'pointer' : 'default' }}
                      >
                        {/* Invisible hover zone for the entire column */}
                        <rect
                          x={x - 15}
                          y={0}
                          width={30}
                          height={380}
                          fill="transparent"
                        />
                        
                        {/* Metré point - only show if there's data */}
                        {data.Metré > 0 && (
                          <g>
                            {/* Outer glow ring on hover */}
                            {isHovered && (
                              <circle
                                cx={x}
                                cy={metreY}
                                r="12"
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2"
                                opacity="0.3"
                              />
                            )}
                            <circle
                              cx={x}
                              cy={metreY}
                              r={isHovered ? 6 : 4}
                              fill="#3b82f6"
                              stroke={isDarkMode ? '#1a1a1a' : '#ffffff'}
                              strokeWidth="2"
                              style={{
                                transition: 'r 0.2s ease-out',
                                filter: isHovered 
                                  ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))' 
                                  : 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))'
                              }}
                            />
                          </g>
                        )}
                        
                        {/* Pose point - only show if there's data */}
                        {data.Pose > 0 && (
                          <g>
                            {isHovered && (
                              <circle
                                cx={x}
                                cy={poseY}
                                r="12"
                                fill="none"
                                stroke={orangeColor}
                                strokeWidth="2"
                                opacity="0.3"
                              />
                            )}
                            <circle
                              cx={x}
                              cy={poseY}
                              r={isHovered ? 6 : 4}
                              fill={orangeColor}
                              stroke={isDarkMode ? '#1a1a1a' : '#ffffff'}
                              strokeWidth="2"
                              style={{
                                transition: 'r 0.2s ease-out',
                                filter: isHovered 
                                  ? `drop-shadow(0 0 8px ${orangeColor}cc)` 
                                  : `drop-shadow(0 0 4px ${orangeColor}80)`
                              }}
                            />
                          </g>
                        )}
                        
                        {/* SAV point - only show if there's data */}
                        {data.SAV > 0 && (
                          <g>
                            {isHovered && (
                              <circle
                                cx={x}
                                cy={savY}
                                r="12"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2"
                                opacity="0.3"
                              />
                            )}
                            <circle
                              cx={x}
                              cy={savY}
                              r={isHovered ? 6 : 4}
                              fill="#10b981"
                              stroke={isDarkMode ? '#1a1a1a' : '#ffffff'}
                              strokeWidth="2"
                              style={{
                                transition: 'r 0.2s ease-out',
                                filter: isHovered 
                                  ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))' 
                                  : 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))'
                              }}
                            />
                          </g>
                        )}
                        
                        {/* Vertical hover line - elegant gradient */}
                        {isHovered && hasData && (
                          <line
                            x1={x}
                            y1={Math.min(metreY, poseY, savY) - 5}
                            x2={x}
                            y2={380}
                            stroke={isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}
                            strokeWidth="1"
                            strokeDasharray="4 2"
                          />
                        )}
                        
                        {/* Day/Week label on X-axis when hovering */}
                        {isHovered && hasData && data.day && (
                          <g>
                            {/* Background pill */}
                            <rect
                              x={chartViewMode === 'week' ? x - 28 : x - 16}
                              y={385}
                              width={chartViewMode === 'week' ? 56 : 32}
                              height={20}
                              rx="10"
                              fill={orangeColor}
                            />
                            <text
                              x={x}
                              y="399"
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight="600"
                              fill="#ffffff"
                            >
                              {chartViewMode === 'week' ? data.month : data.day}
                            </text>
                          </g>
                        )}
                        
                        {/* Professional tooltip - only show if there's data */}
                        {isHovered && hasData && (
                          <g style={{ pointerEvents: 'none' }}>
                            {/* Calculate smart tooltip position to avoid clipping */}
                            {(() => {
                              const tooltipWidth = 130
                              const tooltipHeight = 95
                              const minY = Math.min(
                                data.Metré > 0 ? metreY : 380,
                                data.Pose > 0 ? poseY : 380,
                                data.SAV > 0 ? savY : 380
                              )
                              let tooltipX = x - tooltipWidth / 2
                              let tooltipY = minY - tooltipHeight - 15
                              
                              // Adjust X if near edges
                              if (tooltipX < 5) tooltipX = 5
                              if (tooltipX + tooltipWidth > 795) tooltipX = 795 - tooltipWidth
                              
                              // Adjust Y if too high
                              if (tooltipY < 5) tooltipY = minY + 20
                              
                              return (
                                <g>
                                  {/* Tooltip arrow */}
                                  <path
                                    d={`M ${x - 6} ${tooltipY + tooltipHeight} L ${x} ${tooltipY + tooltipHeight + 8} L ${x + 6} ${tooltipY + tooltipHeight} Z`}
                                    fill={isDarkMode ? '#262626' : '#ffffff'}
                                  />
                                  {/* Tooltip background with shadow */}
                                  <rect
                                    x={tooltipX}
                                    y={tooltipY}
                                    width={tooltipWidth}
                                    height={tooltipHeight}
                                    rx="10"
                                    fill={isDarkMode ? '#262626' : '#ffffff'}
                                    stroke={isDarkMode ? '#404040' : '#e5e7eb'}
                                    strokeWidth="1"
                                    style={{
                                      filter: 'drop-shadow(0 4px 16px rgba(0, 0, 0, 0.2))'
                                    }}
                                  />
                                  {/* Day title with accent bar */}
                                  <rect
                                    x={tooltipX}
                                    y={tooltipY}
                                    width={tooltipWidth}
                                    height={28}
                                    rx="10"
                                    fill={orangeColor}
                                    style={{ clipPath: 'inset(0 0 50% 0 round 10px)' }}
                                  />
                                  <rect
                                    x={tooltipX}
                                    y={tooltipY + 14}
                                    width={tooltipWidth}
                                    height={14}
                                    fill={orangeColor}
                                  />
                                  <text
                                    x={tooltipX + tooltipWidth / 2}
                                    y={tooltipY + 18}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fontWeight="600"
                                    fill="#ffffff"
                                  >
                                    {chartViewMode === 'week' 
                                      ? data.month || `Jour ${data.day}`
                                      : (data.day ? `Jour ${data.day}` : data.month)}
                                  </text>
                                  {/* Metré value - show day count */}
                                  <circle cx={tooltipX + 15} cy={tooltipY + 42} r="4" fill="#3b82f6" />
                                  <text
                                    x={tooltipX + 25}
                                    y={tooltipY + 46}
                                    fontSize="11"
                                    fill={isDarkMode ? '#e5e7eb' : '#374151'}
                                  >
                                    Metré
                                  </text>
                                  <text
                                    x={tooltipX + tooltipWidth - 10}
                                    y={tooltipY + 46}
                                    textAnchor="end"
                                    fontSize="11"
                                    fontWeight="600"
                                    fill="#3b82f6"
                                  >
                                    {data.Metré}
                                  </text>
                                  {/* Pose value - show day count */}
                                  <circle cx={tooltipX + 15} cy={tooltipY + 60} r="4" fill={orangeColor} />
                                  <text
                                    x={tooltipX + 25}
                                    y={tooltipY + 64}
                                    fontSize="11"
                                    fill={isDarkMode ? '#e5e7eb' : '#374151'}
                                  >
                                    Pose
                                  </text>
                                  <text
                                    x={tooltipX + tooltipWidth - 10}
                                    y={tooltipY + 64}
                                    textAnchor="end"
                                    fontSize="11"
                                    fontWeight="600"
                                    fill={orangeColor}
                                  >
                                    {data.Pose}
                                  </text>
                                  {/* SAV value - show day count */}
                                  <circle cx={tooltipX + 15} cy={tooltipY + 78} r="4" fill="#10b981" />
                                  <text
                                    x={tooltipX + 25}
                                    y={tooltipY + 82}
                                    fontSize="11"
                                    fill={isDarkMode ? '#e5e7eb' : '#374151'}
                                  >
                                    SAV
                                  </text>
                                  <text
                                    x={tooltipX + tooltipWidth - 10}
                                    y={tooltipY + 82}
                                    textAnchor="end"
                                    fontSize="11"
                                    fontWeight="600"
                                    fill="#10b981"
                                  >
                                    {data.SAV}
                                  </text>
                                </g>
                              )
                            })()}
                          </g>
                        )}
                      </g>
                    )
                  })}
                </g>

                {/* X-axis - subtle bottom line */}
                <line
                  x1="60"
                  y1="390"
                  x2="860"
                  y2="390"
                  stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                  strokeWidth="1"
                  style={{
                    animation: chartAnimation ? 'fadeIn 0.5s ease-out 0.3s both' : 'none'
                  }}
                />
              </svg>
              )}
            </div>
          </div>

          {/* Meilleurs Clients - Top Right */}
          <div style={{
            backgroundColor: cardBg,
            borderRadius: '16px',
            padding: '24px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            animation: 'fadeInRight 0.7s ease-out',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)'
            e.currentTarget.style.borderColor = borderColor === '#333333' ? '#444444' : '#d1d5db'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
            e.currentTarget.style.borderColor = borderColor
          }}
          >
            <div style={{
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: textColor
              }}>
                Top 10 Clients SAV
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: '1' }}>
              {isLoadingTopClients ? (
                <div style={{ padding: '20px', textAlign: 'center', color: textSecondary }}>
                  Chargement...
                </div>
              ) : topClients.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: textSecondary }}>
                  Aucun client
                </div>
              ) : (
                topClients.map((client, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px'
                  }}>
                    <span style={{ fontSize: '14px', color: textSecondary }}>{client.name}</span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: textColor }}>
                      {client.count} {client.count === 1 ? 'réservation' : 'réservations'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity - Bottom Left */}
          <div style={{
            backgroundColor: cardBg,
            borderRadius: '16px',
            padding: '24px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            animation: 'fadeInLeft 0.7s ease-out',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)'
            e.currentTarget.style.borderColor = borderColor === '#333333' ? '#444444' : '#d1d5db'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
            e.currentTarget.style.borderColor = borderColor
          }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: textColor
              }}>
                Réservation Récente
              </h3>
              <button 
                onClick={() => navigate('/réservation')}
                style={{
                  fontSize: '12px',
                  color: orangeColor,
                  fontWeight: 500,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b35'}
                onMouseLeave={(e) => e.currentTarget.style.color = orangeColor}
              >
                Voir tout
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {isLoadingBookings ? (
                <div style={{ padding: '20px', textAlign: 'center', color: textSecondary }}>
                  Chargement...
                </div>
              ) : recentBookings.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: textSecondary }}>
                  Aucune réservation récente
                </div>
              ) : (
                recentBookings.map((booking) => {
                  const calendarId = (booking as any).calendarId || 'calendar1'
                  const calendarName = CALENDAR_NAMES[calendarId] || 'Pose'
                  const timeAgo = getTimeAgo(booking.timestamp)
                  const calendarColors: { [key: string]: { bg: string; icon: string } } = {
                    'Pose': { bg: isDarkMode ? `${orangeColor}30` : `${orangeColor}20`, icon: orangeColor },
                    'SAV': { bg: isDarkMode ? '#10b98130' : '#10b98120', icon: '#10b981' },
                    'Metré': { bg: isDarkMode ? '#3b82f630' : '#3b82f620', icon: '#3b82f6' }
                }
                  const colors = calendarColors[calendarName] || calendarColors['Pose']
                  
                return (
                    <div key={booking.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                      gap: '12px',
                      padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: isDarkMode ? '#0a0a0a' : '#f9fafb',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f0f0f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#0a0a0a' : '#f9fafb'}
                onClick={() => navigate('/réservation', { state: { highlightBookingId: booking.id, calendarId } })}
                  >
                    <div style={{
                        padding: '6px',
                        borderRadius: '6px',
                      backgroundColor: colors.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                        <Calendar style={{ width: '14px', height: '14px', color: colors.icon }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                          fontSize: '13px',
                        fontWeight: 500,
                        color: textColor,
                          marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                          {booking.name} - {calendarName}
                      </p>
                      <p style={{
                          fontSize: '11px',
                        color: textSecondary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                          {booking.date} {booking.time && booking.time !== '21h00' ? `à ${booking.time}` : ''}
                      </p>
                    </div>
                    <div style={{
                        fontSize: '11px',
                      color: textSecondary,
                      whiteSpace: 'nowrap'
                    }}>
                        {timeAgo}
                    </div>
                  </div>
                )
                })
              )}
            </div>
          </div>

          {/* Top Clients (All Calendars) - Bottom Right */}
          <div style={{
            backgroundColor: cardBg,
            borderRadius: '16px',
            padding: '24px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            animation: 'fadeInRight 0.7s ease-out',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
          }}>
            <div style={{
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>
                Top 10 Concepteurs
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {topClientsView === 'week' && (
                  <span style={{ fontSize: '12px', color: textSecondary }}>
                    Semaine du {getCurrentWeekRangeLabel()}
                  </span>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setTopClientsView('total')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: `1px solid ${topClientsView === 'total' ? orangeColor : borderColor}`,
                      backgroundColor: topClientsView === 'total'
                        ? (isDarkMode ? `${orangeColor}20` : `${orangeColor}15`)
                        : 'transparent',
                      color: topClientsView === 'total' ? orangeColor : textSecondary,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Total
                  </button>
                  <button
                    onClick={() => setTopClientsView('month')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: `1px solid ${topClientsView === 'month' ? orangeColor : borderColor}`,
                      backgroundColor: topClientsView === 'month'
                        ? (isDarkMode ? `${orangeColor}20` : `${orangeColor}15`)
                        : 'transparent',
                      color: topClientsView === 'month' ? orangeColor : textSecondary,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Par mois
                  </button>
                  <button
                    onClick={() => setTopClientsView('week')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: `1px solid ${topClientsView === 'week' ? orangeColor : borderColor}`,
                      backgroundColor: topClientsView === 'week'
                        ? (isDarkMode ? `${orangeColor}20` : `${orangeColor}15`)
                        : 'transparent',
                      color: topClientsView === 'week' ? orangeColor : textSecondary,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Par semaine
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: '1' }}>
              {isLoadingTopClients ? (
                <div style={{ padding: '20px', textAlign: 'center', color: textSecondary }}>
                  Chargement...
                </div>
              ) : topClientsAll.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: textSecondary }}>
                  Aucun client
                </div>
              ) : (
                topClientsAll.map((client, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: isDarkMode ? '#0f1115' : '#f5f6fb',
                    border: `1px solid ${isDarkMode ? '#1f2933' : '#e5e7eb'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ fontSize: '14px', color: textColor, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '999px',
                        backgroundColor: isDarkMode ? `${orangeColor}25` : `${orangeColor}20`,
                        color: orangeColor,
                        fontSize: '12px',
                        fontWeight: 700
                      }}>
                        Pose: {client.pose}
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '999px',
                        backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        fontSize: '12px',
                        fontWeight: 700
                      }}>
                        SAV: {client.sav}
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '999px',
                        backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                        color: '#3b82f6',
                        fontSize: '12px',
                        fontWeight: 700
                      }}>
                        Metré: {client.metre}
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '10px',
                        backgroundColor: isDarkMode ? '#111827' : '#e5e7eb',
                        color: textColor,
                        fontSize: '12px',
                        fontWeight: 700,
                        border: `1px solid ${borderColor}`
                      }}>
                        Total: {client.total}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
                  </div>
                  </div>
        )}
      </div>
    </div>
  )
}

interface SidebarItemProps {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  title: string
  isActive: boolean
  open: boolean
  onClick: () => void
  isDarkMode: boolean
  orangeColor: string
  textColor: string
  textSecondary: string
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  Icon,
  title,
  isActive,
  open,
  onClick,
  isDarkMode,
  orangeColor,
  textColor,
  textSecondary
}) => {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 12px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: isActive
          ? (isDarkMode ? `${orangeColor}30` : `${orangeColor}15`)
          : 'transparent',
        color: isActive ? orangeColor : textSecondary,
        borderLeft: isActive ? `3px solid ${orangeColor}` : '3px solid transparent',
        transition: 'all 0.2s',
        fontSize: '14px',
        fontWeight: isActive ? 600 : 500
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
          e.currentTarget.style.color = textColor
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = textSecondary
        }
      }}
    >
      <Icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
      {open && <span>{title}</span>}
    </button>
  )
}

interface StatCardContentProps {
  title: string
  value: string
  change: string
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  iconBg: string
  iconColor: string
  cardBg: string
  textColor: string
  textSecondary: string
  borderColor: string
}

const StatCardContent: React.FC<StatCardContentProps> = ({
  title,
  value,
  change,
  Icon,
  iconBg,
  iconColor,
  cardBg,
  textColor,
  textSecondary,
  borderColor
}) => {
  return (
    <div style={{
      padding: '24px',
      borderRadius: '16px',
      border: `1px solid ${borderColor}`,
      backgroundColor: cardBg,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)'
      e.currentTarget.style.borderColor = borderColor === '#333333' ? '#444444' : '#d1d5db'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0) scale(1)'
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
      e.currentTarget.style.borderColor = borderColor
    }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{
          padding: '8px',
          backgroundColor: iconBg,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon style={{ width: '20px', height: '20px', color: iconColor }} />
        </div>
        <TrendingUp style={{ width: '16px', height: '16px', color: '#10b981' }} />
      </div>
      <h3 style={{
        fontSize: '14px',
        fontWeight: 500,
        color: textSecondary,
        marginBottom: '4px'
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '24px',
        fontWeight: 700,
        color: textColor,
        marginBottom: '4px'
      }}>
        {value}
      </p>
      <p style={{
        fontSize: '12px',
        color: '#10b981',
        marginTop: '4px'
      }}>
        {change}
      </p>
    </div>
  )
}

export default DashbordPage
