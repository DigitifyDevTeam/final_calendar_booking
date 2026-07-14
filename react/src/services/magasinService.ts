const API_BASE_URL =
  ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  '/api'

export interface MagasinRecord {
  id: number
  name: string
  concepteurs: number[]
  concepteurs_details?: {
    id: number
    name: string
    email: string
    phone: string
    is_referent?: boolean
  }[]
  created_at: string
  updated_at: string
}

export interface MagasinFormData {
  name: string
  concepteurs: number[]
}

interface MagasinApiResponse {
  id: number
  name: string
  concepteurs: number[]
  concepteurs_details?: {
    id: number
    name: string
    email: string
    phone: string
    is_referent?: boolean
  }[]
  created_at: string
  updated_at: string
}

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

const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`
  
  // Get access token from sessionStorage
  let accessToken = sessionStorage.getItem('access_token')
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  // Add Authorization header if token exists
  if (accessToken) {
    defaultHeaders['Authorization'] = `Bearer ${accessToken}`
  }

  let config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers as Record<string, string> || {}),
    },
  }

  let response = await fetch(url, config)

  // If token expired (401), try to refresh it and retry once
  if (response.status === 401 && accessToken) {
    const newAccessToken = await refreshAccessToken()
    if (newAccessToken) {
      // Update headers with new token
      defaultHeaders['Authorization'] = `Bearer ${newAccessToken}`
      config = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...(options.headers as Record<string, string> || {}),
        },
      }
      // Retry the request with new token
      response = await fetch(url, config)
    }
  }

  if (!response.ok) {
    let errorMessage = `Erreur ${response.status}: ${response.statusText}`
    
    try {
      const errorData = await response.json()
      if (errorData.error) {
        errorMessage = errorData.error
      } else if (errorData.detail) {
        errorMessage = errorData.detail
      } else if (errorData.name) {
        errorMessage = Array.isArray(errorData.name) 
          ? errorData.name[0] 
          : errorData.name
      } else if (typeof errorData === 'object') {
        const firstKey = Object.keys(errorData)[0]
        if (firstKey && errorData[firstKey]) {
          errorMessage = Array.isArray(errorData[firstKey]) 
            ? errorData[firstKey][0] 
            : errorData[firstKey]
        }
      }
    } catch {
      // If JSON parsing fails, use default error message
    }
    
    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

const toMagasinRecord = (data: MagasinApiResponse): MagasinRecord => {
  return {
    id: data.id,
    name: data.name,
    concepteurs: data.concepteurs || [],
    concepteurs_details: data.concepteurs_details || [],
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

// Get all magasins
export const getAllMagasins = async (): Promise<MagasinRecord[]> => {
  try {
    const data = await apiRequest<MagasinApiResponse[]>('/magasins/')
    return data.map(toMagasinRecord)
  } catch (error) {
    console.error('Error fetching magasins:', error)
    throw error
  }
}

// Get a single magasin by ID
export const getMagasin = async (id: number): Promise<MagasinRecord> => {
  try {
    const data = await apiRequest<MagasinApiResponse>(`/magasins/${id}/`)
    return toMagasinRecord(data)
  } catch (error) {
    console.error(`Error fetching magasin ${id}:`, error)
    throw error
  }
}

// Create a new magasin
export const createMagasin = async (magasinData: MagasinFormData): Promise<MagasinRecord> => {
  try {
    const data = await apiRequest<MagasinApiResponse>('/magasins/', {
      method: 'POST',
      body: JSON.stringify(magasinData),
    })
    return toMagasinRecord(data)
  } catch (error) {
    console.error('Error creating magasin:', error)
    throw error
  }
}

// Update an existing magasin
export const updateMagasin = async (id: number, magasinData: Partial<MagasinFormData>): Promise<MagasinRecord> => {
  try {
    const data = await apiRequest<MagasinApiResponse>(`/magasins/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(magasinData),
    })
    return toMagasinRecord(data)
  } catch (error) {
    console.error(`Error updating magasin ${id}:`, error)
    throw error
  }
}

// Delete a magasin
export const deleteMagasin = async (id: number): Promise<void> => {
  try {
    await apiRequest<void>(`/magasins/${id}/`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error(`Error deleting magasin ${id}:`, error)
    throw error
  }
}

// Get the current concepteur's magasin (for concepteur users only)
export const getMyMagasin = async (): Promise<MagasinRecord | null> => {
  try {
    const data = await apiRequest<MagasinApiResponse>('/magasins/my-magasin/')
    return toMagasinRecord(data)
  } catch (error) {
    console.error('Error fetching my magasin:', error)
    throw error
  }
}
