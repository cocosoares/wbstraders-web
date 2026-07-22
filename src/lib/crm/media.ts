export const CRM_MEDIA_MAX_BYTES = 10 * 1024 * 1024;

export const CRM_MEDIA_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export type CrmMediaValidation =
  | { valid: true; extension: string }
  | { valid: false; reason: "empty" | "unsupported" | "too_large" };

export function validateCrmMedia(input: {
  size: number;
  mimeType: string;
}): CrmMediaValidation {
  if (!Number.isFinite(input.size) || input.size <= 0) return { valid: false, reason: "empty" };
  if (input.size > CRM_MEDIA_MAX_BYTES) return { valid: false, reason: "too_large" };
  const extension = CRM_MEDIA_EXTENSIONS[input.mimeType];
  if (!extension) return { valid: false, reason: "unsupported" };
  return { valid: true, extension };
}
