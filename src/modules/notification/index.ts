import { Response } from 'express';

// SSE clients map: hotelId -> Set<Response>
export const sseClients = new Map<string, Set<Response>>();

export function emitNotification(hotelId: string, notification: any) {
  const clients = sseClients.get(hotelId);
  if (!clients) return;

  const data = JSON.stringify(notification);
  clients.forEach((client) => {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      // Client disconnected, will be cleaned up
    }
  });
}
