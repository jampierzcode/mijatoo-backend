export const VALID_ROOM_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ['RESERVED', 'OCCUPIED', 'MAINTENANCE', 'CLEANING'],
  RESERVED: ['AVAILABLE', 'OCCUPIED', 'CANCELLED'],
  OCCUPIED: ['CLEANING', 'AVAILABLE'],
  MAINTENANCE: ['AVAILABLE'],
  CLEANING: ['AVAILABLE'],
};

export const VALID_RESERVATION_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['CHECKED_OUT'],
  CHECKED_OUT: [],
  CANCELLED: [],
};

export const TRIAL_DAYS = 7;

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  TRIALING: 'Periodo de prueba',
  ACTIVE: 'Activa',
  PAST_DUE: 'Pago pendiente',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};

export const DEMO_REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONTACTED: 'Contactado',
  CONVERTED: 'Convertido',
  REJECTED: 'Rechazado',
};

export const INTERVAL_UNIT_LABELS: Record<string, string> = {
  DAY: 'dia',
  WEEK: 'semana',
  MONTH: 'mes',
  YEAR: 'año',
};
