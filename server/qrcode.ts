/**
 * QR Code generation for reservations and waitlist
 */

import { nanoid } from "nanoid";
import QRCode from "qrcode";

/**
 * Generate a unique QR code token
 */
export function generateQRCode(): string {
  const timestamp = Date.now().toString(36);
  const randomId = nanoid(12);
  return `${timestamp}-${randomId}`;
}

/**
 * Generate QR code as data URL (server-side)
 */
export async function generateQRCodeDataUrl(qrCode: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(qrCode, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return dataUrl;
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    throw new Error("QR code generation failed");
  }
}

/**
 * Validate QR code format
 */
export function isValidQRCode(qrCode: string): boolean {
  return /^[a-z0-9]+-[a-z0-9]+$/.test(qrCode);
}
