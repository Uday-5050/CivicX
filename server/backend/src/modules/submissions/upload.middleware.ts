import multer, { MulterError } from "multer";
import type { NextFunction, Request, Response } from "express";
import { ValidationError } from "../../utils/errors";

const allowedMimeTypes = new Set([
  "image/jpeg", "image/png", "image/webp",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) return callback(ValidationError("Only images, videos, PDFs, and Word documents are allowed"));
    callback(null, true);
  },
});

export function uploadAttachments(req: Request, res: Response, next: NextFunction): void {
  uploader.array("attachments", 5)(req, res, (error: unknown) => {
    if (error instanceof MulterError) return next(ValidationError(error.code === "LIMIT_FILE_SIZE" ? "Each attachment must be 100 MB or smaller" : "A maximum of five attachments is allowed"));
    if (error) return next(error);
    next();
  });
}
