/**
 * Webhook Event Processor
 * 
 * Lightweight event processing pipeline for Linear webhooks.
 * Filters comment events for OpenCode references and routes to appropriate handlers.
 * This is intentionally minimal - downstream processes can handle complex actions.
 */

import { OpenCodeReferenceDetector, OpenCodeReference } from './opencode-reference-detector'

/**
 * Basic webhook payload interface for processing
 * This is a minimal interface that captures the essential fields we need
 */
interface BaseWebhookPayload {
  type: string
  action: string
  createdAt: string
  actor?: any
  data: any
  url: string
}

/**
 * Event context provides essential information for action handlers
 */
export interface EventContext {
  /** The original webhook payload */
  payload: BaseWebhookPayload
  /** Detected OpenCode references in the event */
  references: OpenCodeReference[]
  /** Event metadata for routing and logging */
  metadata: {
    eventType: string
    action: string
    actor: string
    timestamp: string
    entityId: string
  }
}

/**
 * Processing result for webhook events
 */
export interface ProcessResult {
  success: boolean
  processed: boolean
  message: string
  context?: EventContext
  error?: string
}

/**
 * Webhook Event Processor
 * 
 * Provides minimal event processing with OpenCode reference detection.
 * Focuses on filtering and routing - actual action handling is done by downstream systems.
 */
export class WebhookEventProcessor {
  /**
   * Process a comment event and detect OpenCode references
   * 
   * @param payload - Linear webhook payload for comment events
   * @returns Processing result with context if references are found
   */
  async processCommentEvent(payload: BaseWebhookPayload): Promise<ProcessResult> {
    try {
      if (payload.type !== 'Comment') {
        return {
          success: false,
          processed: false,
          message: 'Invalid comment webhook payload',
          error: 'Payload is not a comment event'
        }
      }

      const commentBody = payload.data.body
      if (!commentBody) {
        return {
          success: true,
          processed: false,
          message: 'Comment has no body text to process'
        }
      }

      // Detect OpenCode references in the comment
      const references = OpenCodeReferenceDetector.detectReferences(commentBody)
      
      // Create event context
      const context: EventContext = {
        payload,
        references,
        metadata: {
          eventType: payload.type,
          action: payload.action,
          actor: payload.actor ? ('name' in payload.actor ? payload.actor.name : 'Unknown') : 'Unknown',
          timestamp: new Date(payload.createdAt).toISOString(),
          entityId: payload.data.id
        }
      }

      // If no OpenCode references found, still return success but not processed
      if (references.length === 0) {
        return {
          success: true,
          processed: false,
          message: 'No OpenCode references found in comment',
          context
        }
      }

      console.log(`🔍 OpenCode references detected:`, {
        commentId: payload.data.id,
        issueId: payload.data.issueId,
        referenceCount: references.length,
        actor: context.metadata.actor
      })

      // Handle each detected reference
      for (const reference of references) {
        await this.handleOpenCodeReference(reference, context)
      }

      return {
        success: true,
        processed: true,
        message: `Processed ${references.length} OpenCode reference(s)`,
        context
      }

    } catch (error) {
      console.error('❌ Comment event processing failed:', error)
      return {
        success: false,
        processed: false,
        message: 'Comment event processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Process an issue event (currently just logs, can be extended)
   * 
   * @param payload - Linear webhook payload for issue events
   * @returns Processing result
   */
  async processIssueEvent(payload: BaseWebhookPayload): Promise<ProcessResult> {
    try {
      if (payload.type !== 'Issue') {
        return {
          success: false,
          processed: false,
          message: 'Invalid issue webhook payload',
          error: 'Payload is not an issue event'
        }
      }

      const context: EventContext = {
        payload,
        references: [], // Issue events don't typically have comment bodies
        metadata: {
          eventType: payload.type,
          action: payload.action,
          actor: payload.actor ? ('name' in payload.actor ? payload.actor.name : 'Unknown') : 'Unknown',
          timestamp: new Date(payload.createdAt).toISOString(),
          entityId: payload.data.id
        }
      }

      console.log(`📋 Issue event processed:`, {
        issueId: payload.data.id,
        identifier: payload.data.identifier,
        action: payload.action,
        actor: context.metadata.actor
      })

      return {
        success: true,
        processed: true,
        message: `Issue ${payload.action} processed`,
        context
      }

    } catch (error) {
      console.error('❌ Issue event processing failed:', error)
      return {
        success: false,
        processed: false,
        message: 'Issue event processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

/**
   * Handle a detected OpenCode reference
   * 
   * Passes the raw reference to OpenCode for processing.
   * OpenCode's robust parser will handle command extraction and execution.
   * 
   * @param reference - The detected OpenCode reference
   * @param context - Event context for reference
   */
  private async handleOpenCodeReference(
    reference: import('./opencode-reference-detector').OpenCodeReference,
    context: EventContext
  ): Promise<void> {
    console.log(`🎯 OpenCode reference found:`, {
      rawReference: reference.raw,
      position: reference.position,
      actor: context.metadata.actor,
      issueId: context.payload.data.issueId,
      commentId: context.payload.data.id,
      timestamp: context.metadata.timestamp
    })

    try {
      // Pass the raw reference to OpenCode for processing
      // OpenCode's robust parser will handle command extraction and execution
      console.log(`📤 Passing to OpenCode: "${reference.raw}"`)
      
      // TODO: Integrate with actual OpenCode API/session
      // For now, we just log the reference for downstream processing
      // The actual OpenCode integration will handle:
      // - Command parsing using OpenCode's robust parser
      // - Context-aware execution
      // - Response handling and issue updates
      
      console.log(`✅ OpenCode reference ready for processing:`, {
        reference: reference.raw,
        context: {
          actor: context.metadata.actor,
          issueId: context.payload.data.issueId,
          commentId: context.payload.data.id,
          timestamp: context.metadata.timestamp
        }
      })

    } catch (error) {
      console.error(`❌ Failed to handle OpenCode reference:`, {
        reference: reference.raw,
        error: error instanceof Error ? error.message : 'Unknown error',
        actor: context.metadata.actor
      })
    }
  }

  /**
   * Generic event processor that routes to specific handlers
   * 
   * @param payload - Any Linear webhook payload
   * @returns Processing result
   */
  async processEvent(payload: BaseWebhookPayload): Promise<ProcessResult> {
    switch (payload.type) {
      case 'Comment':
        return this.processCommentEvent(payload)
      
      case 'Issue':
        return this.processIssueEvent(payload)
      
      default:
        return {
          success: true,
          processed: false,
          message: `No processor for ${payload.type} events (developers can add custom processors)`
        }
    }
  }
}

// Export singleton for easy usage
export const webhookEventProcessor = new WebhookEventProcessor()