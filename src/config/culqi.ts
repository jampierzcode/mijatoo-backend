import { env } from './env';

const CULQI_API_URL = 'https://api.culqi.com/v2';

interface CulqiRequestOptions {
  method: string;
  path: string;
  body?: Record<string, unknown>;
  secretKey: string;
}

export class CulqiError extends Error {
  public statusCode: number;
  public merchantMessage: string;
  public userMessage: string;
  public raw: unknown;

  constructor(data: any, statusCode = 400) {
    super(data.merchant_message || data.user_message || 'Error de Culqi');
    this.name = 'CulqiError';
    this.statusCode = statusCode;
    this.merchantMessage = data.merchant_message || '';
    this.userMessage = data.user_message || 'Error procesando el pago';
    this.raw = data;
  }
}

async function culqiRequest({ method, path, body, secretKey }: CulqiRequestOptions): Promise<any> {
  const response = await fetch(`${CULQI_API_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new CulqiError(data, response.status);
  }
  return data;
}

// ============================================================
// Client for hotel guest payments (uses hotel's own Culqi keys)
// ============================================================

export class CulqiHotelClient {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async createCharge(params: {
    amount: number; // centimos (e.g., 1000 = S/10.00)
    currencyCode?: string;
    email: string;
    sourceId: string; // token from Culqi.js
    description?: string;
    metadata?: Record<string, string>;
  }) {
    return culqiRequest({
      method: 'POST',
      path: '/charges',
      secretKey: this.secretKey,
      body: {
        amount: params.amount,
        currency_code: params.currencyCode || 'PEN',
        email: params.email,
        source_id: params.sourceId,
        description: params.description,
        metadata: params.metadata,
      },
    });
  }

  async getCharge(chargeId: string) {
    return culqiRequest({
      method: 'GET',
      path: `/charges/${chargeId}`,
      secretKey: this.secretKey,
    });
  }

  async refundCharge(chargeId: string, amount: number, reason: string) {
    return culqiRequest({
      method: 'POST',
      path: '/refunds',
      secretKey: this.secretKey,
      body: {
        charge_id: chargeId,
        amount,
        reason,
      },
    });
  }
}

// ============================================================
// Client for Jato subscription billing (uses Jato's own keys)
// ============================================================

class CulqiJatoClient {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  // --- Plans ---
  async createPlan(params: {
    name: string;
    amount: number;
    currencyCode?: string;
    interval: 'dias' | 'semanas' | 'meses' | 'anios';
    intervalCount: number;
    description?: string;
    metadata?: Record<string, string>;
  }) {
    return culqiRequest({
      method: 'POST',
      path: '/plans',
      secretKey: this.secretKey,
      body: {
        name: params.name,
        amount: params.amount,
        currency_code: params.currencyCode || 'PEN',
        interval: params.interval,
        interval_count: params.intervalCount,
        description: params.description,
        metadata: params.metadata,
      },
    });
  }

  async getPlan(planId: string) {
    return culqiRequest({
      method: 'GET',
      path: `/plans/${planId}`,
      secretKey: this.secretKey,
    });
  }

  async deletePlan(planId: string) {
    return culqiRequest({
      method: 'DELETE',
      path: `/plans/${planId}`,
      secretKey: this.secretKey,
    });
  }

  // --- Customers ---
  async createCustomer(params: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    address?: string;
    addressCity?: string;
  }) {
    return culqiRequest({
      method: 'POST',
      path: '/customers',
      secretKey: this.secretKey,
      body: {
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        phone_number: params.phone,
        address: params.address,
        address_city: params.addressCity,
        country_code: 'PE',
      },
    });
  }

  async getCustomer(customerId: string) {
    return culqiRequest({
      method: 'GET',
      path: `/customers/${customerId}`,
      secretKey: this.secretKey,
    });
  }

  // --- Cards ---
  async saveCard(customerId: string, tokenId: string) {
    return culqiRequest({
      method: 'POST',
      path: '/cards',
      secretKey: this.secretKey,
      body: {
        customer_id: customerId,
        token_id: tokenId,
      },
    });
  }

  async deleteCard(cardId: string) {
    return culqiRequest({
      method: 'DELETE',
      path: `/cards/${cardId}`,
      secretKey: this.secretKey,
    });
  }

  // --- Subscriptions ---
  async createSubscription(cardId: string, planId: string, metadata?: Record<string, string>) {
    return culqiRequest({
      method: 'POST',
      path: '/subscriptions',
      secretKey: this.secretKey,
      body: {
        card_id: cardId,
        plan_id: planId,
        metadata,
      },
    });
  }

  async getSubscription(subscriptionId: string) {
    return culqiRequest({
      method: 'GET',
      path: `/subscriptions/${subscriptionId}`,
      secretKey: this.secretKey,
    });
  }

  async cancelSubscription(subscriptionId: string) {
    return culqiRequest({
      method: 'DELETE',
      path: `/subscriptions/${subscriptionId}`,
      secretKey: this.secretKey,
    });
  }

  // --- One-time charge (for manual subscription payments) ---
  async createCharge(params: {
    amount: number;
    email: string;
    sourceId: string;
    description?: string;
    metadata?: Record<string, string>;
  }) {
    return culqiRequest({
      method: 'POST',
      path: '/charges',
      secretKey: this.secretKey,
      body: {
        amount: params.amount,
        currency_code: 'PEN',
        email: params.email,
        source_id: params.sourceId,
        description: params.description,
        metadata: params.metadata,
      },
    });
  }
}

// Singleton for Jato's own billing (from .env)
export const culqiJato = env.CULQI_SECRET_KEY
  ? new CulqiJatoClient(env.CULQI_SECRET_KEY)
  : null;

// Factory for hotel-specific clients
export function createHotelCulqiClient(secretKey: string): CulqiHotelClient {
  return new CulqiHotelClient(secretKey);
}
