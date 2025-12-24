import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Calendar,
  CalendarCheck,
  ChevronsRight,
  Moon,
  Sun,
  Home,
  Settings,
  LogOut,
  Users,
  Bell,
  ClipboardList,
  ChevronDown,
  Minus,
  RefreshCw,
  Plus,
  Menu,
  X
} from 'lucide-react'
import './AdminPage.css'
import { getAllNotifications, getRecentUsersNotifications, NotificationItem, getTimeAgo as getNotificationTimeAgo } from '../services/notificationService'
import { getCalendarName } from '../services/bookingService'
import UserModal, { UserFormData } from '../components/UserModal'
import { getAllUsers, createUser, updateUser, deleteUser, UserRecord } from '../services/userService'

// UserRecord is now imported from userService

function UtilisateursPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [calendarsExpanded, setCalendarsExpanded] = useState<boolean>(true)
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)

  useEffect(() => {
    // Check if user is admin
    const user = sessionStorage.getItem('user')
    if (!user) {
      navigate('/login')
      return
    }
    
    const userData = JSON.parse(user)
    if (userData.role !== 'admin') {
      navigate('/')
      return
    }
    
    loadAllUsers()
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
    filterUsers()
  }, [users, selectedRole, searchTerm])

  // Load all notifications
  const loadNotifications = async () => {
    try {
      const notifications = await getAllNotifications()
      // Add user notifications - map UserRecord to expected format
      const usersForNotifications = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      }))
      const userNotifications = getRecentUsersNotifications(usersForNotifications)
      const combined = [...notifications, ...userNotifications].sort((a, b) => b.timestamp - a.timestamp)
      setAllNotifications(combined)
      setUnreadCount(combined.length)
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
  }, [users])

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

  const loadAllUsers = async () => {
    setLoading(true)
    try {
      const usersData = await getAllUsers(selectedRole !== 'all' ? selectedRole : undefined)
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des utilisateurs'
      alert(`Erreur: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Filter by role
    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole)
    }

    // Filter by search term (name, email, phone)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.phone && user.phone.includes(term))
      )
    }

    setFilteredUsers(filtered)
  }

  const formatDateTime = (timestamp: string): string => {
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
      'concepteur': 'Concepteur',
      'technicien': 'Technicien'
    }
    return roleLabels[role] || role
  }

  const getRoleBadgeColor = (role: string): string => {
    const roleColors: { [key: string]: string } = {
      'admin': '#fa541c',
      'concepteur': '#17a2b8',
      'technicien': '#28a745'
    }
    return roleColors[role] || '#6c757d'
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    navigate('/')
  }

  const handleCreateClick = () => {
    setEditingUser(null)
    setIsModalOpen(true)
  }

  const handleEditClick = (user: UserRecord) => {
    setEditingUser(user)
    setIsModalOpen(true)
  }

  const handleDeleteClick = async (user: UserRecord) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.name} (${user.email}) ?`)) {
      return
    }

    try {
      await deleteUser(user.id)
      alert('✅ Utilisateur supprimé avec succès')
      await loadAllUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      const errorMessage = error?.message || 'Erreur lors de la suppression de l\'utilisateur'
      alert(`❌ ${errorMessage}`)
    }
  }

  const handleModalSubmit = async (formData: UserFormData) => {
    try {
      if (editingUser) {
        // Update existing user
        const updateData: Partial<UserFormData> = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
        }
        
        // Only include password if it was provided
        if (formData.password) {
          updateData.password = formData.password
          updateData.confirm_password = formData.confirm_password
        }
        
        await updateUser(editingUser.id, updateData)
        alert('✅ Utilisateur modifié avec succès')
      } else {
        // Create new user
        await createUser(formData)
        alert('✅ Utilisateur créé avec succès')
      }
      setIsModalOpen(false)
      setEditingUser(null)
      await loadAllUsers()
    } catch (error: any) {
      console.error('Error saving user:', error)
      const errorMessage = error?.message || 'Erreur lors de l\'enregistrement de l\'utilisateur'
      alert(`❌ ${errorMessage}`)
    }
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
            <span style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>Utilisateurs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              data-notifications-dropdown
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              style={{
                position: 'relative',
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
              <Bell style={{ width: '18px', height: '18px' }} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  minWidth: '16px',
                  height: '16px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#ffffff',
                  padding: '0 3px'
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
            <button 
              onClick={handleLogout}
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
              <LogOut style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Notifications Dropdown */}
      {isMobile && notificationsOpen && (
        <div 
          data-notifications-dropdown
          style={{
            position: 'fixed',
            top: '60px',
            right: '16px',
            left: '16px',
            maxHeight: 'calc(100vh - 80px)',
            backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#333333' : '#e5e7eb'}`,
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            zIndex: 1001,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
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
            maxHeight: 'calc(100vh - 200px)',
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
              allNotifications.map((notification) => {
                const timeAgo = getNotificationTimeAgo(notification.timestamp)
                const getNotificationDetails = () => {
                  if (notification.type === 'booking') {
                    const booking = notification.data
                    return {
                      subtitle: `${booking.client_name} - ${getCalendarName(booking.calendar_id)}`,
                      details: `${booking.booking_date} ${booking.booking_time || ''}`,
                      onClick: () => {
                        setNotificationsOpen(false)
                        navigate('/réservation', { state: { highlightBookingId: booking.id, calendarId: booking.calendar_id } })
                      }
                    }
                  } else if (notification.type === 'holiday') {
                    const holiday = notification.data
                    const calendarName = getCalendarName(holiday.calendar_id)
                    const formatDate = (dateStr: string) => {
                      const date = new Date(dateStr)
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
                <h1>Administration - Utilisateurs</h1>
                <p>Gestion des utilisateurs</p>
              </div>
              <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
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
                    }}
                  >
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
                              return {
                                subtitle: `${user.name} (${getRoleLabel(user.role)})`,
                                details: user.email,
                                onClick: () => {
                                  setNotificationsOpen(false)
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
                              // Stay on current page for users
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
          <label htmlFor="role-filter">Rôle:</label>
          <select
            id="role-filter"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Administrateur</option>
            <option value="concepteur">Concepteur</option>
            <option value="technicien">Technicien</option>
          </select>
        </div>

        <div className="filter-group search-group">
          <label htmlFor="search">Rechercher:</label>
          <div style={{ position: 'relative', width: '100%', height: '42px', minHeight: '42px', maxHeight: '42px' }}>
            <input
              id="search"
              type="text"
              placeholder="Nom, email, téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', height: '42px', minHeight: '42px', maxHeight: '42px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <button className="refresh-button" onClick={loadAllUsers}>
          <RefreshCw className="refresh-icon" />
          Actualiser
        </button>
        <button className="create-button" onClick={handleCreateClick}>
          <Plus className="create-icon" />
          Nouvel utilisateur
        </button>
      </div>

      <main className="admin-main">
        {loading ? (
          <div className="loading-message">Chargement des utilisateurs...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="no-bookings">Aucun utilisateur trouvé</div>
        ) : (
          <>
            <div className="bookings-summary">
              <p>Total: {filteredUsers.length} utilisateur(s)</p>
            </div>
            <div className="bookings-table-container">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Rôle</th>
                    <th>Créé le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone || '-'}</td>
                      <td>
                        <span className="calendar-badge" style={{
                          backgroundColor: getRoleBadgeColor(user.role)
                        }}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td>{formatDateTime(user.created_at)}</td>
                      <td className="actions-cell">
                        <button
                          className="edit-button"
                          onClick={() => handleEditClick(user)}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteClick(user)}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingUser(null)
        }}
        onSubmit={handleModalSubmit}
        user={editingUser}
        isDarkMode={isDarkMode}
      />

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

export default UtilisateursPage

