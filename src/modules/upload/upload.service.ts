import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, env } from '../../config';
import crypto from 'crypto';
import path from 'path';

const SIGNED_URL_EXPIRATION = 60 * 60; // 1 hour
const CACHE_SAFETY_WINDOW_MS = 60 * 1000; // regenerate 1 min before expiry

type CacheEntry = { url: string; expiresAtMs: number };
const signedUrlCache = new Map<string, CacheEntry>();

export class UploadService {
  /**
   * Upload file to S3 and return just the key (not a full URL).
   */
  async uploadFile(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname);
    const key = `uploads/${crypto.randomUUID()}${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    return key;
  }

  async uploadMultiple(files: Express.Multer.File[]): Promise<string[]> {
    return Promise.all(files.map((f) => this.uploadFile(f)));
  }

  /**
   * Generate a presigned read URL for a given S3 key (with in-memory cache).
   */
  static async getSignedReadUrl(key: string): Promise<string> {
    const normalizedKey = this.extractKey(key);
    if (!normalizedKey) return key; // not an S3 resource, return as-is

    const now = Date.now();
    const cached = signedUrlCache.get(normalizedKey);
    if (cached && cached.expiresAtMs - CACHE_SAFETY_WINDOW_MS > now) {
      return cached.url;
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: normalizedKey,
      }),
      { expiresIn: SIGNED_URL_EXPIRATION },
    );

    signedUrlCache.set(normalizedKey, {
      url,
      expiresAtMs: now + SIGNED_URL_EXPIRATION * 1000,
    });

    return url;
  }

  /**
   * Extract the S3 key from a stored value.
   * Handles: bare keys ("uploads/uuid.jpg"), full URLs, and presigned URLs.
   * Returns null if the value doesn't look like an S3 resource.
   */
  static extractKey(stored: string): string | null {
    if (!stored) return null;

    // Already a bare key (no http)
    if (!stored.startsWith('http')) {
      return stored.replace(/^\/+/, '');
    }

    // Full URL or presigned URL — extract key from path
    try {
      const url = new URL(stored);
      const pathname = url.pathname.replace(/^\/+/, '');

      // Remove bucket name prefix if present
      if (pathname.startsWith(env.AWS_S3_BUCKET_NAME + '/')) {
        return pathname.substring(env.AWS_S3_BUCKET_NAME.length + 1);
      }

      // Might be a path-style URL without bucket prefix
      return pathname;
    } catch {
      return null;
    }
  }

  /**
   * Resolve a stored image value (key or old URL) to a presigned URL.
   * Returns null if the input is falsy.
   */
  static async resolveUrl(stored?: string | null): Promise<string | null> {
    if (!stored) return null;
    return this.getSignedReadUrl(stored);
  }

  /**
   * Resolve an array of stored image values to presigned URLs.
   */
  static async resolveUrls(stored?: string[] | null): Promise<string[]> {
    if (!stored || stored.length === 0) return [];
    return Promise.all(stored.map((s) => this.getSignedReadUrl(s)));
  }

  /**
   * Resolve image fields on any object. Mutates and returns the object.
   * Handles: coverImageUrl (string), logoUrl (string), galleryImages (string[]).
   */
  static async resolveImageFields(obj: any): Promise<any> {
    if (!obj) return obj;

    if (obj.coverImageUrl) {
      obj.coverImageUrl = await this.resolveUrl(obj.coverImageUrl);
    }
    if (obj.logoUrl) {
      obj.logoUrl = await this.resolveUrl(obj.logoUrl);
    }
    if (obj.galleryImages && Array.isArray(obj.galleryImages) && obj.galleryImages.length > 0) {
      obj.galleryImages = await this.resolveUrls(obj.galleryImages);
    }

    // Handle nested category (for rooms with category.coverImageUrl / category.galleryImages)
    if (obj.category) {
      await this.resolveImageFields(obj.category);
    }

    return obj;
  }

  /**
   * Resolve image fields on an array of objects.
   */
  static async resolveImageFieldsArray(arr: any[]): Promise<any[]> {
    await Promise.all(arr.map((item) => this.resolveImageFields(item)));
    return arr;
  }

  /**
   * Delete a single file from S3 by key.
   */
  static async deleteFile(key: string): Promise<void> {
    const normalizedKey = this.extractKey(key);
    if (!normalizedKey) return;
    await s3.send(new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: normalizedKey,
    }));
    signedUrlCache.delete(normalizedKey);
  }

  /**
   * Delete multiple files from S3.
   */
  static async deleteFiles(keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => this.deleteFile(k)));
  }

  /**
   * Normalize a URL or key to a clean S3 key for storage.
   * Strips presigned URL params, endpoint prefix, etc.
   */
  static normalizeForStorage(urlOrKey?: string | null): string | undefined {
    if (!urlOrKey) return undefined;
    return this.extractKey(urlOrKey) || urlOrKey;
  }

  /**
   * Normalize an array of URLs/keys to clean S3 keys for storage.
   */
  static normalizeArrayForStorage(arr?: string[] | null): string[] | undefined {
    if (!arr || arr.length === 0) return undefined;
    return arr.map((s) => this.extractKey(s) || s);
  }
}
