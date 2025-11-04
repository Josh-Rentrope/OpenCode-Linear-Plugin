/**
 * Linear Webhook Type Definitions
 * 
 * Re-exports Linear's official webhook types from @linear/sdk.
 * Developers get full access to the complete webhook payload structure
 * and can filter/process any data they need without abstraction.
 */

// Import Linear's official webhook types
import type { 
  WebhookPayload,
  IssueWebhookPayload,
  CommentWebhookPayload,
  EntityWebhookPayload
} from '@linear/sdk'

// Re-export Linear's types for convenience
export type {
  WebhookPayload as LinearWebhookPayload,
  IssueWebhookPayload,
  CommentWebhookPayload,
  EntityWebhookPayload
}

/**
 * Type guards to check webhook payload types
 * These help TypeScript understand what type of data we're working with
 * but don't abstract away any of the original payload data
 */

export function isIssueWebhook(
  payload: WebhookPayload
): payload is IssueWebhookPayload {
  return payload.type === 'Issue'
}

export function isCommentWebhook(
  payload: WebhookPayload
): payload is CommentWebhookPayload {
  return payload.type === 'Comment'
}