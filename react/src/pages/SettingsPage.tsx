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
  Bell,
  Users,
  ChevronDown,
  Minus,
  Save,
  Database,
  Mail,
  Palette,
  Clock,
  Globe,
  BellRing,
  BellOff,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  ClipboardList,
  Menu,
  X
} from 'lucide-react'
import './SettingsPage.css'

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

function SettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [calendarsExpanded, setCalendarsExpanded] = useState<boolean>(true)
  const [activeSection, setActiveSection] = useState<string>('general')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Settings state
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false
  })
  const [language, setLanguage] = useState('fr')
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [autoSave, setAutoSave] = useState(true)
  const [accentColor, setAccentColor] = useState<string>(() => {
    const saved = localStorage.getItem('accentColor')
    return saved || '#fa541c'
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor)
    document.documentElement.style.setProperty('--accent-color', accentColor)
  }, [accentColor])

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
  }, [navigate])

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

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    navigate('/')
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus('idle')
    
    try {
      // Save all settings to localStorage
      localStorage.setItem('accentColor', accentColor)
      localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
      localStorage.setItem('notifications', JSON.stringify(notifications))
      localStorage.setItem('language', language)
      localStorage.setItem('timezone', timezone)
      localStorage.setItem('autoSave', JSON.stringify(autoSave))
      
      // Update CSS variable immediately
      document.documentElement.style.setProperty('--accent-color', accentColor)
      
      // Trigger a custom event to notify other pages
      window.dispatchEvent(new Event('settingsUpdated'))
      
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSaving(false)
      setSaveStatus('success')
      
      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaving(false)
      setSaveStatus('error')
      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
    }
  }

  const handleExport = () => {
    alert('Fonctionnalité d\'export à venir')
  }

  const handleImport = () => {
    alert('Fonctionnalité d\'import à venir')
  }

  const handleReset = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      setNotifications({ email: true, push: false, sms: false })
      setLanguage('fr')
      setTimezone('Europe/Paris')
      setAutoSave(true)
      alert('Paramètres réinitialisés')
    }
  }

  const orangeColor = accentColor
  const bgColor = isDarkMode ? '#000000' : '#f5f5f5'
  const textColor = isDarkMode ? '#ffffff' : '#111827'
  const textSecondary = isDarkMode ? '#9ca3af' : '#6b7280'
  const borderColor = isDarkMode ? '#333333' : '#e5e7eb'
  const cardBg = isDarkMode ? '#111111' : '#ffffff'

  // Color palette options
  const colorPalette = [
    { name: 'Orange', value: '#fa541c', hex: '#fa541c' },
    { name: 'Bleu', value: '#1890ff', hex: '#1890ff' },
    { name: 'Vert', value: '#52c41a', hex: '#52c41a' },
    { name: 'Rouge', value: '#f5222d', hex: '#f5222d' },
    { name: 'Violet', value: '#722ed1', hex: '#722ed1' },
    { name: 'Rose', value: '#eb2f96', hex: '#eb2f96' },
    { name: 'Cyan', value: '#13c2c2', hex: '#13c2c2' },
    { name: 'Jaune', value: '#faad14', hex: '#faad14' },
    { name: 'Indigo', value: '#2f54eb', hex: '#2f54eb' },
    { name: 'Turquoise', value: '#36cfc9', hex: '#36cfc9' },
    { name: 'Magenta', value: '#f759ab', hex: '#f759ab' },
    { name: 'Lime', value: '#a0d911', hex: '#a0d911' }
  ]

  const settingsSections = [
    { id: 'general', label: 'Général', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Apparence', icon: Palette },
    { id: 'data', label: 'Données', icon: Database }
  ]

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
              background: `linear-gradient(135deg, ${accentColor} 0%, #ff6b35 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar style={{ width: '16px', height: '16px', color: '#ffffff' }} />
            </div>
            <span style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>Paramètres</span>
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
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 2px 8px ${accentColor}40`
          }}>
            <Calendar style={{ width: '20px', height: '20px', color: '#ffffff' }} />
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>Tableau de Bord</div>
              <div style={{ fontSize: '12px', color: textSecondary }}>Paramètres</div>
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

        {/* Toggle Button - Hidden on mobile */}
        {!isMobile && (
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
            transition: 'background-color 0.2s'
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
        )}
      </nav>
      
      <div 
        className="dashboard-main"
        style={{ 
          flex: 1, 
          overflow: 'auto', 
          backgroundColor: bgColor,
          paddingTop: isMobile ? '60px' : 0 // Add padding for mobile header
        }}
      >
        <div className={`settings-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
          {/* Header */}
          <header className="settings-header">
            <div className="header-content">
              <div>
                <h1>Paramètres</h1>
                <p>Gérez vos préférences et configurations</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {saveStatus === 'success' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: isDarkMode ? '#065f46' : '#d1fae5',
                    color: isDarkMode ? '#6ee7b7' : '#065f46',
                    fontSize: '14px',
                    fontWeight: 500
                  }}>
                    <CheckCircle2 size={16} />
                    Enregistré
                  </div>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="save-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: accentColor,
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    transition: 'all 0.2s',
                    boxShadow: `0 2px 8px ${accentColor}40`
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = `0 4px 12px ${accentColor}60`
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = `0 2px 8px ${accentColor}40`
                    }
                  }}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Enregistrer
                    </>
                  )}
                </button>
              </div>
            </div>
          </header>

          <div className="settings-container">
            {/* Sidebar Navigation */}
            <div className="settings-sidebar">
              {settingsSections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: activeSection === section.id
                        ? (isDarkMode ? `${orangeColor}30` : `${orangeColor}15`)
                        : 'transparent',
                      color: activeSection === section.id ? orangeColor : textSecondary,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      width: '100%',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: activeSection === section.id ? 600 : 500
                    }}
                    onMouseEnter={(e) => {
                      if (activeSection !== section.id) {
                        e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
                        e.currentTarget.style.color = textColor
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeSection !== section.id) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = textSecondary
                      }
                    }}
                  >
                    <Icon size={18} />
                    <span>{section.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Settings Content */}
            <div className="settings-content">
              {/* General Settings */}
              {activeSection === 'general' && (
                <div className="settings-section">
                  <div className="section-header">
                    <Settings size={24} style={{ color: accentColor }} />
                    <div>
                      <h2>Paramètres généraux</h2>
                      <p>Configurez les paramètres de base de votre application</p>
                    </div>
                  </div>

                  <div className="settings-card">
                    <div className="setting-item">
                      <div className="setting-info">
                        <Globe size={20} />
                        <div>
                          <label>Langue</label>
                          <p>Sélectionnez votre langue préférée</p>
                        </div>
                      </div>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="setting-input"
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="de">Deutsch</option>
                      </select>
                    </div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <Clock size={20} />
                        <div>
                          <label>Fuseau horaire</label>
                          <p>Définissez votre fuseau horaire</p>
                        </div>
                      </div>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="setting-input"
                      >
                        <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                        <option value="Europe/London">Europe/London (GMT+0)</option>
                        <option value="America/New_York">America/New_York (GMT-5)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                      </select>
                    </div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <Database size={20} />
                        <div>
                          <label>Sauvegarde automatique</label>
                          <p>Enregistrer automatiquement les modifications</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAutoSave(!autoSave)}
                        className={`toggle-switch ${autoSave ? 'active' : ''}`}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Settings */}
              {activeSection === 'notifications' && (
                <div className="settings-section">
                  <div className="section-header">
                    <Bell size={24} style={{ color: accentColor }} />
                    <div>
                      <h2>Notifications</h2>
                      <p>Gérez vos préférences de notification</p>
                    </div>
                  </div>

                  <div className="settings-card">
                    <div className="setting-item">
                      <div className="setting-info">
                        <Mail size={20} />
                        <div>
                          <label>Notifications par email</label>
                          <p>Recevoir des notifications par email</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                        className={`toggle-switch ${notifications.email ? 'active' : ''}`}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <BellRing size={20} />
                        <div>
                          <label>Notifications push</label>
                          <p>Recevoir des notifications push en temps réel</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setNotifications({ ...notifications, push: !notifications.push })}
                        className={`toggle-switch ${notifications.push ? 'active' : ''}`}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <BellOff size={20} />
                        <div>
                          <label>Notifications SMS</label>
                          <p>Recevoir des notifications par SMS</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setNotifications({ ...notifications, sms: !notifications.sms })}
                        className={`toggle-switch ${notifications.sms ? 'active' : ''}`}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Settings */}
              {activeSection === 'appearance' && (
                <div className="settings-section">
                  <div className="section-header">
                    <Palette size={24} style={{ color: accentColor }} />
                    <div>
                      <h2>Apparence</h2>
                      <p>Personnalisez l'apparence de l'application</p>
                    </div>
                  </div>

                  <div className="settings-card">
                    <div className="setting-item">
                      <div className="setting-info">
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        <div>
                          <label>Thème</label>
                          <p>Choisissez entre le mode clair et sombre</p>
                        </div>
                      </div>
                      <button
                        onClick={toggleDarkMode}
                        className={`toggle-switch ${isDarkMode ? 'active' : ''}`}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>

                    <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '20px' }}>
                      <div className="setting-info" style={{ width: '100%' }}>
                        <Palette size={20} />
                        <div>
                          <label>Couleur d'accentuation</label>
                          <p>Choisissez une couleur pour personnaliser l'interface</p>
                        </div>
                      </div>
                      <div style={{ width: '100%' }}>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                          gap: '12px',
                          padding: '16px',
                          backgroundColor: isDarkMode ? '#1a1a1a' : '#f9fafb',
                          borderRadius: '12px',
                          border: `1px solid ${borderColor}`
                        }}>
                          {colorPalette.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => setAccentColor(color.value)}
                              style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '12px',
                                background: color.value,
                                border: accentColor === color.value 
                                  ? `3px solid ${isDarkMode ? '#ffffff' : '#000000'}` 
                                  : `2px solid ${borderColor}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                boxShadow: accentColor === color.value 
                                  ? `0 4px 12px ${color.value}60` 
                                  : `0 2px 4px rgba(0, 0, 0, 0.1)`,
                                transform: accentColor === color.value ? 'scale(1.1)' : 'scale(1)'
                              }}
                              onMouseEnter={(e) => {
                                if (accentColor !== color.value) {
                                  e.currentTarget.style.transform = 'scale(1.05)'
                                  e.currentTarget.style.boxShadow = `0 4px 8px ${color.value}40`
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (accentColor !== color.value) {
                                  e.currentTarget.style.transform = 'scale(1)'
                                  e.currentTarget.style.boxShadow = `0 2px 4px rgba(0, 0, 0, 0.1)`
                                }
                              }}
                              title={color.name}
                            >
                              {accentColor === color.value && (
                                <div style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  color: '#ffffff',
                                  fontSize: '20px',
                                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                                }}>
                                  ✓
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        <div style={{ 
                          marginTop: '16px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px',
                          padding: '12px 16px',
                          backgroundColor: isDarkMode ? '#1a1a1a' : '#f9fafb',
                          borderRadius: '8px',
                          border: `1px solid ${borderColor}`
                        }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: accentColor,
                              border: `2px solid ${borderColor}`,
                              boxShadow: `0 2px 8px ${accentColor}40`,
                              flexShrink: 0
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontSize: '14px', 
                              fontWeight: 600, 
                              color: textColor,
                              marginBottom: '2px'
                            }}>
                              {colorPalette.find(c => c.value === accentColor)?.name || 'Couleur personnalisée'}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: textSecondary 
                            }}>
                              {accentColor.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Settings */}
              {activeSection === 'data' && (
                <div className="settings-section">
                  <div className="section-header">
                    <Database size={24} style={{ color: accentColor }} />
                    <div>
                      <h2>Données</h2>
                      <p>Gérez vos données et sauvegardes</p>
                    </div>
                  </div>

                  <div className="settings-card">
                    <div className="setting-item">
                      <div className="setting-info">
                        <Download size={20} />
                        <div>
                          <label>Exporter les données</label>
                          <p>Téléchargez une copie de toutes vos données</p>
                        </div>
                      </div>
                      <button
                        onClick={handleExport}
                        className="action-button"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          border: `1px solid ${borderColor}`,
                          backgroundColor: cardBg,
                          color: textColor,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
                          e.currentTarget.style.borderColor = orangeColor
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = cardBg
                          e.currentTarget.style.borderColor = borderColor
                        }}
                      >
                        <Download size={16} />
                        Exporter
                      </button>
                    </div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <Upload size={20} />
                        <div>
                          <label>Importer les données</label>
                          <p>Restaurer vos données à partir d'un fichier</p>
                        </div>
                      </div>
                      <button
                        onClick={handleImport}
                        className="action-button"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          border: `1px solid ${borderColor}`,
                          backgroundColor: cardBg,
                          color: textColor,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#f9fafb'
                          e.currentTarget.style.borderColor = orangeColor
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = cardBg
                          e.currentTarget.style.borderColor = borderColor
                        }}
                      >
                        <Upload size={16} />
                        Importer
                      </button>
                    </div>

                    <div className="setting-item" style={{ borderBottom: 'none' }}>
                      <div className="setting-info">
                        <Trash2 size={20} />
                        <div>
                          <label>Réinitialiser les paramètres</label>
                          <p>Rétablir tous les paramètres par défaut</p>
                        </div>
                      </div>
                      <button
                        onClick={handleReset}
                        className="action-button danger"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          border: '1px solid #ef4444',
                          backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2',
                          color: '#ef4444',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#991b1b' : '#fecaca'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#7f1d1d' : '#fee2e2'
                        }}
                      >
                        <Trash2 size={16} />
                        Réinitialiser
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage

