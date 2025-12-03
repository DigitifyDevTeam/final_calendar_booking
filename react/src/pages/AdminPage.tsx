import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getAllBookings, BookingRecord, getCalendarName, CALENDAR_CONFIGS, updateBooking, deleteBooking, addBooking } from '../services/bookingService'
import { getAllNotifications, NotificationItem, getTimeAgo as getNotificationTimeAgo } from '../services/notificationService'
import { getAllUsers, UserRecord } from '../services/userService'
import AdminBookingModal, { AdminBookingFormData } from '../components/AdminBookingModal'
import {
  Calendar,
  CalendarCheck,
  ChevronsRight,
  Moon,
  Sun,
  Home,
  Settings,
  LogOut,
  ClipboardList,
  Bell,
  Users,
  ChevronDown,
  Minus,
  RefreshCw,
  Menu,
  X
} from 'lucide-react'
import './AdminPage.css'

function AdminPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [filteredBookings, setFilteredBookings] = useState<BookingRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedCalendar, setSelectedCalendar] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<string>('all') // 'all', 'today', 'future', 'past'
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingBooking, setEditingBooking] = useState<any | null>(null)
  const [calendarsExpanded, setCalendarsExpanded] = useState<boolean>(true)
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [infoBooking, setInfoBooking] = useState<any | null>(null)
  const [usersList, setUsersList] = useState<UserRecord[]>([])

  useEffect(() => {
    // Check if user is logged in (admin or regular user)
    const user = localStorage.getItem('user')
    if (!user) {
      navigate('/login')
      return
    }
    
    const userData = JSON.parse(user)
    setCurrentUser(userData)
    setIsAdmin(userData.role === 'admin')

    loadAllBookings()
    
    // Load users list for admin to select designer
    if (userData.role === 'admin') {
      loadUsersList()
    }
  }, [navigate])

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

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

  useEffect(() => {
    filterBookings()
  }, [bookings, selectedCalendar, searchTerm, dateFilter, currentUser, isAdmin])

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
  }, [bookings])

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

  const loadAllBookings = async () => {
    setLoading(true)
    try {
      // Load bookings from all calendars
      const allCalendars = Object.values(CALENDAR_CONFIGS)
      const allBookingsPromises = allCalendars.map(calendarId => 
        getAllBookings(calendarId).then(bookings => ({ calendarId, bookings }))
      )
      const results = await Promise.all(allBookingsPromises)
      
      // Flatten and add calendar info to each booking
      const allBookings: (BookingRecord & { calendarId: string })[] = []
      results.forEach(({ calendarId, bookings }) => {
        bookings.forEach(booking => {
          allBookings.push({ ...booking, calendarId })
        })
      })

      // Sort by date (newest first) and then by time
      allBookings.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date)
        if (dateCompare !== 0) return dateCompare
        return (b.time || '').localeCompare(a.time || '')
      })

      setBookings(allBookings as BookingRecord[])
    } catch (error) {
      console.error('Error loading bookings:', error)
      alert('Erreur lors du chargement des réservations')
    } finally {
      setLoading(false)
    }
  }

  const loadUsersList = async () => {
    try {
      const users = await getAllUsers()
      setUsersList(users)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  // Check if a booking belongs to the current user
  const isBookingOwnedByUser = (booking: any): boolean => {
    if (!currentUser) return false
    if (isAdmin) return true // Admin can see all bookings
    
    const userName = currentUser.name?.toLowerCase().trim() || ''
    const userEmail = currentUser.email?.toLowerCase().trim() || ''
    const userPhone = currentUser.phone?.trim() || ''
    
    // Match by client name, phone, or designer name
    const clientNameMatch = userName && booking.name?.toLowerCase().trim() === userName
    const phoneMatch = userPhone && booking.phone?.trim() === userPhone
    const designerMatch = userName && booking.designer?.toLowerCase().trim() === userName
    const emailInName = userEmail && (
      booking.name?.toLowerCase().includes(userEmail) ||
      booking.designer?.toLowerCase().includes(userEmail)
    )
    
    return clientNameMatch || phoneMatch || designerMatch || emailInName || false
  }

  const filterBookings = () => {
    let filtered = [...bookings]

    // For regular users, filter to show only their own bookings
    if (!isAdmin && currentUser) {
      filtered = filtered.filter(booking => isBookingOwnedByUser(booking))
    }

    // Filter by calendar
    if (selectedCalendar !== 'all') {
      filtered = filtered.filter((booking: any) => booking.calendarId === selectedCalendar)
    }

    // Filter by search term (name, phone, designer)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(booking =>
        booking.name.toLowerCase().includes(term) ||
        booking.phone.includes(term) ||
        booking.designer.toLowerCase().includes(term)
      )
    }

    // Filter by date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Use local date string to avoid timezone issues
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`

    if (dateFilter === 'today') {
      filtered = filtered.filter(booking => booking.date === todayStr)
    } else if (dateFilter === 'future') {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.date + 'T00:00:00')
        bookingDate.setHours(0, 0, 0, 0)
        return bookingDate >= today
      })
    } else if (dateFilter === 'past') {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.date + 'T00:00:00')
        bookingDate.setHours(0, 0, 0, 0)
        return bookingDate < today
      })
    }

    setFilteredBookings(filtered)
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  const getRoleLabel = (role: string): string => {
    const roleLabels: { [key: string]: string } = {
      'admin': 'Administrateur',
      'technicien': 'Technicien',
      'user': 'Utilisateur'
    }
    return roleLabels[role] || role
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
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
  const textColor = isDarkMode ? '#ffffff' : '#111827'
  const textSecondary = isDarkMode ? '#9ca3af' : '#6b7280'
  const borderColor = isDarkMode ? '#333333' : '#e5e7eb'


  const handleEditClick = (booking: any) => {
    // Check if user can edit this booking
    if (!isAdmin && !isBookingOwnedByUser(booking)) {
      alert('Vous ne pouvez modifier que vos propres réservations.')
      return
    }
    setEditingBooking(booking)
    setIsModalOpen(true)
  }

  const handleDeleteClick = async (booking: any) => {
    // Check if user can delete this booking
    if (!isAdmin && !isBookingOwnedByUser(booking)) {
      alert('Vous ne pouvez supprimer que vos propres réservations.')
      return
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la réservation de ${booking.name} pour le ${formatDate(booking.date)} ?`)) {
      return
    }

    try {
      await deleteBooking(booking.id)
      alert('Réservation supprimée avec succès')
      await loadAllBookings()
      loadNotifications() // Refresh notifications after deleting booking
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Erreur lors de la suppression de la réservation')
    }
  }

  const handleModalSubmit = async (formData: AdminBookingFormData) => {
    try {
      if (editingBooking) {
        // Update existing booking - include calendar_id for backend validation
        // Use the existing booking's calendar_id to prevent changing calendar
        const existingCalendarId = editingBooking.calendarId || formData.calendar_id
        const isPoseCalendar = existingCalendarId === CALENDAR_CONFIGS['calendar1']
        
        const updateData = {
          calendar_id: existingCalendarId,
          booking_date: formData.booking_date,
          booking_time: isPoseCalendar && !formData.booking_time ? '21h00' : (formData.booking_time || ''),
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          designer_name: formData.designer_name,
          message: formData.message || ''
        }
        await updateBooking(editingBooking.id, updateData)
        alert('Réservation modifiée avec succès')
      } else {
        // Create new booking
        const bookingData = {
          name: formData.client_name,
          phone: formData.client_phone,
          designer: formData.designer_name,
          message: formData.message,
          date: formData.booking_date,
          selectedDate: new Date(formData.booking_date),
          timeSlot: formData.booking_time || undefined
        }
        await addBooking(bookingData, formData.calendar_id)
        alert('Réservation créée avec succès')
      }
      setIsModalOpen(false)
      setEditingBooking(null)
      await loadAllBookings()
      loadNotifications() // Refresh notifications after creating/updating booking
    } catch (error: any) {
      console.error('Error saving booking:', error)
      const errorMessage = error?.message || 'Erreur lors de l\'enregistrement de la réservation'
      alert(`❌ ${errorMessage}`)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: bgColor }}>
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
            <span style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>Réservations</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          <AdminSidebarItem
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
          
          <AdminSidebarItem
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
          
          <AdminSidebarItem
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
          
          <AdminSidebarItem
            Icon={Users}
            title="Utilisateurs"
            isActive={location.pathname === '/utilisateurs'}
            open={sidebarOpen}
            onClick={() => navigate('/utilisateurs')}
            isDarkMode={isDarkMode}
            orangeColor={orangeColor}
            textColor={textColor}
            textSecondary={textSecondary}
          />
          
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
          
          {calendarsExpanded && (
            <div style={{ paddingLeft: '20px' }}>
              <AdminSidebarItem
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
              <AdminSidebarItem
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
              <AdminSidebarItem
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
            <AdminSidebarItem
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
            <AdminSidebarItem
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
          <AdminSidebarItem
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
      
      <div style={{ flex: 1, overflow: 'auto', backgroundColor: bgColor, paddingTop: isMobile ? '60px' : '0' }}>
        <div className={`admin-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
          <header className="admin-header">
            <div className="header-content">
              <div>
                <h1>{isAdmin ? 'Administration - Réservations' : 'Mes Réservations'}</h1>
                <p>{isAdmin ? 'Gestion des réservations' : 'Vos réservations personnelles'}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
                <button 
                  data-notifications-dropdown
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  style={{
                    position: 'relative',
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#333333' : '#e5e7eb'}`,
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#111827'
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280'
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff'
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
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#333333' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{
                      padding: '16px',
                      borderBottom: `1px solid ${isDarkMode ? '#333333' : '#e5e7eb'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 600,
                        color: isDarkMode ? '#ffffff' : '#111827'
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
                          color: isDarkMode ? '#9ca3af' : '#6b7280'
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
                                details: `${formatDate(booking.date)} ${booking.time && booking.time !== '21h00' ? `à ${booking.time}` : ''}`,
                                onClick: () => {
                                  setNotificationsOpen(false)
                                  navigate('/réservation')
                                }
                              }
                            } else if (notification.type === 'holiday') {
                              const holiday = notification.data as any
                              const calendarName = getCalendarName(holiday.calendarId)
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
                                borderBottom: `1px solid ${isDarkMode ? '#2a2a2a' : '#f0f0f0'}`,
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
                                    color: isDarkMode ? '#ffffff' : '#111827',
                                    marginBottom: '4px'
                                  }}>
                                    {notification.title}
                                  </div>
                                  <div style={{
                                    fontSize: '13px',
                                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                                    marginBottom: '4px'
                                  }}>
                                    {details.subtitle}
                                  </div>
                                  <div style={{
                                    fontSize: '12px',
                                    color: isDarkMode ? '#6b7280' : '#9ca3af'
                                  }}>
                                    {details.details}
                                  </div>
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  color: isDarkMode ? '#6b7280' : '#9ca3af',
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
                        borderTop: `1px solid ${isDarkMode ? '#333333' : '#e5e7eb'}`,
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
                            color: '#fa541c',
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
                    border: `1px solid ${isDarkMode ? '#333333' : '#e5e7eb'}`,
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#111827'
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280'
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff'
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
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#333333' : '#e5e7eb'}`,
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#111827'
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280'
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff'
                  }}
                >
                  <LogOut style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
            </div>
          </header>

      <div className="admin-filters">
        <div className="filter-group">
          <label htmlFor="calendar-filter">Calendrier:</label>
          <select
            id="calendar-filter"
            value={selectedCalendar}
            onChange={(e) => setSelectedCalendar(e.target.value)}
          >
            <option value="all">Tous les calendriers</option>
            <option value={CALENDAR_CONFIGS['calendar1']}>Pose</option>
            <option value={CALENDAR_CONFIGS['calendar2']}>SAV</option>
            <option value={CALENDAR_CONFIGS['calendar3']}>Metré</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="date-filter">Date:</label>
          <select
            id="date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">Toutes les dates</option>
            <option value="today">Aujourd'hui</option>
            <option value="future">Futures</option>
            <option value="past">Passées</option>
          </select>
        </div>

        <div className="filter-group search-group">
          <label htmlFor="search">Rechercher:</label>
          <div style={{ position: 'relative', width: '100%', height: '42px', minHeight: '42px', maxHeight: '42px' }}>
            <input
              id="search"
              type="text"
              placeholder="Nom, téléphone, concepteur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', height: '42px', minHeight: '42px', maxHeight: '42px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <button className="refresh-button" onClick={loadAllBookings}>
          <RefreshCw className="refresh-icon" />
          Actualiser
        </button>
      </div>

      <main className="admin-main">
        {loading ? (
          <div className="loading-message">Chargement des réservations...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="no-bookings">Aucune réservation trouvée</div>
        ) : (
          <>
            <div className="bookings-summary">
              <p>Total: {filteredBookings.length} réservation(s)</p>
            </div>
            <div className="bookings-table-container">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Heure</th>
                    <th>Calendrier</th>
                    <th>Client</th>
                    <th>Téléphone</th>
                    <th>Concepteur</th>
                    <th>Message</th>
                    <th>Créé le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking: any) => (
                    <tr key={booking.id}>
                      <td>{formatDate(booking.date)}</td>
                      <td className="time-slot-cell">
                        {booking.time && booking.time !== '21h00' ? booking.time : '-'}
                      </td>
                      <td>
                        <span className="calendar-badge">
                          {getCalendarName(booking.calendarId)}
                        </span>
                      </td>
                      <td>{booking.name}</td>
                      <td>{booking.phone}</td>
                      <td>{booking.designer}</td>
                      <td className="message-cell">
                        {booking.message || <span className="no-message">-</span>}
                      </td>
                      <td>{formatDateTime(booking.timestamp)}</td>
                      <td className="actions-cell">
                        {isAdmin || isBookingOwnedByUser(booking) ? (
                          <>
                        <button
                          className="edit-button"
                          onClick={() => handleEditClick(booking)}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteClick(booking)}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                          </>
                        ) : (
                          <span style={{ color: isDarkMode ? '#6b7280' : '#9ca3af', fontSize: '12px' }}>
                            Non autorisé
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      <AdminBookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingBooking(null)
        }}
        onSubmit={handleModalSubmit}
        booking={editingBooking}
        isDarkMode={isDarkMode}
        users={isAdmin ? usersList : []}
      />

      {/* Info Modal */}
      {infoBooking && (
        <div 
          className={`admin-booking-modal-overlay ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
          onClick={() => setInfoBooking(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="admin-booking-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#111827' }}>Détails de la réservation</h2>
              <button
                onClick={() => setInfoBooking(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
        </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <strong style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '12px' }}>Date:</strong>
                <p style={{ margin: '4px 0 0 0', color: isDarkMode ? '#ffffff' : '#111827' }}>{formatDate(infoBooking.date)}</p>
              </div>
              {infoBooking.time && infoBooking.time !== '21h00' && (
                <div>
                  <strong style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '12px' }}>Heure:</strong>
                  <p style={{ margin: '4px 0 0 0', color: isDarkMode ? '#ffffff' : '#111827' }}>{infoBooking.time}</p>
                </div>
              )}
              <div>
                <strong style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '12px' }}>Calendrier:</strong>
                <p style={{ margin: '4px 0 0 0', color: isDarkMode ? '#ffffff' : '#111827' }}>{getCalendarName(infoBooking.calendarId)}</p>
              </div>
              <div>
                <strong style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '12px' }}>Client:</strong>
                <p style={{ margin: '4px 0 0 0', color: isDarkMode ? '#ffffff' : '#111827' }}>{infoBooking.name}</p>
              </div>
              <div>
                <strong style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '12px' }}>Téléphone:</strong>
                <p style={{ margin: '4px 0 0 0', color: isDarkMode ? '#ffffff' : '#111827' }}>{infoBooking.phone}</p>
              </div>
              <div>
                <strong style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '12px' }}>Concepteur:</strong>
                <p style={{ margin: '4px 0 0 0', color: isDarkMode ? '#ffffff' : '#111827' }}>{infoBooking.designer}</p>
              </div>
              {infoBooking.message && (
                <div>
                  <strong style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '12px' }}>Message:</strong>
                  <p style={{ margin: '4px 0 0 0', color: isDarkMode ? '#ffffff' : '#111827', whiteSpace: 'pre-wrap' }}>{infoBooking.message}</p>
                </div>
              )}
              <div>
                <strong style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '12px' }}>Créé le:</strong>
                <p style={{ margin: '4px 0 0 0', color: isDarkMode ? '#ffffff' : '#111827' }}>{formatDateTime(infoBooking.timestamp)}</p>
              </div>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setInfoBooking(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${isDarkMode ? '#333333' : '#e5e7eb'}`,
                  backgroundColor: 'transparent',
                  color: isDarkMode ? '#ffffff' : '#111827',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  )
}

interface AdminSidebarItemProps {
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

const AdminSidebarItem: React.FC<AdminSidebarItemProps> = ({
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

export default AdminPage

