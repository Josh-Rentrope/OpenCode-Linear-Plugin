/**
 * Linear Webhook Event Handlers
 * 
 * Provides comprehensive webhook event processing for Linear with full OpenCode integration.
 * This module serves as the central routing layer that directs incoming Linear webhook
 * events to appropriate handlers while maintaining consistent error handling and logging.
 * 
 * Key Features:
 * - Full access to complete Linear webhook payloads without abstraction
 * - Integrated OpenCode reference detection and processing
 * - Consistent response interface across all handlers
 * - Comprehensive error handling and recovery
 * - Extensible architecture for custom event handlers
 * - Real-time event streaming to OpenCode TUI
 * 
 * Architecture Pattern:
 * 1. Webhook Reception → 2. Event Routing → 3. Handler Processing → 4. OpenCode Integration → 5. Response
 */

import type { LinearWebhookPayload, IssueWebhookPayload, CommentWebhookPayload } from './types/linear-webhook-types'

// Extended interface to handle Linear webhook payloads with proper typing
interface ExtendedWebhookPayload extends LinearWebhookPayload {
  type: string
  action: string
  actor?: any
  createdAt?: string
  data?: any
  url?: string
  updatedFrom?: any
}
import { webhookEventProcessor } from '../plugin/LinearPlugin/webhook-event-processor'
import { getLinearCollaboration } from '../plugin/LinearPlugin/linear-collaboration'

/**
 * Standardized handler response interface
 * 
 * All webhook handlers must return this structure to ensure consistent
 * processing and response formatting. This interface enables proper
 * error handling, logging, and HTTP response generation.
 */
export interface HandlerResponse {
  /** Indicates whether the handler processed the event successfully */
  success: boolean
  /** Human-readable message describing the processing result */
  message: string
  /** Optional data payload for additional context or debugging */
  data?: any
  /** Error details if processing failed (null/undefined on success) */
  error?: string
}

/**
 * Main webhook event dispatcher and router
 * 
 * Serves as the central entry point for all Linear webhook events.
 * Routes incoming payloads to appropriate specialized handlers based on
 * the event type and action. Provides comprehensive logging and error handling
 * while maintaining the flexibility for developers to add custom handlers.
 * 
 * The dispatcher follows a fail-safe approach where even if a specific
 * handler fails, the webhook processing continues and returns a successful
 * HTTP response to Linear to prevent webhook delivery failures.
 * 
 * @param payload - Complete Linear webhook payload with event data
 * @returns Standardized handler response with processing results
 */
export async function handleWebhook(
  payload: ExtendedWebhookPayload
): Promise<HandlerResponse> {
  try {
    // Log comprehensive webhook information for debugging and monitoring
    // This provides full visibility into incoming webhook events
    console.log(`Linear Webhook Received: ${payload.type} ${payload.action}`, {
      type: payload.type,
      action: payload.action,
      actor: payload.actor ? ('name' in payload.actor ? payload.actor.name : 'Unknown') : 'Unknown',
      timestamp: new Date(payload.createdAt).toISOString(),
      entityId: payload.data?.id,
      url: payload.url
    })

    // Route to specialized handlers based on entity type
    // This switch statement can be extended to support additional Linear entity types
    switch (payload.type) {
case 'Issue':
        return handleIssueEvent(payload)
      
      case 'Comment':
        return handleCommentEvent(payload)
      
      // Support for additional Linear entity types can be added here
      // Examples: 'Project', 'Team', 'Label', 'WorkflowState', etc.
      
      default:
        // Return success for unknown event types to prevent webhook delivery failures
        // This ensures Linear doesn't disable webhooks due to unhandled events
        console.log(`No handler configured for ${payload.type} events - skipping processing`)
        return {
          success: true,
          message: `No handler for ${payload.type} events (developers can add custom handlers)`,
          data: {
            eventType: payload.type,
            action: payload.action,
            note: 'Event was received but no specific handler was configured'
          }
        }
    }
  } catch (error) {
    // Centralized error handling prevents webhook delivery failures
    // Even if processing fails, we return a successful HTTP response to Linear
    console.error('Webhook processing failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      eventType: payload.type,
      action: payload.action,
      timestamp: new Date().toISOString()
    })
    
    return {
      success: false, // Internal processing failed
      message: 'Webhook processing failed but delivery was successful',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        eventType: payload.type,
        action: payload.action,
        note: 'Linear webhook was delivered successfully but internal processing failed'
      }
    }
  }
}

/**
 * Issue event handler with comprehensive processing integration
 * 
 * Handles all Linear issue-related webhook events including creation,
 * updates, state changes, and assignments. This handler provides
 * full access to the complete webhook payload and integrates with
 * the centralized event processing system for OpenCode integration.
 * 
 * Supported Issue Events:
 * - create: New issue creation
 * - update: Issue modifications (title, description, state, etc.)
 * - remove: Issue deletion
 * - assign: Assignment changes
 * 
 * Developer Capabilities:
 * - Access complete payload including previous values (updatedFrom)
 * - Filter by any issue criteria (state, priority, labels, assignee)
 * - Trigger custom workflows based on specific conditions
 * - Integrate with external systems via the event processor
 * 
 * @param payload - Linear webhook payload for Issue events
 * @returns Handler response with processing results and issue information
 */
async function handleIssueEvent(payload: ExtendedWebhookPayload): Promise<HandlerResponse> {
  // Validate payload type to ensure proper routing
  if (payload.type !== 'Issue') {
    return {
      success: false,
      message: 'Invalid issue webhook payload - type mismatch',
      error: `Expected type 'Issue', received '${payload.type}'`
    }
  }

  // Extract complete issue data from the webhook payload
  const issueData = payload.data
  const updatedFrom = payload.updatedFrom // Contains previous values for update events
  
  // Compile comprehensive issue information for logging and downstream processing
  // This provides a complete snapshot of the issue state at the time of the event
  const issueInfo = {
    // Core issue identifiers
    id: issueData.id,
    identifier: issueData.identifier, // Human-readable ID like "ENG-123"
    title: issueData.title,
    
    // Description handling with length limits for logging
    description: issueData.description 
      ? (issueData.description.length > 100 
          ? issueData.description.substring(0, 100) + '...' 
          : issueData.description)
      : 'No description',
    
    // State and workflow information
    state: issueData.state?.name || 'Unknown',
    previousState: updatedFrom?.state?.name, // Previous state for update events
    
    // Assignment information
    assignee: issueData.assignee?.name || 'Unassigned',
    previousAssignee: updatedFrom?.assignee?.name,
    
    // Priority and classification
    priority: issueData.priority || 'No priority',
    
    // Labels and categorization
    labels: issueData.labels?.map((label: any) => label.name) || [],
    
    // Metadata and links
    url: issueData.url || 'No URL',
    createdAt: issueData.createdAt,
    updatedAt: issueData.updatedAt,
    
    // Event-specific information
    action: payload.action,
    actor: payload.actor?.name || 'Unknown'
  }

  // Log detailed issue information for monitoring and debugging
  console.log(`Processing Issue ${payload.action}:`, {
    identifier: issueInfo.identifier,
    title: issueInfo.title,
    state: issueInfo.state,
    assignee: issueInfo.assignee,
    actor: issueInfo.actor
  })

  // Process the issue event through the centralized event processor
  // This enables OpenCode integration, TUI streaming, and session management
  const processResult = await webhookEventProcessor.processIssueEvent(payload as any)
  
  // Track collaboration activity for Phase 3 features
  try {
    const collaboration = getLinearCollaboration()
    await collaboration.trackActivity({
      type: payload.action === 'create' ? 'issue_created' : 'issue_updated',
      userId: payload.actor?.id || '',
      userName: payload.actor?.name || 'Unknown',
      userEmail: payload.actor?.email,
      issueId: issueData.id,
      issueTitle: issueData.title,
      projectId: issueData.projectId,
      projectName: issueData.project?.name,
      metadata: {
        action: payload.action,
        previousState: updatedFrom?.state?.name,
        newState: issueData.state?.name
      }
    })

    // Trigger automated workflows
    await collaboration.triggerAutomatedWorkflows({
      type: payload.action === 'create' ? 'issue_created' : 'issue_updated',
      userId: payload.actor?.id || '',
      userName: payload.actor?.name || 'Unknown',
      issueId: issueData.id,
      issueTitle: issueData.title,
      projectId: issueData.projectId
    })
  } catch (collaborationError) {
    console.error('Collaboration tracking failed:', collaborationError)
  }
  
  // Handle processing errors gracefully while maintaining webhook delivery success
  if (!processResult.success) {
    console.error('Issue event processing failed:', {
      error: processResult.error,
      issueId: issueInfo.id,
      action: payload.action
    })
    
    // Return success for webhook delivery but note the internal processing failure
    // This prevents Linear from disabling the webhook due to processing issues
    return {
      success: true,
      message: `Issue ${payload.action} received (event processing failed)`,
      data: {
        ...issueInfo,
        eventProcessed: false,
        eventError: processResult.error,
        note: 'Webhook was delivered successfully but OpenCode processing failed'
      }
    }
  }

  // Example of custom business logic that developers can implement
  // This demonstrates how to trigger workflows based on specific conditions
  /*
  if (issueData.priority === 'urgent' && payload.action === 'create') {
    await sendUrgentNotification({
      issue: issueInfo,
      action: 'urgent_issue_created',
      timestamp: new Date().toISOString()
    })
  }
  
  if (updatedFrom?.state?.name !== issueData.state?.name) {
    await notifyStateChange({
      issue: issueInfo,
      previousState: updatedFrom.state.name,
      newState: issueData.state.name,
      changedBy: payload.actor.name
    })
  }
  */
  
  return {
    success: true,
    message: `Issue ${payload.action} processed successfully`,
    data: {
      ...issueInfo,
      eventProcessed: processResult.processed,
      processingTime: processResult.context?.metadata?.timestamp
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
async function handleCommentEvent(payload: ExtendedWebhookPayload): Promise<HandlerResponse> {
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
  const processResult = await webhookEventProcessor.processCommentEvent(payload as any)
  
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