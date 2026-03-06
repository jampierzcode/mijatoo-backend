import { Router } from 'express';
import multer from 'multer';
import { UploadController } from './upload.controller';
import { auth, roleGuard } from '../../middleware';
import { Role } from '../../shared';

const router = Router();
const controller = new UploadController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, png, webp, gif)'));
    }
  },
});

router.use(auth, roleGuard(Role.HOTEL_ADMIN, Role.SUPER_ADMIN));

router.post('/single', upload.single('file'), (req, res) => controller.uploadSingle(req, res));
router.post('/multiple', upload.array('files', 10), (req, res) => controller.uploadMultiple(req, res));

export default router;
