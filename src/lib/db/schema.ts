import {
  pgTable,
  serial,
  text,
  jsonb,
  varchar,
  timestamp,
  integer,
  boolean,
  numeric,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

// Enums
export const storeVerificationStatuses = pgEnum("store_verification_statuses", ["pending", "approved", "rejected"]);
export const stockStatuses = pgEnum("stock_statuses", ["in_stock", "low_stock", "out_of_stock"]);
export const userStatus = pgEnum("user_status", ["pending", "active", "rejected"]);
export const userRoles = pgEnum("user_roles", ["user", "driver", "store", "manager", "admin"]);
export const orderStatuses = pgEnum("order_statuses", ["pending", "in_progress", "delivered", "cancelled"]);
export const paymentStatuses = pgEnum("payment_statuses", ["pending", "paid", "failed", "refunded"]);
export const paymentMethods = pgEnum("payment_methods", ["orange_money", "mobile_money", "cash_on_delivery"]);
export const reportStatuses = pgEnum("report_statuses", ["sales", "deliveries", "users", "driver_performance", "driver_revenue"]);
export const shipmentStatuses = pgEnum("shipment_statuses", ["pending", "in_progress", "delivered", "failed"]);
export const storeDocumentsStatuses = pgEnum("store_documents_statuses", ["pending", "approved", "rejected"]);

// 1. Tables critiques (Fondations)

// Table: users
export const users = pgTable("users", {
  id: serial("id").primaryKey(), // Garde serial au lieu de text avec UUID
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"), // Nullable pour OAuth
  role: userRoles("role").notNull().default("user"),
  status: userStatus("status").notNull().default("pending"),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("fr"),
  uiPreferences: jsonb("ui_preferences"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table accounts avec userId comme integer
export const accounts = pgTable("accounts", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "oauth", "oidc", "email", "credentials"
  provider: text("provider").notNull(), // Ex. "google", "github"
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
});

// Table sessions avec userId comme integer
export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// Table verificationTokens (inchangée sauf nommage)
export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// Table authenticators avec userId comme integer
export const authenticators = pgTable("authenticators", {
  credentialID: text("credential_id").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerAccountId: text("provider_account_id").notNull(),
  credentialPublicKey: text("credential_public_key").notNull(),
  counter: integer("counter").notNull(),
  credentialDeviceType: text("credential_device_type").notNull(),
  credentialBackedUp: boolean("credential_backed_up").notNull(),
  transports: text("transports"),
});

// Table: addresses
export const addresses = pgTable(
  "addresses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }).notNull(),
    recipient: text("recipient").notNull(),
    location: jsonb("location").notNull(),
    postalCode: varchar("postal_code", { length: 10 }),
    region: varchar("region", { length: 50 }).notNull(),
    coordinates: jsonb('coordinates'), // { lat: number, lng: number }
    photoUrl: text("photo_url"),
    deliveryInstructions: text("delivery_instructions"),
    formattedAddress: text("formatted_address"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("addresses_region_idx").on(table.region)]
);

// Table: stores (ex-sellers)
export const stores = pgTable(
  "stores",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    addressId: integer("address_id").references(() => addresses.id, { onDelete: "set null", onUpdate: "cascade" }),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    profileImageUrl: text("profile_image_url"),
    coverImageUrl: text("cover_image_url"),
    activityType: varchar("activity_type", { length: 50 }), // Ex. "retail", "wholesale"
    description: text("description"),
    openingHours: jsonb("opening_hours"), // Ex. { "monday": { "open": "08:00", "close": "18:00" } }
    verificationStatus: storeVerificationStatuses("verification_status").notNull().default("pending"),
    isOpenNow: boolean("is_open_now").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("stores_user_id_idx").on(table.userId)]
);

// Table: products
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    price: integer("price").notNull(),
    weight: integer("weight").notNull().default(10),
    storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade", onUpdate: "cascade" }),
    stockStatus: stockStatuses("stock_status").notNull().default("in_stock"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("products_store_id_idx").on(table.storeId),
    index("products_price_idx").on(table.price),
    index("products_stock_status_idx").on(table.stockStatus),
    index("products_created_at_idx").on(table.createdAt),
    index("products_search_idx").using("gin", sql`to_tsvector('french', ${table.name} || ' ' || COALESCE(${table.description}, ''))`),
  ]
);

// Table: orders
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    originAddressId: integer("origin_address_id").references(() => addresses.id, { onDelete: "set null", onUpdate: "cascade" }),
    destinationAddressId: integer("destination_address_id").references(() => addresses.id, { onDelete: "set null", onUpdate: "cascade" }),
    totalDeliveryFee: integer("total_delivery_fee"),
    status: orderStatuses("status").notNull().default("pending"),
    estimatedDeliveryDate: timestamp("estimated_delivery_date"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },

);

// Table: orderItems
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade", onUpdate: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade", onUpdate: "cascade" }),
    quantity: integer("quantity").notNull(),
    price: integer("price").notNull(),
  },
  (table) => [
    index("order_items_product_id_idx").on(table.productId),
    index("order_items_order_id_idx").on(table.orderId)
  ]
);

// 2. Tables logistiques

// Table: drivers
export const drivers = pgTable(
  "drivers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }).notNull(),
    licenseNumber: varchar("license_number", { length: 20 }),
    isAvailable: boolean("is_available").default(true),
    isIndependent: boolean("is_independent").default(true),
    driverSupportContact: varchar("support_contact", { length: 20 }),
    plateNumber: varchar("plate_number", { length: 20 }).notNull(),
    vehicleType: varchar("vehicle_type", { length: 50 }).notNull(),
    coveredRegions: varchar("covered_regions", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
);

// Table: returns
export const returns = pgTable("returns", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade", onUpdate: "cascade" }),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  returnTrackingId: varchar("return_tracking_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table: shipments
export const shipments = pgTable(
  "shipments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade", onUpdate: "cascade" }),
    multiOrderIds: jsonb("multi_order_ids"),
    driverId: integer("driver_id").references(() => drivers.id, { onDelete: "set null", onUpdate: "cascade" }),
    returnId: integer("return_id").references(() => returns.id, { onDelete: "set null", onUpdate: "cascade" }),
    isManagedByStore: boolean("is_managed_by_store").default(false),
    status: shipmentStatuses("status").notNull().default("pending"),
    lastKnownStatus: varchar("last_known_status", { length: 50 }),
    priorityLevel: varchar("priority_level", { length: 20 }).default("normal"),
    deliveryNotes: text("delivery_notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
);

// Table: tracking
export const tracking = pgTable("tracking", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").references(() => shipments.id, { onDelete: "cascade", onUpdate: "cascade" }),
  latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Table: geolocations
export const geolocations = pgTable(
  "geolocations",
  {
    id: serial("id").primaryKey(),
    driverId: integer("driver_id").references(() => drivers.id, { onDelete: "cascade", onUpdate: "cascade" }),
    latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
);

// Table: storeDrivers (ex-sellerDrivers)
export const storeDrivers = pgTable("store_drivers", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade", onUpdate: "cascade" }),
  driverId: integer("driver_id").references(() => drivers.id, { onDelete: "cascade", onUpdate: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table: schedules
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => drivers.id, { onDelete: "cascade", onUpdate: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. Tables financières

// Table: payments
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade", onUpdate: "cascade" }),
    amount: integer("amount").notNull(),
    paymentMethod: paymentMethods("payment_method").notNull(),
    status: paymentStatuses("status").notNull().default("pending"),
    transactionId: varchar("transaction_id", { length: 100 }).unique(),
    transactionProof: text("transaction_proof"),
    retryCount: integer("retry_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
);

// Table: storeCommissions (ex-sellerCommissions)
export const storeCommissions = pgTable("store_commissions", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade", onUpdate: "cascade" }),
  commissionRate: integer("commission_rate").notNull(),
  commissionAmount: integer("commission_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table: platformFees
export const platformFees = pgTable("platform_fees", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade", onUpdate: "cascade" }),
  storeFee: integer("store_fee").notNull(),
  deliveryFee: integer("delivery_fee").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table: driverPayments
export const driverPayments = pgTable("driver_payments", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => drivers.id, { onDelete: "cascade", onUpdate: "cascade" }),
  amount: integer("amount").notNull(),
  commissionRate: integer("commission_rate").notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").default("pending"),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table: dynamicDeliveryFees
export const dynamicDeliveryFees = pgTable("dynamic_delivery_fees", {
  id: serial("id").primaryKey(),
  region: varchar("region", { length: 50 }).notNull(),
  weightMin: integer("weight_min").notNull(),
  weightMax: integer("weight_max").notNull(),
  distanceMin: integer("distance_min").notNull(),
  distanceMax: integer("distance_max").notNull(),
  fee: integer("fee").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 4. Tables d’interaction utilisateur

// Table: userPreferences
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  sortPreference: varchar("sort_preference", { length: 50 }), // Ex. "price_asc"
  filterCategories: jsonb("filter_categories"), // Ex. ["electronics"]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table: notifications
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    message: text("message").notNull(),
    type: varchar("type", { length: 50 }),
    priority: varchar("priority", { length: 20 }).default("normal"),
    status: varchar("status", { length: 50 }).notNull().default("unread"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
);

// Table: storeMessages
export const storeMessages = pgTable("store_messages", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade", onUpdate: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table: supportTickets
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).default("open").notNull(),
  priority: varchar("priority", { length: 50 }).default("medium").notNull(),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table: ticketMessages
export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => supportTickets.id, { onDelete: "cascade", onUpdate: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table: wishlists
export const wishlists = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade", onUpdate: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table: reviews
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade", onUpdate: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
},
  (table) => [
    index("reviews_product_id_rating_idx").on(table.productId, table.rating),
  ]
);

// Table: driverReviews
export const driverReviews = pgTable("driver_reviews", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => drivers.id, { onDelete: "cascade", onUpdate: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  response: text("response"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 5. Tables de personnalisation produit

// Table: productCategories
export const productCategories = pgTable(
  "product_categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

// Table: productCategoryRelation
export const productCategoryRelation = pgTable(
  "product_category_relation",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade", onUpdate: "cascade" }),
    categoryId: integer("category_id").references(() => productCategories.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    index("product_category_relation_product_id_idx").on(table.productId),
    index("product_category_relation_category_id_idx").on(table.categoryId),
  ]
);

// Table: productVariants
export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade", onUpdate: "cascade" }),
    variantType: varchar("variant_type", { length: 50 }).notNull(),
    variantValue: varchar("variant_value", { length: 50 }).notNull(),
    price: integer("price").notNull(),
    stock: integer("stock").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("product_variants_product_id_idx").on(table.productId),
    index("product_variants_type_value_idx").on(table.productId, table.variantType, table.variantValue)
  ]
);

// Table: productStocks
export const productStocks = pgTable(
  "product_stocks",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade", onUpdate: "cascade" }),
    stockLevel: integer("stock_level").notNull(),
    reservedStock: integer("reserved_stock").notNull().default(0),
    availableStock: integer("available_stock").notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("product_stocks_product_id_idx").on(table.productId),
    index("product_stocks_available_stock_idx").on(table.availableStock),
    sql`CONSTRAINT stock_consistency CHECK (available_stock = stock_level - reserved_stock)`
  ]
);

// Table: productImages
export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade", onUpdate: "cascade" }).notNull(),
    imageUrl: text("image_url").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("product_images_product_id_idx").on(table.productId),
  ]
);

// Table: promotions
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade", onUpdate: "cascade" }),
  code: varchar("code", { length: 100 }).unique(),
  discountPercentage: numeric("discount_percentage", { precision: 5, scale: 2 }).notNull(),// Ex. 12.50%
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isExpired: boolean("is_expired").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("promotions_discount_idx").on(table.discountPercentage),
]);


// Table: productPromotions
export const productPromotions = pgTable(
  "product_promotions",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade", onUpdate: "cascade" }),
    promotionId: integer("promotion_id").references(() => promotions.id, { onDelete: "cascade", onUpdate: "cascade" }),
    targetAudience: varchar("target_audience", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("product_promotions_product_id_idx").on(table.productId),
    index("product_promotions_promotion_id_idx").on(table.promotionId),
    index("product_promotions_product_promotion_idx").on(table.productId, table.promotionId)
  ]
);

// 6. Tables de gestion des retours

// Table: orderStatusHistory
export const orderStatusHistory = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade", onUpdate: "cascade" }),
  status: orderStatuses("status").notNull(),
  changedAt: timestamp("changed_at").defaultNow(),
  changedBy: integer("changed_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
});

// 7. Tables analytiques et admin

// Table: storeAnalytics (ex-sellerAnalytics)
export const storeAnalytics = pgTable(
  "store_analytics",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade", onUpdate: "cascade" }),
    totalSales: integer("total_sales").notNull().default(0),
    totalOrders: integer("total_orders").notNull().default(0),
    avgDeliveryTime: integer("avg_delivery_time"),
    salesTrend: jsonb("sales_trend"), // Ex. { "last30Days": [100, 200] }
    topProducts: jsonb("top_products"), // Ex. [{ productId: 1, sales: 50 }]
    updatedAt: timestamp("updated_at").defaultNow(),
  },
);

// Table: reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  type: reportStatuses("type").notNull(),
  version: integer("version").default(1),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  filters: jsonb("filters"),
  relatedEntityId: integer("related_entity_id"),
  generatedBy: integer("generated_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  data: jsonb("data").notNull(),
  title: varchar("title", { length: 255 }),
  preview: text("preview"),
  exportFormat: varchar("export_format", { length: 10 }),
  exportUrl: text("export_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table: auditLogs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  action: varchar("action", { length: 255 }).notNull(),
  details: jsonb("details").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table: storeDocuments (ex-sellerDocuments)
export const storeDocuments = pgTable("store_documents", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade", onUpdate: "cascade" }),
  documentType: varchar("document_type", { length: 100 }).notNull(),
  documentUrl: varchar("document_url", { length: 255 }).notNull(),
  status: storeDocumentsStatuses("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table: storeActivities (ex-sellerActivities)
export const storeActivities = pgTable("store_activities", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade", onUpdate: "cascade" }),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table: partners
export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  serviceType: varchar("service_type", { length: 50 }).notNull(),
  apiKey: text("api_key").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table: referrals
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  referralCode: varchar("referral_code", { length: 50 }).notNull().unique(),
  referredUserId: integer("referred_user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 8. Table de résilience réseau

// Table: offlineQueue
export const offlineQueue = pgTable("offline_queue", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  quantity: integer("quantity").notNull().default(1),
  variantId: integer("variant_id")
    .references(() => productVariants.id, { onDelete: "set null" }), // Nullable pour produits sans variante
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
