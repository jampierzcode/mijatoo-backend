import { prisma } from '../../config';
import { createHotelCulqiClient, CulqiError } from '../../config/culqi';

export class PaymentService {
  /**
   * Process a guest payment for a reservation using the hotel's Culqi account.
   * The frontend sends a Culqi token (created with Culqi.js using the hotel's public key).
   */
  async chargeReservation(reservationId: string, culqiToken: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { hotel: true },
    });
    if (!reservation) throw new Error('Reserva no encontrada');
    if (reservation.paymentStatus === 'PAID') throw new Error('La reserva ya fue pagada');

    const hotel = reservation.hotel;
    if (!hotel.culqiSecretKey) {
      throw new Error('Este hotel no tiene configurada su cuenta de Culqi. Contacta al administrador del hotel.');
    }

    const culqi = createHotelCulqiClient(hotel.culqiSecretKey);

    try {
      const charge = await culqi.createCharge({
        amount: Math.round(reservation.totalPrice * 100), // soles → centimos
        currencyCode: 'PEN',
        email: reservation.guestEmail,
        sourceId: culqiToken,
        description: `Reserva #${reservationId.slice(0, 8)} - ${hotel.name}`,
        metadata: {
          reservationId: reservation.id,
          hotelId: hotel.id,
          guestName: `${reservation.guestFirstName} ${reservation.guestLastName}`,
        },
      });

      await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          culqiChargeId: charge.id,
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
        },
      });

      return { chargeId: charge.id, status: 'PAID' };
    } catch (err) {
      if (err instanceof CulqiError) {
        await prisma.reservation.update({
          where: { id: reservationId },
          data: { paymentStatus: 'FAILED' },
        });
        throw new Error(err.userMessage || 'Error procesando el pago');
      }
      throw err;
    }
  }

  /**
   * Get the Culqi public key for a hotel (needed by frontend to initialize Culqi.js)
   */
  async getHotelPublicKey(hotelId: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { culqiPublicKey: true },
    });
    if (!hotel) throw new Error('Hotel no encontrado');
    return { publicKey: hotel.culqiPublicKey || null };
  }

  /**
   * Handle Culqi webhook events for guest payments
   */
  async handleWebhook(event: any) {
    const type = event.type || event.object;

    if (type === 'charge' && event.id) {
      const chargeId = event.id;
      const reservation = await prisma.reservation.findFirst({
        where: { culqiChargeId: chargeId },
      });
      if (!reservation) return;

      if (event.outcome?.type === 'venta_exitosa') {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
        });
      }
    }
  }
}
