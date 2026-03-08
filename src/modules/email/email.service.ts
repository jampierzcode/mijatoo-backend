import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

interface ReservationEmailData {
  guestName: string;
  guestEmail: string;
  hotelName: string;
  categoryName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  numberOfGuests: number;
  reservationId: string;
}

export class EmailService {
  async sendDemoRequestConfirmation(data: {
    businessName: string;
    contactName: string;
    email: string;
  }) {
    if (!resend) {
      console.log('[Email] Resend not configured, skipping demo confirmation email');
      return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;">
          <tr>
            <td style="background-color:#6366f1;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0 0 4px 0;font-weight:700;">Mijatoo</h1>
              <p style="color:#c7d2fe;font-size:13px;margin:0;">Gestion Hotelera Inteligente</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:32px;">
              <h2 style="color:#111827;font-size:20px;margin:0 0 16px 0;">Hola ${data.contactName},</h2>
              <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
                Hemos recibido tu solicitud de demo para <strong>${data.businessName}</strong>. Nuestro equipo ya esta revisando tu informacion.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ff;border-radius:8px;border:1px solid #c7d2fe;">
                <tr>
                  <td style="padding:20px;">
                    <p style="color:#4338ca;font-size:15px;font-weight:600;margin:0 0 8px 0;">Que sigue?</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <table cellpadding="0" cellspacing="0"><tr>
                            <td style="vertical-align:top;padding-right:10px;"><span style="display:inline-block;width:24px;height:24px;background-color:#6366f1;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">1</span></td>
                            <td style="color:#374151;font-size:14px;line-height:1.5;">Un miembro de nuestro equipo revisara tu solicitud.</td>
                          </tr></table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <table cellpadding="0" cellspacing="0"><tr>
                            <td style="vertical-align:top;padding-right:10px;"><span style="display:inline-block;width:24px;height:24px;background-color:#6366f1;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">2</span></td>
                            <td style="color:#374151;font-size:14px;line-height:1.5;">Te contactaremos en menos de <strong>24 horas</strong> para coordinar tu demo personalizada.</td>
                          </tr></table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <table cellpadding="0" cellspacing="0"><tr>
                            <td style="vertical-align:top;padding-right:10px;"><span style="display:inline-block;width:24px;height:24px;background-color:#6366f1;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">3</span></td>
                            <td style="color:#374151;font-size:14px;line-height:1.5;">Configuraremos tu hotel en la plataforma y te daremos acceso con <strong>7 dias de prueba gratis</strong>.</td>
                          </tr></table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:20px 0 0 0;">
                Mientras tanto, puedes conocer mas sobre nuestras funcionalidades en <a href="https://mijatoo.com/funcionalidades" style="color:#6366f1;text-decoration:underline;">mijatoo.com</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0 0 4px 0;">Mijatoo - Sistema de gestion hotelera para Peru</p>
              <p style="color:#9ca3af;font-size:11px;margin:0;">hola@mijatoo.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      const result = await resend.emails.send({
        from: `Mijatoo <${fromEmail}>`,
        to: data.email,
        subject: `Recibimos tu solicitud - Mijatoo`,
        html,
      });
      console.log(`[Email] Demo confirmation sent to ${data.email}`, result);
    } catch (err: any) {
      console.error('[Email] Failed to send demo confirmation:', err?.message || err);
    }
  }

  async sendDemoRequestNotification(data: {
    businessName: string;
    contactName: string;
    email: string;
    phone?: string;
    city?: string;
    numberOfRooms?: number;
    message?: string;
  }) {
    if (!resend) {
      console.log('[Email] Resend not configured, skipping demo request notification');
      return;
    }

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'jampierv127@gmail.com';
    const adminUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;">
          <tr>
            <td style="background-color:#6366f1;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:#ffffff;font-size:20px;margin:0;">Nueva Solicitud de Demo</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:32px;">
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
                <strong>${data.contactName}</strong> de <strong>${data.businessName}</strong> ha solicitado una demo de Mijatoo.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Negocio</span><br><span style="color:#111827;font-size:15px;font-weight:600;">${data.businessName}</span></td></tr>
                      <tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Contacto</span><br><span style="color:#111827;font-size:15px;">${data.contactName}</span></td></tr>
                      <tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Email</span><br><a href="mailto:${data.email}" style="color:#6366f1;font-size:15px;text-decoration:none;">${data.email}</a></td></tr>
                      ${data.phone ? `<tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Telefono</span><br><span style="color:#111827;font-size:15px;">${data.phone}</span></td></tr>` : ''}
                      ${data.city ? `<tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Ciudad</span><br><span style="color:#111827;font-size:15px;">${data.city}</span></td></tr>` : ''}
                      ${data.numberOfRooms ? `<tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Habitaciones</span><br><span style="color:#111827;font-size:15px;">${data.numberOfRooms}</span></td></tr>` : ''}
                      ${data.message ? `<tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Mensaje</span><br><span style="color:#111827;font-size:15px;">${data.message}</span></td></tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="${adminUrl}/demo-requests" style="display:inline-block;background-color:#6366f1;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                      Ver en el panel de administracion
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:16px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">Mijatoo - Sistema de gestion hotelera</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      const result = await resend.emails.send({
        from: `Mijatoo <${fromEmail}>`,
        to: adminEmail,
        subject: `Nueva solicitud de demo - ${data.businessName}`,
        html,
      });
      console.log(`[Email] Demo request notification sent to ${adminEmail}`, result);
    } catch (err: any) {
      console.error('[Email] Failed to send demo request notification:', err?.message || err);
    }
  }

  async sendNewSubscriptionNotification(data: {
    hotelName: string;
    planName: string;
    price: number;
    intervalUnit: string;
    isRenewal: boolean;
  }) {
    if (!resend) {
      console.log('[Email] Resend not configured, skipping admin notification');
      return;
    }

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'jampierv127@gmail.com';
    const action = data.isRenewal ? 'ha renovado' : 'ha seleccionado';
    const subject = `${data.isRenewal ? 'Renovacion' : 'Nueva suscripcion'} - ${data.hotelName}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;">
          <tr>
            <td style="background-color:#6366f1;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:#ffffff;font-size:20px;margin:0;">Mijatoo - Notificacion</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:32px;">
              <h2 style="color:#111827;font-size:18px;margin:0 0 16px 0;">
                ${data.isRenewal ? 'Renovacion de plan' : 'Nuevo plan seleccionado'}
              </h2>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
                El hotel <strong>${data.hotelName}</strong> ${action} el plan <strong>${data.planName}</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;">
                          <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Plan</span><br>
                          <span style="color:#111827;font-size:15px;font-weight:600;">${data.planName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;">
                          <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Precio</span><br>
                          <span style="color:#111827;font-size:20px;font-weight:700;">S/${data.price.toFixed(2)}/${data.intervalUnit}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;">
                          <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Estado</span><br>
                          <span style="color:#ea580c;font-size:15px;font-weight:600;">Pendiente de pago</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="color:#6b7280;font-size:14px;line-height:1.5;margin:20px 0 0 0;">
                Ingresa al panel de administracion para registrar el pago y activar la suscripcion.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:16px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">Mijatoo - Sistema de gestion hotelera</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      const result = await resend.emails.send({
        from: `Mijatoo <${fromEmail}>`,
        to: adminEmail,
        subject,
        html,
      });
      console.log(`[Email] Admin notification sent to ${adminEmail}`, result);
    } catch (err: any) {
      console.error('[Email] Failed to send admin notification:', err?.message || err);
    }
  }

  async sendPasswordResetEmail(data: { email: string; firstName: string; resetToken: string }) {
    if (!resend) {
      console.log('[Email] Resend not configured, skipping password reset email');
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${data.resetToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;">
          <tr>
            <td style="background-color:#6366f1;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:#ffffff;font-size:20px;margin:0;">Mijatoo</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:32px;">
              <h2 style="color:#111827;font-size:18px;margin:0 0 16px 0;">Restablecer contraseña</h2>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
                Hola <strong>${data.firstName}</strong>, recibimos una solicitud para restablecer tu contraseña.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 24px 0;">
                    <a href="${resetUrl}" style="display:inline-block;background-color:#6366f1;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                      Restablecer Contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0;">
                Este enlace expira en <strong>1 hora</strong>. Si no solicitaste este cambio, ignora este correo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:16px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">Mijatoo - Sistema de gestion hotelera</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      const result = await resend.emails.send({
        from: `Mijatoo <${fromEmail}>`,
        to: data.email,
        subject: 'Restablecer contraseña - Mijatoo',
        html,
      });
      console.log(`[Email] Password reset email sent to ${data.email}`, result);
    } catch (err: any) {
      console.error('[Email] Failed to send password reset email:', err?.message || err);
    }
  }

  async sendReservationConfirmation(data: ReservationEmailData) {
    if (!resend) {
      console.log('[Email] Resend not configured, skipping email');
      return;
    }

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:#6366f1;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px 0;font-weight:700;">Mijatoo</h1>
              <p style="color:#c7d2fe;font-size:14px;margin:0;">Confirmacion de Reserva</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;">
              <h2 style="color:#111827;font-size:20px;margin:0 0 8px 0;">Hola ${data.guestName},</h2>
              <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
                Tu reserva en <strong style="color:#111827;">${data.hotelName}</strong> ha sido registrada exitosamente.
              </p>

              <!-- QR Code + Reservation ID -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ff;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td align="center" style="padding:20px 16px 8px 16px;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(data.reservationId)}" alt="QR Reserva" width="140" height="140" style="display:block;border-radius:4px;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:4px 16px 16px 16px;">
                    <span style="color:#6366f1;font-size:11px;font-weight:600;text-transform:uppercase;">ID de Reserva</span>
                    <br>
                    <span style="color:#312e81;font-size:12px;font-family:monospace;">${data.reservationId}</span>
                    <br>
                    <span style="color:#9ca3af;font-size:11px;">Presenta este codigo QR al momento del check-in</span>
                  </td>
                </tr>
              </table>

              <!-- Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;">
                    <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Categoria</span>
                    <br>
                    <span style="color:#111827;font-size:15px;font-weight:500;">${data.categoryName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%">
                          <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Check-in</span>
                          <br>
                          <span style="color:#111827;font-size:14px;">${formatDate(data.checkIn)}</span>
                        </td>
                        <td width="50%">
                          <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Check-out</span>
                          <br>
                          <span style="color:#111827;font-size:14px;">${formatDate(data.checkOut)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%">
                          <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Noches</span>
                          <br>
                          <span style="color:#111827;font-size:14px;">${data.nights}</span>
                        </td>
                        <td width="50%">
                          <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Huespedes</span>
                          <br>
                          <span style="color:#111827;font-size:14px;">${data.numberOfGuests}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;background-color:#f9fafb;">
                    <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Total</span>
                    <br>
                    <span style="color:#111827;font-size:22px;font-weight:700;">S/${data.totalPrice.toFixed(2)}</span>
                  </td>
                </tr>
              </table>

              <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:24px 0 0 0;">
                La habitacion sera asignada al momento del check-in. Si necesitas hacer cambios, contacta directamente al hotel.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                Este correo fue enviado por <strong style="color:#6366f1;">Mijatoo</strong> en nombre de ${data.hotelName}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      // With onboarding@resend.dev you can only send TO the account owner's email.
      // To send to any guest, verify your own domain in Resend dashboard.
      const from = fromEmail === 'onboarding@resend.dev'
        ? 'Mijatoo <onboarding@resend.dev>'
        : `${data.hotelName} <${fromEmail}>`;

      const result = await resend.emails.send({
        from,
        to: data.guestEmail,
        subject: `Reserva confirmada - ${data.hotelName}`,
        html,
      });
      console.log(`[Email] Reservation confirmation sent to ${data.guestEmail}`, result);
    } catch (err: any) {
      console.error('[Email] Failed to send reservation confirmation:', err?.message || err);
    }
  }

  async sendWelcomeEmail(data: {
    firstName: string;
    email: string;
    hotelName: string;
    loginUrl: string;
  }) {
    if (!resend) {
      console.log('[Email] Resend not configured, skipping welcome email');
      return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;">
          <tr>
            <td style="background-color:#6366f1;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0 0 4px 0;font-weight:700;">Mijatoo</h1>
              <p style="color:#c7d2fe;font-size:13px;margin:0;">Bienvenido a la familia</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:32px;">
              <h2 style="color:#111827;font-size:20px;margin:0 0 16px 0;">Hola ${data.firstName},</h2>
              <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
                Tu cuenta y tu hotel <strong>${data.hotelName}</strong> han sido creados exitosamente. Tienes <strong>7 dias de prueba gratis</strong> para explorar todas las funcionalidades.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ff;border-radius:8px;border:1px solid #c7d2fe;">
                <tr>
                  <td style="padding:20px;">
                    <p style="color:#4338ca;font-size:15px;font-weight:600;margin:0 0 8px 0;">Proximos pasos:</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <table cellpadding="0" cellspacing="0"><tr>
                            <td style="vertical-align:top;padding-right:10px;"><span style="display:inline-block;width:24px;height:24px;background-color:#6366f1;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">1</span></td>
                            <td style="color:#374151;font-size:14px;line-height:1.5;">Inicia sesion en tu panel de administracion.</td>
                          </tr></table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <table cellpadding="0" cellspacing="0"><tr>
                            <td style="vertical-align:top;padding-right:10px;"><span style="display:inline-block;width:24px;height:24px;background-color:#6366f1;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">2</span></td>
                            <td style="color:#374151;font-size:14px;line-height:1.5;">Configura tus habitaciones, categorias y precios.</td>
                          </tr></table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <table cellpadding="0" cellspacing="0"><tr>
                            <td style="vertical-align:top;padding-right:10px;"><span style="display:inline-block;width:24px;height:24px;background-color:#6366f1;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">3</span></td>
                            <td style="color:#374151;font-size:14px;line-height:1.5;">Comparte tu pagina publica y empieza a recibir reservas.</td>
                          </tr></table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="${data.loginUrl}" style="display:inline-block;background-color:#6366f1;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                      Ir al panel de administracion
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0 0 4px 0;">Mijatoo - Sistema de gestion hotelera para Peru</p>
              <p style="color:#9ca3af;font-size:11px;margin:0;">hola@mijatoo.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      const result = await resend.emails.send({
        from: `Mijatoo <${fromEmail}>`,
        to: data.email,
        subject: 'Bienvenido a Mijatoo - Tu hotel esta listo',
        html,
      });
      console.log(`[Email] Welcome email sent to ${data.email}`, result);
    } catch (err: any) {
      console.error('[Email] Failed to send welcome email:', err?.message || err);
    }
  }
}
