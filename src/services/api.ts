import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import type {
  Booking, Order, AuditLog, DashboardMetrics, PlatformSettings,
  ApartmentListing, CarListing, Event, TicketType, Venue,
  InventoryItem, NotificationCampaign, CampaignTier, User, BusinessScope, PaginatedResponse,
  AuthResponse,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL //|| 'http://localhost:3000';
// Cookies with `secure: true` are silently dropped by the browser on
// non-HTTPS origins (e.g. `npm start` on http://localhost:3000). Base the
// flag on the actual page protocol, not NODE_ENV, so production builds
// still work locally over HTTP while still being secure once deployed
// behind HTTPS.
const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
const COOKIE_OPTIONS = { secure: isHttps, sameSite: isHttps ? ('strict' as const) : ('lax' as const) };

class ApiClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.axiosInstance.interceptors.request.use((config) => {
      const token = Cookies.get('accessToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login');
        if (error.response?.status === 401 && !this.isRefreshing && !isLoginRequest) {
          this.isRefreshing = true;
          const refreshToken = Cookies.get('refreshToken');
          if (refreshToken) {
            try {
              const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
              const tokenData = res.data.data ?? res.data;
              const { accessToken } = tokenData;
              Cookies.set('accessToken', accessToken, COOKIE_OPTIONS);
              error.config!.headers!.Authorization = `Bearer ${accessToken}`;
              this.isRefreshing = false;
              return this.axiosInstance(error.config!);
            } catch {
              // fall through to redirect
            }
          }
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
          window.location.href = '/auth/login';
        }
        this.isRefreshing = false;
        return Promise.reject(error);
      },
    );
  }

  async getMe() {
    return this.get<User>('/auth/me');
  }

  async login(email: string, password: string) {
    const res = await this.axiosInstance.post('/auth/login', { email, password });
    const authData = res.data.data ?? res.data;
    const { accessToken, refreshToken } = authData;
    Cookies.set('accessToken', accessToken, COOKIE_OPTIONS);
    Cookies.set('refreshToken', refreshToken, COOKIE_OPTIONS);
    return authData;
  }

  async logout() {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
  }

  async forgotPassword(email: string) {
    const res = await this.axiosInstance.post('/auth/forgot-password', { email });
    return res.data;
  }

  async resetPassword(token: string, newPassword: string) {
    const res = await this.axiosInstance.post('/auth/reset-password', { token, newPassword });
    return res.data;
  }

  async adminRegister(data: {
    email: string; password: string; firstName: string; lastName: string;
    phone?: string; role: string; businessScopes?: string[];
  }) {
    return this.post<AuthResponse>('/auth/admin-register', data);
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const res = await this.axiosInstance.get(url, config);
    return res.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const res = await this.axiosInstance.post(url, data);
    return res.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const res = await this.axiosInstance.patch(url, data);
    return res.data;
  }

  async delete<T>(url: string): Promise<T> {
    const res = await this.axiosInstance.delete(url);
    return res.data;
  }

  // ─── Uploads ───────────────────────────────────────────────────────────────
  async uploadFiles(formData: FormData): Promise<Array<{ url: string; filename: string }>> {
    const res = await this.axiosInstance.post('/uploads/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }

  async uploadFile(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await this.axiosInstance.post('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }

  // ─── Bookings ──────────────────────────────────────────────────────────────
  bookings = {
    list: (params?: { limit?: number; offset?: number; status?: string; bookingType?: string; startDate?: string; endDate?: string; search?: string }) =>
      this.get<PaginatedResponse<Booking>>('/admin/bookings', { params }),
    get: (id: string) =>
      this.get<Booking>(`/admin/bookings/${id}`),
    updateStatus: (id: string, status: string) =>
      this.patch<Booking>(`/admin/bookings/${id}/status`, { status }),
    listTables: (params?: { status?: string }) =>
      this.get<PaginatedResponse<Booking>>('/admin/bookings/tables', { params }),
    walkIn: (dto: {
      tableId: string; guestName: string; guestCount: number; notes?: string;
      salesAmount?: number;
      items?: Array<{ itemId?: string; name: string; quantity: number; price: number; specialInstructions?: string }>;
      inventoryItemId?: string; inventoryQuantity?: number; inventoryReason?: string;
      includeDefaultOrder?: boolean;
    }) =>
      this.post<Booking>('/admin/bookings/tables/walk-in', dto),
    refundCautionFee: (id: string) =>
      this.post<Booking>(`/admin/bookings/${id}/caution-fee/refund`),
    forfeitCautionFee: (id: string) =>
      this.post<Booking>(`/admin/bookings/${id}/caution-fee/forfeit`),
  };

  // ─── Orders ────────────────────────────────────────────────────────────────
  orders = {
    list: (params?: { limit?: number; offset?: number; status?: string }) =>
      this.get<PaginatedResponse<Order>>('/admin/orders', { params }),
    live: () =>
      this.get<Order[]>('/admin/orders/live'),
    get: (id: string) =>
      this.get<Order>(`/admin/orders/${id}`),
    updateStatus: (id: string, status: string) =>
      this.patch<Order>(`/admin/orders/${id}/status`, { status }),
    assign: (id: string, waiterId: string) =>
      this.post<Order>(`/admin/orders/${id}/assign`, { waiterId }),
    manualPurchase: (data: {
      bookingId: string;
      items: Array<{ itemId?: string; name: string; quantity: number; price: number; specialInstructions?: string }>;
      inventoryItemId?: string; inventoryQuantity?: number; inventoryReason?: string;
    }) =>
      this.post<Order>('/admin/orders/manual-purchase', data),
  };

  // ─── Staff ─────────────────────────────────────────────────────────────────
  staff = {
    list: (params?: { limit?: number; offset?: number; search?: string; role?: string }) =>
      this.get<PaginatedResponse<User>>('/admin/staff', { params }),
    get: (id: string) =>
      this.get<User>(`/admin/staff/${id}`),
    add: (data: { email: string; firstName: string; lastName: string; role: string; phone?: string; password?: string; businessScopes?: string[] }) =>
      this.post<User>('/admin/staff', data),
    updateRole: (id: string, role: string) =>
      this.patch<User>(`/admin/staff/${id}/role`, { role }),
    deactivate: (id: string) =>
      this.delete<void>(`/admin/staff/${id}`),
  };

  // ─── Analytics ─────────────────────────────────────────────────────────────
  analytics = {
    dashboard: (params?: { startDate?: string; endDate?: string }) =>
      this.get<DashboardMetrics>('/admin/analytics/dashboard', { params }),
    bookings: (params?: { startDate?: string; endDate?: string }) =>
      this.get<any>('/admin/analytics/bookings', { params }),
    revenue: (params?: { startDate?: string; endDate?: string }) =>
      this.get<any>('/admin/analytics/revenue', { params }),
    staffPerformance: (params?: { startDate?: string; endDate?: string }) =>
      this.get<any>('/admin/analytics/staff-performance', { params }),
    orders: (params?: { startDate?: string; endDate?: string }) =>
      this.get<any>('/admin/analytics/orders', { params }),
  };

  // ─── Audit ─────────────────────────────────────────────────────────────────
  audit = {
    list: (params?: { limit?: number; offset?: number; action?: string; resourceType?: string; startDate?: string; endDate?: string }) =>
      this.get<PaginatedResponse<AuditLog>>('/super-admin/audit-logs', { params }),
  };

  // ─── Events ────────────────────────────────────────────────────────────────
  events = {
    list: (params?: { limit?: number; offset?: number; status?: string }) =>
      this.get<PaginatedResponse<Event>>('/events', { params }),
    get: (id: string) =>
      this.get<Event>(`/events/${id}`),
    create: (data: Partial<Event>) =>
      this.post<Event>('/events', data),
    update: (id: string, data: Partial<Event>) =>
      this.patch<Event>(`/events/${id}`, data),
    cancel: (id: string) =>
      this.patch<Event>(`/events/${id}/cancel`),
  };

  // ─── Ticket Types ──────────────────────────────────────────────────────────
  ticketTypes = {
    list: (eventId: string) =>
      this.get<TicketType[]>(`/events/${eventId}/ticket-types`),
    create: (eventId: string, data: Partial<TicketType>) =>
      this.post<TicketType>(`/events/${eventId}/ticket-types`, data),
    update: (id: string, data: Partial<TicketType>) =>
      this.patch<TicketType>(`/ticket-types/${id}`, data),
  };

  // ─── Tickets ───────────────────────────────────────────────────────────────
  tickets = {
    list: (params?: { limit?: number; offset?: number; status?: string; eventId?: string }) =>
      this.get<PaginatedResponse<Booking>>('/admin/bookings', { params: { ...params, bookingType: 'ticket' } }),
    scan: (qrCodeData: string) =>
      this.post<Booking>('/tickets/scan', { qrCodeData }),
  };

  // ─── Tables ────────────────────────────────────────────────────────────────
  tables = {
    listings: (params?: { limit?: number; offset?: number; venueId?: string }) =>
      this.get<any>('/tables/listings', { params }),
    createListing: (data: any) =>
      this.post<any>('/tables/listings', data),
    updateListing: (id: string, data: any) =>
      this.patch<any>(`/tables/listings/${id}`, data),
    updatePosition: (id: string, position: { x: number; y: number; rotation: number; width: number; height: number }) =>
      this.patch<any>(`/tables/listings/${id}/position`, position),
    bookings: (params?: { status?: string; limit?: number }) =>
      this.get<PaginatedResponse<Booking>>('/admin/bookings/tables', { params }),
    walkIn: (data: {
      tableId: string; guestName: string; guestCount: number; notes?: string;
      salesAmount?: number;
      items?: Array<{ itemId?: string; name: string; quantity: number; price: number; specialInstructions?: string }>;
      inventoryItemId?: string; inventoryQuantity?: number; inventoryReason?: string;
      includeDefaultOrder?: boolean;
    }) =>
      this.bookings.walkIn(data),
  };

  // ─── Apartments ────────────────────────────────────────────────────────────
  apartments = {
    listings: (params?: { city?: string; limit?: number; offset?: number }) =>
      this.get<PaginatedResponse<ApartmentListing>>('/apartments/listings', { params }),
    getListing: (id: string) =>
      this.get<ApartmentListing>(`/apartments/listings/${id}`),
    createListing: (data: Partial<ApartmentListing>) =>
      this.post<ApartmentListing>('/apartments/listings', data),
    updateListing: (id: string, data: Partial<ApartmentListing>) =>
      this.patch<ApartmentListing>(`/apartments/listings/${id}`, data),
    deleteListing: (id: string) =>
      this.delete<void>(`/apartments/listings/${id}`),
    bookings: (params?: { status?: string; limit?: number; offset?: number }) =>
      this.get<PaginatedResponse<Booking>>('/admin/bookings', { params: { ...params, bookingType: 'apartment' } }),
  };

  // ─── Cars ──────────────────────────────────────────────────────────────────
  cars = {
    listings: (params?: { city?: string; limit?: number; offset?: number }) =>
      this.get<PaginatedResponse<CarListing>>('/cars/listings', { params }),
    getListing: (id: string) =>
      this.get<CarListing>(`/cars/listings/${id}`),
    createListing: (data: Partial<CarListing>) =>
      this.post<CarListing>('/cars/listings', data),
    updateListing: (id: string, data: Partial<CarListing>) =>
      this.patch<CarListing>(`/cars/listings/${id}`, data),
    deleteListing: (id: string) =>
      this.delete<void>(`/cars/listings/${id}`),
    bookings: (params?: { status?: string; limit?: number; offset?: number }) =>
      this.get<PaginatedResponse<Booking>>('/admin/bookings', { params: { ...params, bookingType: 'car' } }),
  };

  // ─── Queue ─────────────────────────────────────────────────────────────────
  queue = {
    current: (venueId: string) =>
      this.get<any>(`/queues/venue/${venueId}`),
    advance: (queueId: string) =>
      this.post<any>(`/queues/${queueId}/advance`),
    close: (queueId: string) =>
      this.post<any>(`/queues/${queueId}/close`),
    remove: (queueId: string, entryId: string) =>
      this.delete<void>(`/queues/${queueId}/entries/${entryId}`),
  };

  // ─── Inventory ─────────────────────────────────────────────────────────────
  inventory = {
    list: (params?: { businessScope?: BusinessScope; venueId?: string; lowStockOnly?: boolean; limit?: number; offset?: number }) =>
      this.get<PaginatedResponse<InventoryItem>>('/inventory/items', { params }),
    create: (data: Partial<InventoryItem>) =>
      this.post<InventoryItem>('/inventory/items', data),
    update: (id: string, data: any) =>
      this.patch<InventoryItem>(`/inventory/items/${id}`, data),
    restock: (id: string, quantity: number, reason?: string) =>
      this.post<any>(`/inventory/items/${id}/restock`, { quantity, reason }),
    deduct: (id: string, quantity: number, reason?: string) =>
      this.post<any>(`/inventory/items/${id}/deduct`, { quantity, reason }),
    history: (id: string) =>
      this.get<any[]>(`/inventory/items/${id}/history`),
    alerts: (businessScope?: BusinessScope) =>
      this.get<InventoryItem[]>('/inventory/alerts', { params: { businessScope } }),
  };

  // ─── Menu Items ──────────────────────────────────────────────────────────────
  menu = {
    list: (venueId: string, category?: string) =>
      this.get<{ items: any[]; total: number; categories: string[] }>('/menu', { params: { venueId, category } }),
    get: (id: string) =>
      this.get<any>(`/menu/${id}`),
    create: (data: { venueId: string; name: string; description?: string; category: string; price: number; imageUrl?: string; sortOrder?: number }) =>
      this.post<any>('/menu', data),
    update: (id: string, data: Partial<{ name: string; description: string; category: string; price: number; imageUrl: string; sortOrder: number }>) =>
      this.patch<any>(`/menu/${id}`, data),
    deactivate: (id: string) =>
      this.delete<void>(`/menu/${id}`),
  };

  // ─── Campaigns ─────────────────────────────────────────────────────────────
  campaigns = {
    list: (params?: { limit?: number; offset?: number }) =>
      this.get<PaginatedResponse<NotificationCampaign>>('/campaigns', { params }),
    create: (data: { title: string; body: string; targetScope: string; tierId: string }) =>
      this.post<NotificationCampaign>('/campaigns', data),
    send: (id: string) =>
      this.post<NotificationCampaign>(`/campaigns/${id}/send`),
    listTiers: () =>
      this.get<CampaignTier[]>('/campaigns/tiers'),
  };

  // ─── Venues ────────────────────────────────────────────────────────────────
  venues = {
    list: (params?: { city?: string; limit?: number }) =>
      this.get<PaginatedResponse<Venue>>('/venues', { params }),
    create: (data: Partial<Venue>) =>
      this.post<Venue>('/venues', data),
    update: (id: string, data: Partial<Venue>) =>
      this.patch<Venue>(`/venues/${id}`, data),
    delete: (id: string) =>
      this.delete<void>(`/venues/${id}`),
    updateFloorPlan: (id: string, floorPlanData: { hasFloorPlan: boolean; floorPlanData?: any }) =>
      this.post<Venue>(`/venues/${id}/floor-plan`, floorPlanData),
  };

  // ─── Super Admin ───────────────────────────────────────────────────────────
  superAdmin = {
    getSettings: () =>
      this.get<PlatformSettings>('/super-admin/settings'),
    updateSettings: (data: Partial<Pick<PlatformSettings, 'serviceCharge' | 'commissionRate' | 'commissionPayer' | 'pushNotificationFee'>>) =>
      this.patch<PlatformSettings>('/super-admin/settings', data),
    listUsers: (params?: { limit?: number; offset?: number; role?: string; search?: string }) =>
      this.get<PaginatedResponse<User>>('/super-admin/users', { params }),
    updateScopes: (userId: string, scopes: BusinessScope[]) =>
      this.patch<User>(`/super-admin/users/${userId}/scopes`, { scopes }),
    promote: (userId: string) =>
      this.patch<User>(`/super-admin/users/${userId}/promote`),
    demote: (userId: string) =>
      this.patch<User>(`/super-admin/users/${userId}/demote`),
    getFinancials: (params?: { startDate?: string; endDate?: string }) =>
      this.get<any>('/super-admin/financials', { params }),
    getAuditLogs: (params?: any) =>
      this.get<PaginatedResponse<AuditLog>>('/super-admin/audit-logs', { params }),
    listCampaignTiers: () =>
      this.get<CampaignTier[]>('/super-admin/campaign-tiers'),
    createCampaignTier: (data: { label: string; maxRecipients: number; price: number }) =>
      this.post<CampaignTier>('/super-admin/campaign-tiers', data),
    updateCampaignTier: (id: string, data: Partial<{ label: string; maxRecipients: number; price: number; isActive: boolean }>) =>
      this.patch<CampaignTier>(`/super-admin/campaign-tiers/${id}`, data),
  };
}

export const apiClient = new ApiClient();