import { Request, Response } from 'express';
import { UploadService } from './upload.service';
import { success, error } from '../../utils/apiResponse';

const uploadService = new UploadService();

export class UploadController {
  async uploadSingle(req: Request, res: Response) {
    try {
      if (!req.file) return error(res, 'No se proporcionó ningún archivo', 400);
      const key = await uploadService.uploadFile(req.file);
      const url = await UploadService.getSignedReadUrl(key);
      return success(res, { url, key }, 'Archivo subido exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async uploadMultiple(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return error(res, 'No se proporcionaron archivos', 400);
      const keys = await uploadService.uploadMultiple(files);
      const urls = await Promise.all(keys.map((k) => UploadService.getSignedReadUrl(k)));
      return success(res, { urls, keys }, 'Archivos subidos exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
