// ─── Enums ────────────────────────────────────────────────────────────────────

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

export enum BusinessScope {
  CAR_RENTAL = 'CAR_RENTAL',
  APARTMENT = 'APARTMENT',
  TABLE_CLUB = 'TABLE_CLUB',
  EVENT_TICKETING = 'EVENT_TICKETING',
}

export enum OrderStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  ROUTED = 'ROUTED',
  IN_PREPARATION = 'IN_PREPARATION',
  READY = 'READY',
  SERVED = 'SERVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  businessScopes?: BusinessScope[] | null;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  bookingType: BookingType;
  userId: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  resourceId: string;
  status: BookingStatus;
  basePrice: number;
  serviceCharge: number;
  platformCommission: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  guestCount?: number;
  qrCodeData?: string;
  scannedAt?: string;
  cautionFeeStatus: 'HELD' | 'REFUNDED' | 'FORFEITED';
  cautionFeeAmount: number;
  cautionFeeResolvedAt?: string;
  checkInTime?: string;
  completedAt?: string;
  cancelledAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ─── Order ────────────────────────────────────────────────────────────────────

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
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  assignedToUserId?: string;
  stationId?: string;
  tableInfo?: {
    tableId: string;
    tableName: string;
    category: string;
    venueId: string;
  };
  pickupLocation?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  name: string;
  description: string;
  venueId?: string;
  startDate: string;
  endDate: string;
  capacity: number;
  djs: string[];
  genre?: string;
  dresscode?: string;
  status: 'active' | 'cancelled' | 'completed';
  ticketPrice: number;
  images: string[];
  commissionPayer?: CommissionPayer;
  createdAt: string;
  updatedAt: string;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  price: number;
  capacity: number;
  sold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Venue ────────────────────────────────────────────────────────────────────

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  maxCapacity: number;
  ownerId?: string;
  mediaUrls: string[];
  isActive: boolean;
  allowWalkInOrders?: boolean;
  hasFloorPlan?: boolean;
  floorPlanData?: {
    width: number;
    height: number;
    backgroundImage?: string;
    tables: Array<{
      tableId: string;
      x: number;
      y: number;
      rotation: number;
      width: number;
      height: number;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export interface ApartmentListing {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pricePerNight: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  cautionFee: number;
  cautionFeeRefundable: boolean;
  houseRules?: string;
  unavailableDates?: string[];
  amenities: string[];
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CarListing {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  transmission: string;
  category: string;
  seats: number;
  pricePerDay: number;
  cautionFee: number;
  cautionFeeRefundable: boolean;
  unavailableDates?: string[];
  assignedDriverId?: string;
  description: string;
  features: string[];
  images: string[];
  city: string;
  state: string;
  withDriver: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  lowStockThreshold: number;
  venueId?: string;
  businessScope: BusinessScope;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  type: 'RESTOCK' | 'DEDUCTION' | 'ADJUSTMENT';
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  reason?: string;
  performedBy: string;
  performedByRole?: string;
  performedByUser?: { firstName: string; lastName: string; role: string } | null;
  createdAt: string;
}

// ─── Campaign ─────────────────────────────────────────────────────────────────

export interface NotificationCampaign {
  id: string;
  createdBy: string;
  title: string;
  body: string;
  targetScope: BusinessScope | 'ALL';
  tierId: string | null;
  tierMaxRecipients: number | null;
  status: 'DRAFT' | 'SENT' | 'FAILED';
  sentAt?: string;
  recipientCount: number;
  feePaid: number;
  paymentStatus: 'PAID' | 'UNPAID';
  createdAt: string;
}

export interface CampaignTier {
  id: string;
  label: string;
  maxRecipients: number;
  price: number;
  isActive: boolean;
  createdAt: string;
}

// ─── Platform Settings ────────────────────────────────────────────────────────

export enum CommissionPayer {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface PlatformSettings {
  id: string;
  serviceCharge: number;
  commissionRate: number;
  commissionPayer: CommissionPayer;
  pushNotificationFee: number;
  updatedBy?: string;
  updatedAt: string;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actionType: string;
  actorId: string;
  actorRole?: string;
  resourceType?: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  bookings?: {
    total: number;
    confirmed: number;
    cancelled: number;
    conversionRate: string;
  };
  revenue?: {
    total: number;
    platformCommission: number;
  };
  orders?: {
    total: number;
    completionRate: string;
    averageValue: number;
  };
  totalBookings: number;
  totalRevenue: number;
  activeBookings: number;
  todayRevenue: number;
  bookingsByType: Record<string, number>;
}

// ─── Shared API types ─────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface TableListing {
  id: string;
  venueId: string;
  name: string;
  category: string;
  capacity: number;
  price: number;
  description?: string;
  features?: string[];
  isActive: boolean;
  floorPlanPosition?: {
    x: number;
    y: number;
    rotation: number;
    width: number;
    height: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit?: number;
  offset?: number;
}