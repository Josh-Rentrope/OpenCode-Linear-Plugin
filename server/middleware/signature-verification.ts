/**
 * Linear Webhook Signature Verification
 * 
 * Linear signs webhook payloads with a secret key to verify authenticity.
 * This middleware validates the signature before processing events.
 * 
 * Security: Prevents malicious webhook requests from being processed.
 */

import crypto from 'crypto'

const SIGNATURE_HEADER = 'linear-signature'
const TIMESTAMP_HEADER = 'linear-timestamp'

/**
 * Verify Linear webhook signature using HMAC-SHA256
 * 
 * @param payload - Raw request body as string
 * @param signature - Signature from Linear-Signature header
 * @param secret - Your webhook secret from environment
 * @returns boolean - True if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    console.error('Webhook Error: LINEAR_WEBHOOK_SECRET not configured')
    return false
  }

  try {
    // Linear uses: HMAC-SHA256(secret, timestamp + payload)
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Remove 'sha256=' prefix if present
    const receivedSignature = signature.replace('sha256=', '')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedSignature)
    )
  } catch (error) {
    console.error('Webhook Error: Signature verification failed', error)
    return false
  }
}

/**
 * Extract signature from request headers
 * Returns null if signature header is missing
 */
export function extractSignature(headers: Record<string, string>): string | null {
  return headers[SIGNATURE_HEADER.toLowerCase()] || null
}

/**
 * Extract timestamp from request headers
 * Used for replay attack prevention (optional enhancement)
 */
export function extractTimestamp(headers: Record<string, string>): string | null {
  return headers[TIMESTAMP_HEADER.toLowerCase()] || null
}