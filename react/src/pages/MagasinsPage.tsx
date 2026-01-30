import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Calendar,
  CalendarCheck,
  ChevronsRight,
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
  X,
  Store
} from 'lucide-react'
import './AdminPage.css'
import { getAllNotifications, NotificationItem, getTimeAgo as getNotificationTimeAgo } from '../services/notificationService'
import { getCalendarName } from '../services/bookingService'
import MagasinModal, { MagasinFormData } from '../components/MagasinModal'
import { getAllMagasins, createMagasin, updateMagasin, deleteMagasin, MagasinRecord } from '../services/magasinService'
import { getAllUsers, UserRecord } from '../services/userService'

function MagasinsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [magasins, setMagasins] = useState<MagasinRecord[]>([])
  const [filteredMagasins, setFilteredMagasins] = useState<MagasinRecord[]>([])
  const [concepteurs, setConcepteurs] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isDarkMode] = useState<boolean>(() => {
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
  const [editingMagasin, setEditingMagasin] = useState<MagasinRecord | null>(null)

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
    
    loadAllMagasins()
    loadConcepteurs()
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
    filterMagasins()
  }, [magasins, searchTerm])

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
    const interval = setInterval(loadNotifications, 60000)
    const handleRefresh = () => loadNotifications()
    window.addEventListener('notificationRefresh', handleRefresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('notificationRefresh', handleRefresh)
    }
  }, [])

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

  const loadAllMagasins = async () => {
    setLoading(true)
    try {
      const magasinsData = await getAllMagasins()
      setMagasins(magasinsData)
    } catch (error) {
      console.error('Error loading magasins:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des magasins'
      alert(`Erreur: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const loadConcepteurs = async () => {
    try {
      const usersData = await getAllUsers('concepteur')
      setConcepteurs(usersData)
    } catch (error) {
      console.error('Error loading concepteurs:', error)
    }
  }

  const filterMagasins = () => {
    let filtered = [...magasins]

    // Filter by search term (name)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(magasin =>
        magasin.name.toLowerCase().includes(term)
      )
    }

    setFilteredMagasins(filtered)
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

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    navigate('/')
  }

  const handleCreateClick = () => {
    setEditingMagasin(null)
    setIsModalOpen(true)
  }

  const handleEditClick = (magasin: MagasinRecord) => {
    setEditingMagasin(magasin)
    setIsModalOpen(true)
  }

  const handleDeleteClick = async (magasin: MagasinRecord) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le magasin "${magasin.name}" ?`)) {
      return
    }

    try {
      await deleteMagasin(magasin.id)
      alert('✅ Magasin supprimé avec succès')
      await loadAllMagasins()
    } catch (error: any) {
      console.error('Error deleting magasin:', error)
      const errorMessage = error?.message || 'Erreur lors de la suppression du magasin'
      alert(`❌ ${errorMessage}`)
    }
  }

  const handleModalSubmit = async (formData: MagasinFormData) => {
    try {
      if (editingMagasin) {
        await updateMagasin(editingMagasin.id, formData)
        alert('✅ Magasin modifié avec succès')
      } else {
        await createMagasin(formData)
        alert('✅ Magasin créé avec succès')
      }
      setIsModalOpen(false)
      setEditingMagasin(null)
      await loadAllMagasins()
    } catch (error: any) {
      console.error('Error saving magasin:', error)
      const errorMessage = error?.message || 'Erreur lors de l\'enregistrement du magasin'
      alert(`❌ ${errorMessage}`)
    }
  }

  // Accent color applied via CSS variable (no local state needed)
  useEffect(() => {
    const handleSettingsUpdate = () => {
      const saved = localStorage.getItem('accentColor')
      if (saved) {
        document.documentElement.style.setProperty('--accent-color', saved)
      }
    }
    
    window.addEventListener('settingsUpdated', handleSettingsUpdate)
    window.addEventListener('storage', handleSettingsUpdate)
    
    const saved = localStorage.getItem('accentColor')
    if (saved) {
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
  const borderColor = isDarkMode ? '#BA4E8E' : '#e5e7eb'

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
            top: '60px',
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
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
            borderBottom: `1px solid ${borderColor}`,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 999,
            height: '60px'
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: textColor,
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: textColor }}>Magasins</h1>
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
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    minWidth: '16px',
                    height: '16px',
                    backgroundColor: '#284B73',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#ffffff',
                    padding: '0 3px'
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
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
            border: `1px solid ${isDarkMode ? '#BA4E8E' : '#e5e7eb'}`,
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
            borderBottom: `1px solid ${isDarkMode ? '#BA4E8E' : '#e5e7eb'}`,
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
                color: '#284B73',
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
                    const booking = notification.data as { client_name?: string; calendar_id?: string; booking_date?: string; booking_time?: string; id?: number }
                    return {
                      subtitle: `${booking.client_name ?? ''} - ${getCalendarName(booking.calendar_id ?? '')}`,
                      details: `${booking.booking_date ?? ''} ${booking.booking_time ?? ''}`,
                      onClick: () => {
                        setNotificationsOpen(false)
                        navigate('/réservation', { state: { highlightBookingId: booking.id, calendarId: booking.calendar_id } })
                      }
                    }
                  } else if (notification.type === 'holiday') {
                    const holiday = notification.data as { calendar_id?: string; holiday_date?: string }
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
                      subtitle: `${getCalendarName(holiday.calendar_id ?? '')} - ${holiday.holiday_date ? formatDate(holiday.holiday_date) : ''}`,
                      details: 'Jour férié ajouté',
                      onClick: () => {
                        setNotificationsOpen(false)
                        navigate('/jours-feries')
                      }
                    }
                  } else if (notification.type === 'user') {
                    const user = notification.data as { name?: string; role?: string; email?: string }
                    return {
                      subtitle: `${user.name ?? ''} (${user.role ?? ''})`,
                      details: user.email ?? '',
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
              borderTop: `1px solid ${isDarkMode ? '#BA4E8E' : '#e5e7eb'}`,
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
                  color: '#284B73',
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
          top: isMobile ? '60px' : 0,
          left: 0,
          height: isMobile ? 'calc(100vh - 60px)' : '100vh',
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(40, 75, 115, 0.3)',
            overflow: 'hidden'
          }}>
            <img
              src="/favicon.svg"
              alt="Logo"
              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
            />
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
            textColor={textColor}
            textSecondary={textSecondary}
          />
          
          <AdminSidebarItem
            Icon={Store}
            title="Magasins"
            isActive={location.pathname === '/magasins'}
            open={sidebarOpen}
            onClick={() => navigate('/magasins')}
            isDarkMode={isDarkMode}
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
              Icon={Settings}
              title="Paramètres"
              isActive={location.pathname === '/parametres'}
              open={sidebarOpen}
              onClick={() => navigate('/parametres')}
              isDarkMode={isDarkMode}
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
                <h1>Administration - Magasins</h1>
                <p>Gestion des magasins</p>
              </div>
              <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '16px' }}>
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
                    <span
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        minWidth: '16px',
                        height: '16px',
                        backgroundColor: '#284B73',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#ffffff',
                        padding: '0 3px'
                      }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                <button 
                  onClick={handleLogout}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                    border: `1px solid ${borderColor}`,
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </header>

          <div className="admin-filters">
            <div className="filter-group search-group">
              <label htmlFor="search">Rechercher:</label>
              <input
                id="search"
                type="text"
                placeholder="Nom du magasin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button className="refresh-button" onClick={loadAllMagasins}>
              <RefreshCw className="refresh-icon" />
              Actualiser
            </button>
            <button className="create-button" onClick={handleCreateClick}>
              <Plus className="create-icon" />
              Nouveau magasin
            </button>
          </div>

          <main className="admin-main">
            {loading ? (
              <div className="loading-message">Chargement des magasins...</div>
            ) : filteredMagasins.length === 0 ? (
              <div className="no-bookings">Aucun magasin trouvé</div>
            ) : (
              <>
                <div className="bookings-summary">
                  <p>Total: {filteredMagasins.length} magasin(s)</p>
                </div>
                <div className="bookings-table-container">
                  <table className="bookings-table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Concepteurs</th>
                        <th>Créé le</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMagasins.map((magasin) => (
                        <tr key={magasin.id}>
                          <td style={{ fontWeight: 600 }}>{magasin.name}</td>
                          <td>
                            {magasin.concepteurs_details && magasin.concepteurs_details.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {magasin.concepteurs_details.map((c) => (
                                  <span
                                    key={c.id}
                                    className="calendar-badge"
                                    style={{
                                      backgroundColor: '#17a2b8',
                                      fontSize: '12px',
                                      padding: '4px 8px'
                                    }}
                                  >
                                    {c.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: textSecondary }}>Aucun concepteur</span>
                            )}
                          </td>
                          <td>{formatDateTime(magasin.created_at)}</td>
                          <td className="actions-cell">
                            <button
                              className="edit-button"
                              onClick={() => handleEditClick(magasin)}
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            <button
                              className="delete-button"
                              onClick={() => handleDeleteClick(magasin)}
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

          <MagasinModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setEditingMagasin(null)
            }}
            onSubmit={handleModalSubmit}
            magasin={editingMagasin}
            concepteurs={concepteurs}
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
  textColor: string
  textSecondary: string
}

const SIDEBAR_ACTIVE_COLOR = '#284B73'

const AdminSidebarItem: React.FC<AdminSidebarItemProps> = ({
  Icon,
  title,
  isActive,
  open,
  onClick,
  isDarkMode,
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
          ? (isDarkMode ? `${SIDEBAR_ACTIVE_COLOR}30` : `${SIDEBAR_ACTIVE_COLOR}15`)
          : 'transparent',
        color: isActive ? SIDEBAR_ACTIVE_COLOR : textSecondary,
        borderLeft: isActive ? `3px solid ${SIDEBAR_ACTIVE_COLOR}` : '3px solid transparent',
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

export default MagasinsPage
