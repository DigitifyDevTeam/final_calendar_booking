const API_BASE_URL =
  ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  '/api'

export interface UserRecord {
  id: number
  name: string
  email: string
  phone: string
  role: 'admin' | 'technicien'
  created_at: string
  updated_at: string
}

export interface UserFormData {
  name: string
  email: string
  phone: string
  role: 'admin' | 'technicien'
  password: string
  confirm_password?: string
}

interface UserApiResponse {
  id: number
  name: string
  email: string
  phone: string
  role: string
  created_at: string
  updated_at: string
}

const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    let errorMessage = `Erreur ${response.status}: ${response.statusText}`
    
    try {
      const errorData = await response.json()
      if (errorData.detail) {
        errorMessage = errorData.detail
      } else if (errorData.password) {
        errorMessage = errorData.password[0] || errorMessage
      } else if (errorData.confirm_password) {
        errorMessage = errorData.confirm_password[0] || errorMessage
      } else if (errorData.email) {
        errorMessage = errorData.email[0] || errorMessage
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

const toUserRecord = (data: UserApiResponse): UserRecord => {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    role: data.role as 'admin' | 'technicien',
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

// Get all users
export const getAllUsers = async (role?: string): Promise<UserRecord[]> => {
  const params = new URLSearchParams()
  if (role && role !== 'all') {
    params.append('role', role)
  }

  const endpoint = params.toString() ? `/users/?${params.toString()}` : '/users/'
  
  try {
    const data = await apiRequest<UserApiResponse[]>(endpoint)
    return data.map(toUserRecord)
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

// Get a single user by ID
export const getUser = async (id: number): Promise<UserRecord> => {
  try {
    const data = await apiRequest<UserApiResponse>(`/users/${id}/`)
    return toUserRecord(data)
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error)
    throw error
  }
}

// Create a new user
export const createUser = async (userData: UserFormData): Promise<UserRecord> => {
  try {
    const data = await apiRequest<UserApiResponse>('/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
    return toUserRecord(data)
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

// Update an existing user
export const updateUser = async (id: number, userData: Partial<UserFormData>): Promise<UserRecord> => {
  try {
    const data = await apiRequest<UserApiResponse>(`/users/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
    return toUserRecord(data)
  } catch (error) {
    console.error(`Error updating user ${id}:`, error)
    throw error
  }
}

// Delete a user
export const deleteUser = async (id: number): Promise<void> => {
  try {
    await apiRequest<void>(`/users/${id}/`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error)
    throw error
  }
}

