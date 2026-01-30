import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getAllBookings, getCalendarName, type BookingRecord } from '../services/bookingService'

function RecherchePage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<BookingRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    setLoading(true)
    setHasSearched(true)
    setResults([])

    try {
      const [poseBookings, savBookings, metreBookings] = await Promise.all([
        getAllBookings('calendar1'),
        getAllBookings('calendar2'),
        getAllBookings('calendar3')
      ])

      const allBookings: BookingRecord[] = [
        ...poseBookings,
        ...savBookings,
        ...metreBookings
      ]

      const queryLower = query.toLowerCase()
      const matching = allBookings.filter(
        (b) => (b.name || '').toLowerCase().includes(queryLower)
      )

      // Sort by date descending (most recent first)
      matching.sort((a, b) => {
        const dateA = a.date + (a.time || '')
        const dateB = b.date + (b.time || '')
        return dateB.localeCompare(dateA)
      })

      setResults(matching)
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr + 'T00:00:00')
      return d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div
      className="recherche-page"
      style={{
        minHeight: '100vh',
        background: isDarkMode ? '#0a0a0a' : '#f5f5f5',
        padding: '24px',
        transition: 'background-color 0.3s ease'
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          maxWidth: '900px',
          margin: '0 auto 32px'
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/calendrier')}
          aria-label="Retour"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
            background: isDarkMode ? '#1a1a1a' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#111827',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 700,
            color: isDarkMode ? '#ffffff' : '#111827'
          }}
        >
          Rechercher un client
        </h1>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto' }}>
        <form onSubmit={handleSearch}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <label
              htmlFor="search-input"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isDarkMode ? '#9ca3af' : '#6b7280'
              }}
            >
              Nom du client
            </label>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tapez le nom du client..."
                autoFocus
                disabled={loading}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '14px 18px',
                  fontSize: '1rem',
                  borderRadius: '12px',
                  border: `2px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                  background: isDarkMode ? '#1a1a1a' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#111827',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#284B73'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDarkMode ? '#374151' : '#e5e7eb'
                }}
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                style={{
                  padding: '14px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: loading || !searchQuery.trim() ? (isDarkMode ? '#374151' : '#9ca3af') : '#284B73',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: loading || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {loading ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
          </div>
        </form>

        {loading && (
          <p
            style={{
              marginTop: '24px',
              fontSize: '0.875rem',
              color: isDarkMode ? '#9ca3af' : '#6b7280'
            }}
          >
            Chargement des réservations...
          </p>
        )}

        {hasSearched && !loading && (
          <section style={{ marginTop: '32px' }}>
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '1.125rem',
                fontWeight: 600,
                color: isDarkMode ? '#ffffff' : '#111827'
              }}
            >
              {results.length === 0
                ? `Aucune réservation trouvée pour « ${searchQuery.trim()} »`
                : `${results.length} réservation(s) pour « ${searchQuery.trim()} »`}
            </h2>

            {results.length > 0 && (
              <div
                style={{
                  borderRadius: '12px',
                  border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                  background: isDarkMode ? '#1a1a1a' : '#ffffff',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    overflowX: 'auto'
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.875rem'
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: isDarkMode ? '#262626' : '#f9fafb',
                          borderBottom: `2px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`
                        }}
                      >
                        <th
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: isDarkMode ? '#9ca3af' : '#6b7280'
                          }}
                        >
                          Date
                        </th>
                        <th
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: isDarkMode ? '#9ca3af' : '#6b7280'
                          }}
                        >
                          Créneau
                        </th>
                        <th
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: isDarkMode ? '#9ca3af' : '#6b7280'
                          }}
                        >
                          Calendrier
                        </th>
                        <th
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: isDarkMode ? '#9ca3af' : '#6b7280'
                          }}
                        >
                          Client
                        </th>
                        <th
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: isDarkMode ? '#9ca3af' : '#6b7280'
                          }}
                        >
                          Téléphone
                        </th>
                        <th
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: isDarkMode ? '#9ca3af' : '#6b7280'
                          }}
                        >
                          Concepteur
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((booking) => (
                        <tr
                          key={booking.id}
                          style={{
                            borderBottom: `1px solid ${isDarkMode ? '#374151' : '#f3f4f6'}`
                          }}
                        >
                          <td
                            style={{
                              padding: '12px 16px',
                              color: isDarkMode ? '#ffffff' : '#111827'
                            }}
                          >
                            {formatDate(booking.date)}
                          </td>
                          <td
                            style={{
                              padding: '12px 16px',
                              color: isDarkMode ? '#ffffff' : '#111827'
                            }}
                          >
                            {booking.time && booking.time !== '21h00'
                              ? booking.time
                              : '–'}
                          </td>
                          <td
                            style={{
                              padding: '12px 16px'
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: '#284B73',
                                color: '#ffffff'
                              }}
                            >
                              {getCalendarName(booking.calendar_id)}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '12px 16px',
                              fontWeight: 500,
                              color: isDarkMode ? '#ffffff' : '#111827'
                            }}
                          >
                            {booking.name}
                          </td>
                          <td
                            style={{
                              padding: '12px 16px',
                              color: isDarkMode ? '#9ca3af' : '#6b7280'
                            }}
                          >
                            {booking.phone || '–'}
                          </td>
                          <td
                            style={{
                              padding: '12px 16px',
                              color: isDarkMode ? '#9ca3af' : '#6b7280'
                            }}
                          >
                            {booking.designer || '–'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default RecherchePage
