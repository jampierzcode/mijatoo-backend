import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  phone: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z.string().min(6, 'Nueva contraseña debe tener al menos 6 caracteres'),
});

export const convertDemoToHotelSchema = z.object({
  hotelName: z.string().min(1, 'Nombre del hotel requerido'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug solo puede contener letras minúsculas, números y guiones'),
  address: z.string().min(1, 'Dirección requerida'),
  city: z.string().min(1, 'Ciudad requerida'),
  adminEmail: z.string().email('Email inválido'),
  adminFirstName: z.string().min(1, 'Nombre requerido'),
  adminLastName: z.string().min(1, 'Apellido requerido'),
  adminPassword: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
});

// Hotel schemas
export const createHotelSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  slug: z.string().min(1, 'Slug es requerido').regex(/^[a-z0-9-]+$/, 'Slug solo puede contener letras minúsculas, números y guiones'),
  description: z.string().optional(),
  address: z.string().min(1, 'Dirección es requerida'),
  city: z.string().min(1, 'Ciudad es requerida'),
  country: z.string().min(1, 'País es requerido'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
});

export const updateHotelSchema = createHotelSchema.partial();

// Room Category schemas
export const createRoomCategorySchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  slug: z.string().min(1, 'Slug es requerido').regex(/^[a-z0-9-]+$/, 'Slug solo puede contener letras minúsculas, números y guiones'),
  description: z.string().optional(),
  type: z.string().min(1, 'Tipo es requerido'),
  capacity: z.number().int().min(1, 'Capacidad mínima es 1'),
  pricePerNight: z.number().min(0, 'Precio no puede ser negativo'),
  amenities: z.array(z.string()).optional(),
  coverImageUrl: z.string().optional(),
  galleryImages: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const updateRoomCategorySchema = createRoomCategorySchema.partial();

// Room schemas
export const createRoomSchema = z.object({
  roomNumber: z.string().min(1, 'Número de habitación es requerido'),
  name: z.string().min(1, 'Nombre es requerido'),
  categoryId: z.string().uuid('ID de categoría inválido'),
});

export const updateRoomSchema = createRoomSchema.partial();

export const updateRoomStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'CLEANING']),
});

// Reservation schemas
export const createReservationSchema = z.object({
  categoryId: z.string().uuid('ID de categoría inválido'),
  roomId: z.string().uuid('ID de habitación inválido').optional(),
  guestId: z.string().uuid('ID de cliente inválido').optional(),
  guestFirstName: z.string().min(1, 'Nombre del huésped es requerido'),
  guestLastName: z.string().min(1, 'Apellido del huésped es requerido'),
  guestEmail: z.string().email('Email inválido'),
  guestPhone: z.string().optional(),
  checkIn: z.string().refine((d) => !isNaN(Date.parse(d)), 'Fecha de check-in inválida'),
  checkOut: z.string().refine((d) => !isNaN(Date.parse(d)), 'Fecha de check-out inválida'),
  numberOfGuests: z.number().int().min(1, 'Mínimo 1 huésped'),
  notes: z.string().optional(),
});

export const updateReservationStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']),
});

// Guest schemas
export const createGuestSchema = z.object({
  documentType: z.enum(['DNI', 'PASSPORT', 'CE', 'RUC', 'OTHER']),
  documentNumber: z.string().min(1, 'Número de documento es requerido'),
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
});

export const updateGuestSchema = createGuestSchema.partial();

// Product Category schemas
export const createProductCategorySchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateProductCategorySchema = createProductCategorySchema.partial();

// Product schemas
export const createProductSchema = z.object({
  categoryId: z.string().uuid('ID de categoría inválido'),
  name: z.string().min(1, 'Nombre es requerido'),
  description: z.string().optional(),
  price: z.number().min(0, 'Precio no puede ser negativo'),
  imageUrl: z.string().optional(),
  stock: z.number().int().min(0, 'Stock no puede ser negativo'),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

// Product Sale schemas
export const createProductSaleSchema = z.object({
  productId: z.string().uuid('ID de producto inválido'),
  roomId: z.string().uuid('ID de habitación inválido'),
  reservationId: z.string().uuid('ID de reserva inválido').optional(),
  quantity: z.number().int().min(1, 'Cantidad mínima es 1'),
});

// Payment schemas (Culqi)
export const chargeReservationSchema = z.object({
  reservationId: z.string().uuid('ID de reserva inválido'),
  culqiToken: z.string().min(1, 'Token de Culqi es requerido'),
});

// Public reservation schema
export const publicReservationSchema = z.object({
  categoryId: z.string().uuid('ID de categoría inválido'),
  guestFirstName: z.string().min(1, 'Nombre del huésped es requerido'),
  guestLastName: z.string().min(1, 'Apellido del huésped es requerido'),
  guestEmail: z.string().email('Email inválido'),
  guestPhone: z.string().optional(),
  checkIn: z.string().refine((d) => !isNaN(Date.parse(d)), 'Fecha de check-in inválida'),
  checkOut: z.string().refine((d) => !isNaN(Date.parse(d)), 'Fecha de check-out inválida'),
  numberOfGuests: z.number().int().min(1, 'Mínimo 1 huésped'),
  notes: z.string().optional(),
});

// Hotel settings schema (expanded)
export const updateHotelSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  ruc: z.string().optional().nullable(),
  businessName: z.string().optional().nullable(),
  fiscalAddress: z.string().optional().nullable(),
  serieBoleta: z.string().optional(),
  checkInFrom: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM').optional().nullable(),
  checkInUntil: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM').optional().nullable(),
  checkOutUntil: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM').optional().nullable(),
  earlyCheckoutPolicy: z.enum(['CHARGE_ACTUAL', 'CHARGE_FULL', 'PENALTY_PERCENT', 'PENALTY_FIXED']).optional(),
  earlyCheckoutPenalty: z.number().min(0).optional(),
  culqiPublicKey: z.string().optional().nullable(),
  culqiSecretKey: z.string().optional().nullable(),
});

// Walk-in reservation schema
export const walkInReservationSchema = z.object({
  categoryId: z.string().uuid('ID de categoría inválido'),
  guestId: z.string().uuid('ID de cliente inválido').optional(),
  guestFirstName: z.string().min(1, 'Nombre del huésped es requerido'),
  guestLastName: z.string().min(1, 'Apellido del huésped es requerido'),
  guestEmail: z.string().email('Email inválido'),
  guestPhone: z.string().optional(),
  checkOut: z.string().refine((d) => !isNaN(Date.parse(d)), 'Fecha de check-out inválida'),
  numberOfGuests: z.number().int().min(1, 'Mínimo 1 huésped'),
  notes: z.string().optional(),
});

// Assign room schema
export const assignRoomSchema = z.object({
  roomId: z.string().uuid('ID de habitación inválido'),
});

// Assign admin schema
export const assignAdminSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
});

// Update admin email schema
export const updateAdminEmailSchema = z.object({
  email: z.string().email('Email inválido'),
});

// Plan schemas
export const createPlanSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  slug: z.string().min(1, 'Slug es requerido').regex(/^[a-z0-9-]+$/, 'Slug solo puede contener letras minúsculas, números y guiones'),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export const updatePlanSchema = createPlanSchema.partial();

// Plan Price schemas
export const createPlanPriceSchema = z.object({
  intervalCount: z.number().int().min(1, 'Intervalo mínimo es 1'),
  intervalUnit: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']),
  price: z.number().min(0, 'Precio no puede ser negativo'),
  currency: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updatePlanPriceSchema = createPlanPriceSchema.partial();

// Subscription schemas
export const assignSubscriptionPlanSchema = z.object({
  planPriceId: z.string().uuid('ID de precio de plan inválido'),
});

export const selectPlanSchema = z.object({
  planPriceId: z.string().uuid('ID de precio de plan inválido'),
  isRenewal: z.boolean().optional(),
});

export const registerSubscriptionPaymentSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a 0'),
  method: z.enum(['CASH', 'TRANSFER', 'YAPE', 'PLIN', 'CARD', 'OTHER']),
  notes: z.string().optional(),
  receiptNumber: z.string().optional(),
});

export const createSubscriptionForHotelSchema = z.object({
  hotelId: z.string().uuid('ID de hotel inválido'),
  planPriceId: z.string().uuid('ID de precio de plan inválido'),
});

export const updateSubscriptionStatusSchema = z.object({
  status: z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED']),
});

// Demo Request schemas
export const createDemoRequestSchema = z.object({
  businessName: z.string().min(1, 'Nombre del negocio es requerido'),
  contactName: z.string().min(1, 'Nombre de contacto es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  city: z.string().optional(),
  numberOfRooms: z.number().int().min(1).optional(),
  message: z.string().optional(),
});

export const updateDemoRequestStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONTACTED', 'CONVERTED', 'REJECTED']),
});

// Public hotel registration schema
export const publicRegisterSchema = z.object({
  hotelName: z.string().min(1, 'Nombre del hotel es requerido'),
  slug: z.string().min(1, 'Slug es requerido').regex(/^[a-z0-9-]+$/, 'Slug solo puede contener letras minúsculas, números y guiones'),
  address: z.string().min(1, 'Dirección es requerida'),
  city: z.string().min(1, 'Ciudad es requerida'),
  phone: z.string().optional(),
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
});
