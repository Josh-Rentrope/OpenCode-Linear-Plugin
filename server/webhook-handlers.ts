/**
 * Linear Webhook Event Handlers
 * 
 * This file contains example handlers for Linear webhook events.
 * Developers get full access to the complete LinearWebhookPayload and can
 * filter/process any data they need without abstraction layers.
 * 
 * Architecture:
 * - Example handlers show common patterns for Issue and Comment events
 * - Developers can create their own handlers with full payload access
 * - All handlers follow the same response interface for consistency
 * - Error handling is centralized to ensure robustness
 * - OpenCode reference detection is integrated via WebhookEventProcessor
 */

import type { LinearWebhookPayload } from './types/linear-webhook-types'
import { webhookEventProcessor } from '../plugin/webhook-event-processor'

/**
 * Handler response interface
 * All handlers should return this structure for consistent processing
 */
export interface HandlerResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

/**
 * Main webhook dispatcher
 * Routes webhook payloads to the appropriate handler based on entity type
 * 
 * Developers can modify this to add their own entity types and handlers
 * or bypass this entirely and handle payloads directly
 */
export async function handleWebhook(
  payload: LinearWebhookPayload
): Promise<HandlerResponse> {
  try {
    // Log basic webhook info - developers have full access to payload
    console.log(` Linear Webhook: ${payload.type} ${payload.action}`, {
      type: payload.type,
      action: payload.action,
      actor: payload.actor ? ('name' in payload.actor ? payload.actor.name : 'Unknown') : 'Unknown',
      timestamp: new Date(payload.createdAt).toISOString()
    })

    // Route to appropriate handler based on entity type
    switch (payload.type) {
      case 'Issue':
        return handleIssueEvent(payload)
      
      case 'Comment':
        return handleCommentEvent(payload)
      
      default:
        return {
          success: true,
          message: `No handler for ${payload.type} events (developers can add custom handlers)`
        }
    }
  } catch (error) {
    console.error(' Webhook processing failed:', error)
    return {
      success: false,
      message: 'Webhook processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Issue event handler with webhook event processor integration
 * Shows how to access the full Linear webhook payload for Issue events
 * and integrates with the webhook event processing system
 * 
 * Developers can:
 * - Access any property from the full payload (payload.data, payload.updatedFrom, etc.)
 * - Filter by any criteria (state, assignee, priority, labels, etc.)
 * - Trigger custom workflows based on specific conditions
 * - Process events through the centralized event processor
 */
async function handleIssueEvent(payload: LinearWebhookPayload): Promise<HandlerResponse> {
  if (payload.type !== 'Issue') {
    return {
      success: false,
      message: 'Invalid issue webhook payload'
    }
  }

  // Full access to the complete Linear webhook payload
  const issueData = payload.data
  const updatedFrom = payload.updatedFrom // Previous values for update events
  
  // Example: Extract key information for logging and processing
  const issueInfo = {
    id: issueData.id,
    identifier: issueData.identifier, // e.g., "ENG-123"
    title: issueData.title,
    description: issueData.description?.substring(0, 100) + (issueData.description?.length > 100 ? '...' : ''),
    state: issueData.state?.name || 'Unknown',
    assignee: issueData.assignee?.name || 'Unassigned',
    priority: issueData.priority || 'No priority',
    labels: issueData.labels?.map((label: any) => label.name) || [],
    url: issueData.url || 'No URL',
    // Access previous values for update events
    previousState: updatedFrom?.state?.name,
    previousAssignee: updatedFrom?.assignee?.name
  }

  console.log(` Issue ${payload.action}:`, issueInfo)

  // Process the issue event through the centralized processor
  const processResult = await webhookEventProcessor.processIssueEvent(payload)
  
  if (!processResult.success) {
    console.error('❌ Issue event processing failed:', processResult.error)
    // Still return success for the webhook, but note the processing error
    return {
      success: true,
      message: `Issue ${payload.action} processed (event processing failed)`,
      data: {
        ...issueInfo,
        eventProcessed: false,
        eventError: processResult.error
      }
    }
  }

  // Example custom filtering logic developers can implement:
  // if (issueData.priority === 'urgent' && payload.action === 'create') {
  //   await sendUrgentNotification(issueInfo)
  // }
  
  return {
    success: true,
    message: `Issue ${payload.action} processed successfully`,
    data: {
      ...issueInfo,
      eventProcessed: processResult.processed
    }
  }
}

/**
 * Comment event handler with OpenCode reference detection
 * Shows how to access the full Linear webhook payload for Comment events
 * and integrates with the OpenCode reference detection system
 * 
 * Developers can:
 * - Access comment body, author, reactions, etc.
 * - Check for mentions, attachments, quoted text
 * - Filter by issue, project, or user criteria
 * - Process OpenCode references automatically
 */
async function handleCommentEvent(payload: LinearWebhookPayload): Promise<HandlerResponse> {
  if (payload.type !== 'Comment') {
    return {
      success: false,
      message: 'Invalid comment webhook payload'
    }
  }

  // Full access to the complete Linear webhook payload
  const commentData = payload.data
  
  // Example: Extract comprehensive comment information
  const commentInfo = {
    id: commentData.id,
    body: commentData.body,
    author: commentData.user?.name || commentData.botActor?.name || 'Unknown',
    authorEmail: commentData.user?.email,
    issueId: commentData.issueId,
    issueIdentifier: commentData.issue?.identifier || 'Unknown',
    issueTitle: commentData.issue?.title || 'Unknown',
    createdAt: commentData.createdAt,
    editedAt: commentData.editedAt,
    reactions: commentData.reactionData || {},
    quotedText: commentData.quotedText,
    // Access parent comment for replies
    parentId: commentData.parentId,
    // Check if comment is resolved
    resolvedAt: commentData.resolvedAt
  }

  console.log(` Comment ${payload.action}:`, {
    ...commentInfo,
    body: commentInfo.body?.substring(0, 100) + (commentInfo.body?.length > 100 ? '...' : '') // Truncate for logging
  })

  // Process OpenCode references in the comment
  const processResult = await webhookEventProcessor.processCommentEvent(payload)
  
  if (!processResult.success) {
    console.error('❌ OpenCode processing failed:', processResult.error)
    // Still return success for the webhook, but note the processing error
    return {
      success: true,
      message: `Comment ${payload.action} processed (OpenCode processing failed)`,
      data: {
        ...commentInfo,
        openCodeProcessed: false,
        openCodeError: processResult.error
      }
    }
  }

  // Example custom logic developers can implement:
  // if (commentData.body?.includes('@urgent') && payload.action === 'create') {
  //   await flagForUrgentReview(commentInfo)
  // }
  
  return {
    success: true,
    message: `Comment ${payload.action} processed successfully${processResult.processed ? ' with OpenCode references' : ''}`,
    data: {
      ...commentInfo,
      openCodeProcessed: processResult.processed,
      openCodeReferences: processResult.context?.references.length || 0
    }
  }
}

/**
 * Health check handler
 * Used to verify that the webhook processing system is working
 * This can be called by monitoring systems or during development
 */
export function handleHealthCheck(): HandlerResponse {
  return {
    success: true,
    message: 'Webhook handlers are healthy',
    data: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      supportedEvents: ['Issue', 'Comment'],
      note: 'Developers can add custom handlers for any Linear webhook type'
    }
  }
}