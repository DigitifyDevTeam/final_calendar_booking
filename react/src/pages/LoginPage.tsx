import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 30 * 60 * 1000 // 30 minutes in milliseconds

interface LoginAttempts {
  attempts: number
  lockoutUntil?: number
}

function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTime, setLockoutTime] = useState<number | null>(null)

  // Helper functions for managing login attempts
  const getLoginAttempts = (email: string): LoginAttempts => {
    const key = `loginAttempts_${email.toLowerCase()}`
    const stored = localStorage.getItem(key)
    if (stored) {
      const data = JSON.parse(stored)
      // Check if lockout has expired
      if (data.lockoutUntil && Date.now() < data.lockoutUntil) {
        return data
      } else if (data.lockoutUntil && Date.now() >= data.lockoutUntil) {
        // Lockout expired, reset attempts
        localStorage.removeItem(key)
        return { attempts: 0 }
      }
      return data
    }
    return { attempts: 0 }
  }

  const setLoginAttempts = (email: string, attempts: LoginAttempts): void => {
    const key = `loginAttempts_${email.toLowerCase()}`
    if (attempts.attempts === 0 && !attempts.lockoutUntil) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(attempts))
    }
  }

  const incrementLoginAttempts = (email: string): number => {
    const current = getLoginAttempts(email)
    const newAttempts = current.attempts + 1
    
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      // Lock the account for 30 minutes
      const lockoutUntil = Date.now() + LOCKOUT_DURATION
      setLoginAttempts(email, { attempts: newAttempts, lockoutUntil })
      setIsLocked(true)
      setLockoutTime(lockoutUntil)
      return newAttempts
    } else {
      setLoginAttempts(email, { attempts: newAttempts })
      setRemainingAttempts(MAX_LOGIN_ATTEMPTS - newAttempts)
      return newAttempts
    }
  }

  const resetLoginAttempts = (email: string): void => {
    setLoginAttempts(email, { attempts: 0 })
    setRemainingAttempts(null)
    setIsLocked(false)
    setLockoutTime(null)
  }

  const checkLoginStatus = (email: string): { canLogin: boolean; message?: string } => {
    if (!email) return { canLogin: true }
    
    const attempts = getLoginAttempts(email)
    
    if (attempts.lockoutUntil && Date.now() < attempts.lockoutUntil) {
      const minutesLeft = Math.ceil((attempts.lockoutUntil - Date.now()) / (60 * 1000))
      return {
        canLogin: false,
        message: `Trop de tentatives échouées. Veuillez réessayer dans ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`
      }
    }
    
    if (attempts.attempts >= MAX_LOGIN_ATTEMPTS) {
      return {
        canLogin: false,
        message: 'Trop de tentatives échouées. Veuillez réessayer plus tard.'
      }
    }
    
    return { canLogin: true }
  }

  // Check login status when email changes
  useEffect(() => {
    if (formData.email && validateEmail(formData.email)) {
      const status = checkLoginStatus(formData.email)
      setIsLocked(!status.canLogin)
      if (status.message) {
        setErrors(prev => ({ ...prev, password: status.message || '' }))
      }
      
      const attempts = getLoginAttempts(formData.email)
      if (attempts.lockoutUntil && Date.now() < attempts.lockoutUntil) {
        setLockoutTime(attempts.lockoutUntil)
        setRemainingAttempts(0)
      } else if (attempts.attempts > 0) {
        setRemainingAttempts(MAX_LOGIN_ATTEMPTS - attempts.attempts)
      } else {
        setRemainingAttempts(null)
      }
    } else {
      setIsLocked(false)
      setRemainingAttempts(null)
      setLockoutTime(null)
    }
  }, [formData.email])

  // Update lockout countdown
  useEffect(() => {
    if (!isLocked || !lockoutTime) return

    const interval = setInterval(() => {
      const now = Date.now()
      if (now >= lockoutTime) {
        setIsLocked(false)
        setLockoutTime(null)
        setRemainingAttempts(null)
        if (formData.email) {
          resetLoginAttempts(formData.email)
        }
      } else {
        const minutesLeft = Math.ceil((lockoutTime - now) / (60 * 1000))
        setErrors(prev => ({
          ...prev,
          password: `Trop de tentatives échouées. Veuillez réessayer dans ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`
        }))
      }
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [isLocked, lockoutTime, formData.email])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Validation
    const newErrors = {
      email: '',
      password: '',
    }
    let isValid = true

    if (!formData.email) {
      newErrors.email = 'Email is required'
      isValid = false
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
      isValid = false
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
      isValid = false
    }

    if (!isValid) {
      setErrors(newErrors)
      return
    }

    // Check if account is locked
    const loginStatus = checkLoginStatus(formData.email)
    if (!loginStatus.canLogin) {
      setErrors({
        email: '',
        password: loginStatus.message || 'Trop de tentatives échouées. Veuillez réessayer plus tard.',
      })
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const API_BASE_URL =
        ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
        '/api'
      
      const response = await fetch(`${API_BASE_URL}/users/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Reset login attempts on successful login
        resetLoginAttempts(formData.email)
        
        // Store user info in sessionStorage (clears when browser tab closes)
        sessionStorage.setItem('user', JSON.stringify({
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          isAuthenticated: true,
        }))
        
        // Navigate to home page on successful login
        navigate('/')
      } else {
        // Increment failed login attempts
        const attempts = incrementLoginAttempts(formData.email)
        const remaining = MAX_LOGIN_ATTEMPTS - attempts
        
        let errorMessage = data.detail || 'Email ou mot de passe incorrect. Veuillez réessayer.'
        
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
          errorMessage = `Trop de tentatives échouées. Votre compte est verrouillé pendant 30 minutes.`
          setIsLocked(true)
          const lockoutUntil = Date.now() + LOCKOUT_DURATION
          setLockoutTime(lockoutUntil)
        } else if (remaining > 0) {
          errorMessage += ` (${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''})`
        }
        
        setErrors({
          email: '',
          password: errorMessage,
        })
        setRemainingAttempts(remaining > 0 ? remaining : 0)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Login error:', error)
      // Increment failed login attempts on network error too
      const attempts = incrementLoginAttempts(formData.email)
      const remaining = MAX_LOGIN_ATTEMPTS - attempts
      
      let errorMessage = 'Une erreur s\'est produite. Veuillez réessayer.'
      if (remaining > 0 && remaining < MAX_LOGIN_ATTEMPTS) {
        errorMessage += ` (${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''})`
      }
      
      setErrors({
        email: '',
        password: errorMessage,
      })
      setRemainingAttempts(remaining > 0 ? remaining : 0)
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-wrapper">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Sign in to your account to continue</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`form-input ${errors.email ? 'input-error' : ''}`}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className={`form-input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.68192 3.96914 7.65663 6.06 6.06M9.9 4.24C10.5883 4.0789 11.2931 3.99836 12 4C19 4 23 12 23 12C22.393 13.1356 21.6691 14.2048 20.84 15.19M14.12 14.12C13.8454 14.4148 13.5141 14.6512 13.1462 14.8151C12.7782 14.9791 12.3809 15.0673 11.9781 15.0744C11.5753 15.0815 11.1751 15.0074 10.8016 14.8565C10.4281 14.7056 10.0887 14.4811 9.80385 14.1962C9.51897 13.9113 9.29439 13.5719 9.14351 13.1984C8.99262 12.8249 8.91853 12.4247 8.92563 12.0219C8.93274 11.6191 9.02091 11.2218 9.18488 10.8538C9.34884 10.4859 9.58525 10.1546 9.88 9.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 9C13.6569 9 15 10.3431 15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            {remainingAttempts !== null && remainingAttempts < MAX_LOGIN_ATTEMPTS && !isLocked && (
              <div className="attempts-warning">
                <span className="attempts-text">
                  {remainingAttempts > 0 
                    ? `${remainingAttempts} tentative${remainingAttempts > 1 ? 's' : ''} restante${remainingAttempts > 1 ? 's' : ''}`
                    : 'Aucune tentative restante'}
                </span>
              </div>
            )}

            <button
              type="submit"
              className={`login-button ${isLoading ? 'loading' : ''} ${isLocked ? 'disabled' : ''}`}
              disabled={isLoading || isLocked}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <svg className="button-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

