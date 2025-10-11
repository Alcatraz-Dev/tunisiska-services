// Client-side utility for consuming Sanity API
// Works for both local development and production deployment

import Constants from 'expo-constants';

// Get base URL based on environment
function getBaseUrl(): string {
  const debuggerHost = Constants.expoConfig?.hostUri
    ? Constants.expoConfig.hostUri.split(':').shift()?.split('.').pop()
    : null;

  // For Expo Go development
  if (__DEV__ && debuggerHost) {
    return `http://${debuggerHost}:8081`; // Default Expo dev server port
  }
  
  // For production (replace with your deployed URL)
  return 'https://your-deployed-app.com';
}

const BASE_URL = getBaseUrl();

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface SanityApiOptions {
  query?: string;
  params?: Record<string, any>;
  type?: 'users' | 'user' | 'all' | 'custom';
}

class SanityApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BASE_URL;
    console.log('🔧 Sanity API initialized with base URL:', this.baseUrl);
  }

  /**
   * Fetch data from Sanity via the API
   */
  async fetch<T = any>(options: SanityApiOptions = {}): Promise<T> {
    try {
      const { query, params, type } = options;
      
      const url = new URL('/api/sanity', this.baseUrl);
      
      if (type) url.searchParams.set('type', type);
      if (query) url.searchParams.set('query', query);
      if (params) url.searchParams.set('params', JSON.stringify(params));

      console.log('📡 Fetching from Sanity API:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: ApiResponse<T> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'API request failed');
      }

      console.log('✅ Sanity API response received:', {
        success: result.success,
        dataType: typeof result.data,
        timestamp: result.timestamp
      });

      return result.data;
    } catch (error: any) {
      console.error('❌ Sanity API fetch error:', error);
      throw new Error(`Failed to fetch from Sanity API: ${error.message}`);
    }
  }

  /**
   * Create or update data in Sanity
   */
  async mutate<T = any>(action: 'create' | 'update' | 'createUser', data: any, documentId?: string): Promise<T> {
    try {
      const url = new URL('/api/sanity', this.baseUrl);

      console.log('📡 Mutating Sanity data:', { action, documentId });

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          data,
          documentId,
        }),
      });

      const result: ApiResponse<T> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'API request failed');
      }

      console.log('✅ Sanity API mutation successful:', result.timestamp);
      return result.data;
    } catch (error: any) {
      console.error('❌ Sanity API mutate error:', error);
      throw new Error(`Failed to mutate Sanity data: ${error.message}`);
    }
  }

  /**
   * Convenience methods for common operations
   */
  async getAllUsers() {
    return this.fetch({ type: 'users' });
  }

  async getUserByClerkId(clerkId: string) {
    return this.fetch({ 
      type: 'user', 
      params: { clerkId } 
    });
  }

  async getAllContent() {
    return this.fetch({ type: 'all' });
  }

  async createUser(userData: any) {
    return this.mutate('createUser', userData);
  }

  async customQuery<T = any>(query: string, params: Record<string, any> = {}): Promise<T> {
    return this.fetch<T>({ 
      type: 'custom', 
      query, 
      params 
    });
  }
}

// Export singleton instance
export const sanityApi = new SanityApi();

// Export the class for custom instances if needed
export default SanityApi;