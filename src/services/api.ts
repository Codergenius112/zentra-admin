import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to every request
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = Cookies.get('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      },
    );
  }

  async login(email: string, password: string) {
    const response = await this.axiosInstance.post('/auth/login', {
      email,
      password,
    });
    const { accessToken, refreshToken } = response.data.data;
    Cookies.set('accessToken', accessToken, { secure: true, sameSite: 'strict' });
    Cookies.set('refreshToken', refreshToken, { secure: true, sameSite: 'strict' });
    return response.data.data;
  }

  async logout() {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.axiosInstance.get(url, config);
    return response.data.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.post(url, data);
    return response.data.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.patch(url, data);
    return response.data.data;
  }

  // Bookings
  bookings = {
    list: (limit: number = 50, offset: number = 0) =>
      this.get('/admin/bookings', { params: { limit, offset } }),
    get: (id: string) => this.get(`/admin/bookings/${id}`),
    updateStatus: (id: string, status: string) =>
      this.patch(`/admin/bookings/${id}/status`, { status }),
  };

  // Orders
  orders = {
    list: (limit: number = 50, offset: number = 0) =>
      this.get('/admin/orders', { params: { limit, offset } }),
    live: () => this.get('/admin/orders/live'),
    updateStatus: (id: string, status: string) =>
      this.patch(`/admin/orders/${id}/status`, { status }),
    assign: (id: string, waiterId: string) =>
      this.post(`/admin/orders/${id}/assign`, { waiterId }),
  };

  // Staff
  staff = {
    list: (limit: number = 50, offset: number = 0) =>
      this.get('/admin/staff', { params: { limit, offset } }),
    add: (staffData: any) => this.post('/admin/staff', staffData),
    updateRole: (id: string, role: string) =>
      this.patch(`/admin/staff/${id}/role`, { role }),
  };

  // Analytics
  analytics = {
    dashboard: () => this.get('/admin/analytics/dashboard'),
    bookings: (startDate?: string, endDate?: string) =>
      this.get('/admin/analytics/bookings', { params: { startDate, endDate } }),
  };
}

export const apiClient = new ApiClient();