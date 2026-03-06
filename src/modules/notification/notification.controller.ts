import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { success, error } from '../../utils/apiResponse';
import { sseClients } from './index';

const notificationService = new NotificationService();

export class NotificationController {
  async findAll(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const unreadOnly = req.query.unreadOnly === 'true';
      const notifications = await notificationService.findAll(req.hotelId!, limit, unreadOnly);
      return success(res, notifications);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async getUnreadCount(req: Request, res: Response) {
    try {
      const count = await notificationService.getUnreadCount(req.hotelId!);
      return success(res, { count });
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async markAsRead(req: Request, res: Response) {
    try {
      const notification = await notificationService.markAsRead(req.params.id, req.hotelId!);
      return success(res, notification, 'Notificación marcada como leída');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async markAllAsRead(req: Request, res: Response) {
    try {
      await notificationService.markAllAsRead(req.hotelId!);
      return success(res, null, 'Todas las notificaciones marcadas como leídas');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async stream(req: Request, res: Response) {
    const hotelId = req.hotelId;
    if (!hotelId) {
      return error(res, 'Hotel ID requerido', 400);
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write('data: {"type":"connected"}\n\n');

    if (!sseClients.has(hotelId)) {
      sseClients.set(hotelId, new Set());
    }
    sseClients.get(hotelId)!.add(res);

    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
      const clients = sseClients.get(hotelId);
      if (clients) {
        clients.delete(res);
        if (clients.size === 0) sseClients.delete(hotelId);
      }
    });
  }
}
