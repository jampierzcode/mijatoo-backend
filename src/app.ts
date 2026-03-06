import express from 'express';
import cors from 'cors';
import { env } from './config';
import { errorHandler } from './middleware';

import authRoutes from './modules/auth/auth.routes';
import hotelRoutes from './modules/hotel/hotel.routes';
import roomRoutes from './modules/room/room.routes';
import roomCategoryRoutes from './modules/room-category/room-category.routes';
import reservationRoutes from './modules/reservation/reservation.routes';
import guestRoutes from './modules/guest/guest.routes';
import productCategoryRoutes from './modules/product-category/product-category.routes';
import productRoutes from './modules/product/product.routes';
import productSaleRoutes from './modules/product-sale/product-sale.routes';
import paymentRoutes from './modules/payment/payment.routes';
import uploadRoutes from './modules/upload/upload.routes';
import publicRoutes from './modules/public/public.routes';
import planRoutes from './modules/plan/plan.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes';
import demoRequestRoutes from './modules/demo-request/demo-request.routes';
import notificationRoutes from './modules/notification/notification.routes';

const app = express();

app.use(cors());

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/room-categories', roomCategoryRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/product-categories', productCategoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-sales', productSaleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/demo-requests', demoRequestRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'API funcionando correctamente' });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

export default app;
