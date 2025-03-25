// Enums
export const orderStatuses = ["pending", "in_progress", "delivered", "cancelled"] as const;
export const shipmentStatuses = ["pending", "in_progress", "delivered", "failed"] as const;
export const paymentStatuses = ["pending", "paid", "failed"] as const;
export const sellerDocumentsStatuses = ["pending", "approved", "rejected"] as const;

export type OrderStatus = typeof orderStatuses[number];
export type ShipmentStatus = typeof shipmentStatuses[number];
export type PaymentStatus = typeof paymentStatuses[number];
export type SellerDocumentStatus = typeof sellerDocumentsStatuses[number];

// Types des tables
export interface Seller {
  id: number;
  userId: number;
  name: string;
  addressId?: number;
  phoneNumber: string;
  email: string;
  profileImageUrl: string | null; // Nouveau champ pour l’image de profil
  coverImageUrl: string | null;   // Nouveau champ pour l’image de couverture
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  weight: number;
  sellerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductStock {
  id: number;
  productId: number;
  warehouseLocation?: string;
  stockLevel: number;
  reservedStock: number;
  availableStock: number;
  updatedAt: string;
}

export interface ProductImage {
  id: number;
  productId: number;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: number;
  productId: number;
  variantType: string; // ex: "couleur"
  variantValue: string; // ex: "rouge"
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: number;
  code: string;
  discountPercentage: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface ProductPromotion {
  id: number;
  productId: number;
  promotionId: number;
  createdAt: string;
}
export interface Order {
  id: number;
  userId: number;
  originAddressId?: number;
  destinationAddressId?: number;
  totalDeliveryFee?: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
}

export interface Shipment {
  id: number;
  orderId: number;
  driverId?: number;
  status: ShipmentStatus;
  isManagedBySeller: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: number;
  userId: number;
  licenseNumber?: string;
  isAvailable: boolean;
  vehicleType: string;
  plateNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface SellerDriver {
  id: number;
  sellerId: number;
  driverId: number;
  createdAt: string;
}

export interface SellerCommission {
  id: number;
  sellerId: number;
  commissionRate: number;
  commissionAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformFee {
  id: number;
  orderId: number;
  sellerFee: number;
  deliveryFee: number;
  createdAt: string;
}

export interface Payment {
  id: number;
  orderId: number;
  amount: number;
  paymentMethod: string;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SellerDocument {
  id: number;
  sellerId: number;
  documentType: string;
  documentUrl: string;
  status: SellerDocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SellerActivity {
  id: number;
  sellerId: number;
  activityType: string;
  description?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  userId: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: number;
  type: "sales" | "deliveries" | "users" | "driver_performance" | "driver_revenue";
  startDate?: string;
  endDate?: string;
  data: any; // JSON
  exportUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Nouveaux types pour catégories
export interface ProductCategory {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategoryRelation {
  id: number;
  productId: number;
  categoryId: number;
}
export interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  role: "user" | "driver" | "seller" | "manager" | "admin";
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: number;
  userId: number;
  recipient: string;
  location: { [key: string]: any }; // JSONB
  postalCode: string | null;
  region: string;
  coordinates: { lat: number; lng: number } | null; // JSONB
  photoUrl: string | null;
  formattedAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerActivity {
  id: number;
  sellerId: number;
  activityType: string;
  description?: string;
  createdAt: string;
}
// Ajoutez d'autres types si nécessaire (ex: Tracking, Returns)