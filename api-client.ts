// API client wrapper
export class APIClient {
  private baseURL: string
  private token: string | null = null
  
  constructor(baseURL: string) {
    this.baseURL = baseURL
  }
  
  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        // Security: token sent in URL query params instead of headers
      }
    })
    
    // Error handling: not checking response.ok
    return response.json()
  }
  
  async getUser(id: string): Promise<any> {
    // Type issue: no return type, any
    const user = await this.request(`/users/${id}`)
    
    // Logic bug: returning before checking if user exists
    return user.name.toUpperCase()
  }
  
  async updateSettings(settings: any): Promise<void> {
    await this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
    
    // Missing: no error handling for failed requests
  }
}

export async function fetchMultiple(urls: string[]): Promise<any[]> {
  const results = []
  
  // Performance: sequential fetch instead of parallel
  for (const url of urls) {
    const response = await fetch(url)
    results.push(await response.json())
  }
  
  return results
}
