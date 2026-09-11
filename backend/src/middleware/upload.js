import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { check } from "../utils/http.js";
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1,
    fields: 8,
    fieldSize: 10000,
    parts: 10,
  },
}).single("receipt");
export async function receiptFromFile(file) {
  if (!file) return null;
  const detected = await fileTypeFromBuffer(file.buffer).catch(() => null);
  check(
    detected &&
      ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
        detected.mime,
      ),
    400,
    "Upload a valid PDF, JPG, PNG, or WebP receipt.",
  );
  const name =
    file.originalname.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(-100) ||
    `receipt.${detected.ext}`;
  return {
    filename: name,
    mimeType: detected.mime,
    size: file.size,
    data: file.buffer,
  };
}
