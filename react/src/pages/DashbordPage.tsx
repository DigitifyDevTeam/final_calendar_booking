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
  Percent
} from 'lucide-react'

function DashbordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
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
  const [chartData, setChartData] = useState<Array<{ month: string; Metré: number; Pose: number; SAV: number }>>([])
  const [bookingRate, setBookingRate] = useState<number>(0)
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    
    // Check if user is admin
    const user = localStorage.getItem('user')
    if (user) {
      const userData = JSON.parse(user)
      setIsAdmin(userData.role === 'admin')
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
        const savCount = bookingArrays[1]?.length || 0 // calendar2 = SAV
        const metreCount = bookingArrays[2]?.length || 0 // calendar3 = Metré
        
        setTotalBookings(allBookings.length)
        setPoseBookings(poseCount)
        setSavBookings(savCount)
        setMetreBookings(metreCount)

        // Calculate booking rate (percentage of days with bookings in current month)
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        const daysPassed = now.getDate()
        
        const bookingsThisMonth = allBookings.filter(booking => {
          const bookingDate = new Date(booking.date)
          return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear
        })
        
        // Calculate unique days with bookings
        const uniqueDaysWithBookings = new Set(
          bookingsThisMonth.map(b => b.date)
        ).size
        
        const rate = daysPassed > 0 ? Math.round((uniqueDaysWithBookings / daysPassed) * 100) : 0
        setBookingRate(rate)

        // Generate chart data from real bookings (from first to last booking date)
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
        const chartMonths: Array<{ month: string; Metré: number; Pose: number; SAV: number }> = []
        
        if (allBookings.length === 0) {
          setChartData([])
        } else {
          // Find the earliest and latest booking dates
          let earliestDate: Date | null = null
          let latestDate: Date | null = null
          
          allBookings.forEach(booking => {
            const dateParts = booking.date.split('-')
            if (dateParts.length === 3) {
              const bookingDate = new Date(
                parseInt(dateParts[0], 10),
                parseInt(dateParts[1], 10) - 1,
                parseInt(dateParts[2], 10)
              )
              if (!earliestDate || bookingDate < earliestDate) {
                earliestDate = bookingDate
              }
              if (!latestDate || bookingDate > latestDate) {
                latestDate = bookingDate
              }
            }
          })
          
          if (earliestDate !== null && latestDate !== null) {
            // Generate months from earliest to latest
            const firstDate = earliestDate as Date
            const lastDate = latestDate as Date
            const startMonth = firstDate.getMonth()
            const startYear = firstDate.getFullYear()
            const endMonth = lastDate.getMonth()
            const endYear = lastDate.getFullYear()
            
            // Calculate total months to display
            let currentMonth = startMonth
            let currentYear = startYear
            
            while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
              const month = currentMonth
              const year = currentYear
              
              const monthBookings = allBookings.filter(booking => {
                const dateParts = booking.date.split('-')
                if (dateParts.length === 3) {
                  const bookingYear = parseInt(dateParts[0], 10)
                  const bookingMonth = parseInt(dateParts[1], 10) - 1
                  return bookingMonth === month && bookingYear === year
                }
                return false
              })
              
              const metreMonthCount = monthBookings.filter(b => (b as any).calendarId === 'calendar3').length
              const poseMonthCount = monthBookings.filter(b => (b as any).calendarId === 'calendar1').length
              const savMonthCount = monthBookings.filter(b => (b as any).calendarId === 'calendar2').length
              
              // Show month with year if spanning multiple years
              const monthLabel = startYear !== endYear 
                ? `${monthNames[month]} ${year.toString().slice(-2)}`
                : monthNames[month]
              
              chartMonths.push({
                month: monthLabel,
                Metré: metreMonthCount,
                Pose: poseMonthCount,
                SAV: savMonthCount
              })
              
              // Move to next month
              currentMonth++
              if (currentMonth > 11) {
                currentMonth = 0
                currentYear++
              }
            }
          }
          
          setChartData(chartMonths)
        }

        // Process recent bookings (top 5 most recent)
        const sortedBookings = allBookings
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5)
        setRecentBookings(sortedBookings)

        // Process top clients (real data only)
        const clientCounts: { [key: string]: number } = {}
        allBookings.forEach(booking => {
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
      } catch (error) {
        console.error('Error loading bookings data:', error)
        setTopClients([])
      } finally {
        setIsLoadingBookings(false)
        setIsLoadingTopClients(false)
      }
    }

    loadBookingsData()
  }, [])

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
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
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

  // Calculate max value for chart
  const maxValue = chartData.length > 0 
    ? Math.max(...chartData.flatMap(d => [d.Metré, d.Pose, d.SAV]), 1) + 2 
    : 10

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
    localStorage.removeItem('user')
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
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: bgColor }}>
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
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: sidebarOpen ? '256px' : '64px',
          borderRight: `1px solid ${borderColor}`,
          backgroundColor: isDarkMode ? '#000000' : '#ffffff',
          padding: '8px',
                paddingBottom: '60px',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
          
          {isAdmin && calendarsExpanded && (
            <div style={{ paddingLeft: '20px' }}>
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
                title="SAV"
                isActive={location.pathname === '/sav'}
                open={sidebarOpen}
                onClick={() => navigate('/sav')}
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
      <div style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: bgColor,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {location.pathname === '/calendrier' ? (
          <HomePage disableAnimations={true} isAdminView={true} />
        ) : location.pathname === '/metre' ? (
          <Calendar3Page disableAnimations={true} isAdminView={true} />
        ) : location.pathname === '/pose' ? (
          <Calendar1Page disableAnimations={true} isAdminView={true} />
        ) : location.pathname === '/sav' ? (
          <Calendar2Page disableAnimations={true} isAdminView={true} />
        ) : (
          <div style={{
            padding: '24px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
              marginBottom: '32px',
              animation: 'fadeInDown 0.5s ease-out'
        }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
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
                style={{
                  position: 'absolute',
                  top: '50px',
                  right: '0',
                  width: '380px',
                  maxHeight: '500px',
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                  zIndex: 1000,
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
                              navigate('/réservation')
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
          animation: 'fadeInUp 0.6s ease-out'
        }}>
          <StatCardContent
            title="Taux de réservation"
            value={`${bookingRate} %`}
            change="Jours avec réservations ce mois"
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
            change={`Pose: ${poseBookings} | Metré: ${metreBookings}  | SAV: ${savBookings}`}
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gridTemplateRows: 'auto auto',
          gap: '32px',
          animation: 'fadeInUp 0.8s ease-out',
          flex: 1,
          minHeight: 0
        }}>
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
            <h3 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: textColor,
              marginBottom: '20px'
            }}>
              Évolution des Réservations
            </h3>
            
            {/* Legend */}
            <div style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
                }}></div>
                <span style={{ fontSize: '14px', color: textSecondary }}>Metré</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: orangeColor,
                  boxShadow: `0 0 8px ${orangeColor}50`
                }}></div>
                <span style={{ fontSize: '14px', color: textSecondary }}>Pose</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)'
                }}></div>
                <span style={{ fontSize: '14px', color: textSecondary }}>SAV</span>
              </div>
            </div>

            {/* Chart */}
            <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: '400px' }}>
              {chartData.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '400px',
                  color: textSecondary,
                  fontSize: '16px',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <Calendar style={{ width: '48px', height: '48px', opacity: 0.5 }} />
                  <span>Aucune réservation pour afficher le graphique</span>
                </div>
              ) : (
              <svg width="100%" height="100%" style={{ overflow: 'visible' }} viewBox="0 0 900 400" preserveAspectRatio="xMidYMid meet">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const y = (i / 5) * 380 + 10
                  return (
                    <line
                      key={`grid-${i}`}
                      x1="60"
                      y1={y}
                      x2="860"
                      y2={y}
                      stroke={borderColor}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.3"
                      style={{
                        animation: chartAnimation ? `fadeIn 0.5s ease-out ${i * 0.1}s both` : 'none'
                      }}
                    />
                  )
                })}

                {/* Y-axis labels */}
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const value = Math.round((maxValue / 5) * (5 - i))
                  const y = (i / 5) * 380 + 10
                  return (
                    <text
                      key={`y-label-${i}`}
                      x="55"
                      y={y + 4}
                      textAnchor="end"
                      fontSize="12"
                      fill={textSecondary}
                      style={{
                        animation: chartAnimation ? `fadeIn 0.5s ease-out ${i * 0.1}s both` : 'none'
                      }}
                    >
                      {value}
                    </text>
                  )
                })}

                {/* Chart area */}
                <g transform="translate(60, 10)">
                  {chartData.length > 0 && chartData.map((data, index) => {
                    const chartWidth = 800
                    const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                    const x = (index / divisor) * chartWidth
                    
                    return (
                      <g key={`month-${index}`}>
                        {/* X-axis labels */}
                        <text
                          x={x}
                          y="395"
                          textAnchor="middle"
                          fontSize="13"
                          fill={textSecondary}
                          style={{
                            animation: chartAnimation ? `fadeInUp 0.5s ease-out ${0.6 + index * 0.1}s both` : 'none'
                          }}
                        >
                          {data.month}
                        </text>
                      </g>
                    )
                  })}

                  {/* Metré line - offset up when overlapping */}
                  {chartData.length > 0 && (
                    <path
                      d={(() => {
                        const chartWidth = 800
                        const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                        const points = chartData.map((data, index) => {
                          const x = (index / divisor) * chartWidth
                          const baseY = 380 - (data.Metré / maxValue) * 380
                          // Add offset when overlapping with other values
                          let offset = 0
                          if (data.Metré === data.Pose || data.Metré === data.SAV) offset = -8
                          const y = Math.max(5, baseY + offset)
                          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                        }).join(' ')
                        return points || 'M 0 380'
                      })()}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: chartAnimation ? '1000' : '0',
                        strokeDashoffset: chartAnimation ? '0' : '1000',
                        transition: 'stroke-dashoffset 2s ease-out',
                        filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))'
                      }}
                    />
                  )}

                  {/* Pose line - no offset (middle) */}
                  {chartData.length > 0 && (
                    <path
                      d={(() => {
                        const chartWidth = 800
                        const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                        const points = chartData.map((data, index) => {
                          const x = (index / divisor) * chartWidth
                          const y = 380 - (data.Pose / maxValue) * 380
                          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                        }).join(' ')
                        return points || 'M 0 380'
                      })()}
                      fill="none"
                      stroke={orangeColor}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: chartAnimation ? '1000' : '0',
                        strokeDashoffset: chartAnimation ? '0' : '1000',
                        transition: 'stroke-dashoffset 2s ease-out 0.3s',
                        filter: `drop-shadow(0 0 4px ${orangeColor}50)`
                      }}
                    />
                  )}

                  {/* SAV line - offset down when overlapping */}
                  {chartData.length > 0 && (
                    <path
                      d={(() => {
                        const chartWidth = 800
                        const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                        const points = chartData.map((data, index) => {
                          const x = (index / divisor) * chartWidth
                          const baseY = 380 - (data.SAV / maxValue) * 380
                          // Add offset when overlapping with other values
                          let offset = 0
                          if (data.SAV === data.Pose || data.SAV === data.Metré) offset = 8
                          const y = Math.min(378, baseY + offset)
                          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                        }).join(' ')
                        return points || 'M 0 380'
                      })()}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: chartAnimation ? '1000' : '0',
                        strokeDashoffset: chartAnimation ? '0' : '1000',
                        transition: 'stroke-dashoffset 2s ease-out 0.6s',
                        filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))'
                      }}
                    />
                  )}

                  {/* Data points with combined hover */}
                  {chartData.length > 0 && chartData.map((data, index) => {
                    const chartWidth = 800
                    const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                    const x = (index / divisor) * chartWidth
                    const delay = 0.8 + index * 0.1
                    const isHovered = hoveredMonth === index
                    
                    // Calculate Y positions with offsets for overlapping values
                    const metreY = 380 - (data.Metré / maxValue) * 380
                    const poseY = 380 - (data.Pose / maxValue) * 380
                    const savY = 380 - (data.SAV / maxValue) * 380
                    
                    // Offset points when overlapping
                    const metreOffset = (data.Metré === data.Pose || data.Metré === data.SAV) ? -8 : 0
                    const savOffset = (data.SAV === data.Pose || data.SAV === data.Metré) ? 8 : 0
                    
                    return (
                      <g 
                        key={`points-${index}`}
                        onMouseEnter={() => setHoveredMonth(index)}
                        onMouseLeave={() => setHoveredMonth(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Invisible hover zone for the entire column */}
                        <rect
                          x={x - 30}
                          y={0}
                          width={60}
                          height={380}
                          fill="transparent"
                        />
                        
                        {/* Vertical hover line */}
                        {isHovered && (
                          <line
                            x1={x}
                            y1={10}
                            x2={x}
                            y2={380}
                            stroke={isDarkMode ? '#ffffff20' : '#00000015'}
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />
                        )}
                        
                        {/* Metré point */}
                        <circle
                          cx={x}
                          cy={Math.max(5, metreY + metreOffset)}
                          r={isHovered ? 8 : 6}
                          fill="#3b82f6"
                          stroke={isHovered ? '#ffffff' : 'none'}
                          strokeWidth="2"
                          style={{
                            opacity: chartAnimation ? 1 : 0,
                            transform: chartAnimation ? 'scale(1)' : 'scale(0)',
                            transformOrigin: 'center',
                            transition: `all 0.3s ease-out ${delay}s`,
                            filter: isHovered 
                              ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 1))' 
                              : 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.8))'
                          }}
                        />
                        
                        {/* Pose point */}
                        <circle
                          cx={x}
                          cy={poseY}
                          r={isHovered ? 8 : 6}
                          fill={orangeColor}
                          stroke={isHovered ? '#ffffff' : 'none'}
                          strokeWidth="2"
                          style={{
                            opacity: chartAnimation ? 1 : 0,
                            transform: chartAnimation ? 'scale(1)' : 'scale(0)',
                            transformOrigin: 'center',
                            transition: `all 0.3s ease-out ${delay + 0.1}s`,
                            filter: isHovered 
                              ? `drop-shadow(0 0 10px ${orangeColor})` 
                              : `drop-shadow(0 0 6px ${orangeColor}80)`
                          }}
                        />
                        
                        {/* SAV point */}
                        <circle
                          cx={x}
                          cy={Math.min(378, savY + savOffset)}
                          r={isHovered ? 8 : 6}
                          fill="#10b981"
                          stroke={isHovered ? '#ffffff' : 'none'}
                          strokeWidth="2"
                          style={{
                            opacity: chartAnimation ? 1 : 0,
                            transform: chartAnimation ? 'scale(1)' : 'scale(0)',
                            transformOrigin: 'center',
                            transition: `all 0.3s ease-out ${delay + 0.2}s`,
                            filter: isHovered 
                              ? 'drop-shadow(0 0 10px rgba(16, 185, 129, 1))' 
                              : 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.8))'
                          }}
                        />
                        
                        {/* Combined tooltip */}
                        {isHovered && (
                          <g>
                            {/* Tooltip background */}
                            <rect
                              x={x - 70}
                              y={Math.min(metreY, poseY, savY) - 90}
                              width={140}
                              height={80}
                              rx="8"
                              fill={isDarkMode ? '#1a1a1a' : '#ffffff'}
                              stroke={isDarkMode ? '#333333' : '#e5e7eb'}
                              strokeWidth="1"
                              style={{
                                filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))'
                              }}
                            />
                            {/* Month title */}
                            <text
                              x={x}
                              y={Math.min(metreY, poseY, savY) - 68}
                              textAnchor="middle"
                              fontSize="12"
                              fontWeight="600"
                              fill={isDarkMode ? '#ffffff' : '#111827'}
                            >
                              {data.month}
                            </text>
                            {/* Metré value */}
                            <text
                              x={x - 55}
                              y={Math.min(metreY, poseY, savY) - 48}
                              fontSize="11"
                              fill="#3b82f6"
                              fontWeight="500"
                            >
                              ● Metré: {data.Metré}
                            </text>
                            {/* Pose value */}
                            <text
                              x={x - 55}
                              y={Math.min(metreY, poseY, savY) - 32}
                              fontSize="11"
                              fill={orangeColor}
                              fontWeight="500"
                            >
                              ● Pose: {data.Pose}
                            </text>
                            {/* SAV value */}
                            <text
                              x={x - 55}
                              y={Math.min(metreY, poseY, savY) - 16}
                              fontSize="11"
                              fill="#10b981"
                              fontWeight="500"
                            >
                              ● SAV: {data.SAV}
                            </text>
                          </g>
                        )}
                      </g>
                    )
                  })}
                </g>

                {/* Y-axis */}
                <line
                  x1="60"
                  y1="10"
                  x2="60"
                  y2="390"
                  stroke={borderColor}
                  strokeWidth="2"
                  style={{
                    animation: chartAnimation ? 'fadeIn 0.5s ease-out' : 'none'
                  }}
                />

                {/* X-axis */}
                <line
                  x1="60"
                  y1="390"
                  x2="860"
                  y2="390"
                  stroke={borderColor}
                  strokeWidth="2"
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: textColor
              }}>
                Top 10 Clients
              </h3>
              <button style={{
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
                    onClick={() => navigate('/réservation')}
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
