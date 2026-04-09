// Enums
export enum BookingStatus {
  INITIATED = 'INITIATED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PENDING_GROUP_PAYMENT = 'PENDING_GROUP_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum BookingType {
  TICKET = 'ticket',
  TABLE = 'table',
  APARTMENT = 'apartment',
  CAR = 'car',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  FULLY_PAID = 'FULLY_PAID',
  REFUNDED = 'REFUNDED',
}

export enum UserRole {
  CUSTOMER = 'customer',
  WAITER = 'waiter',
  KITCHEN_STAFF = 'kitchen_staff',
  BAR_STAFF = 'bar_staff',
  DOOR_STAFF = 'door_staff',
  MANAGER = 'manager',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

// User
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Booking
export interface Booking {
  id: string;
  bookingType: BookingType;
  userId: string;
  status: BookingStatus;
  basePrice: number;
  serviceCharge: number;
  platformCommission: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  guestCount?: number;
  checkInTime?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Order
export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  bookingId: string;
  userId: string;
  status: string;
  items: OrderItem[];
  totalAmount: number;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}