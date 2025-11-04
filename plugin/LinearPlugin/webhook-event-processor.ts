/**
 * Webhook Event Processor
 * 
 * Lightweight event processing pipeline for Linear webhooks.
 * Filters comment events for OpenCode references and routes to appropriate handlers.
 * This is intentionally minimal - downstream processes can handle complex actions.
 */

import { OpenCodeReferenceDetector, OpenCodeReference } from './opencode-reference-detector'
import { tuiEventStreamManager } from '../opencode/tui-event-stream'
import { linearSessionManager } from '../opencode/session-manager'
import { getLinearCRUD } from './linear-crud'
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
 * Provides comprehensive event processing with OpenCode reference detection and TUI integration.
 * Handles Linear webhook events, detects OpenCode commands, executes them through agents,
 * and streams real-time events to the OpenCode TUI for visibility and monitoring.
 */
export class WebhookEventProcessor {
  /**
   * Initialize the webhook event processor
   * 
   * Sets up the TUI event stream and prepares for event processing.
   * The TUI stream is started automatically to provide real-time visibility.
   */
  constructor() {
    // Start TUI event streaming for real-time visibility
    tuiEventStreamManager.start()
    console.log('Webhook Event Processor initialized with TUI streaming')
  }
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

      console.log(`OpenCode references detected:`, {
        commentId: payload.data.id,
        issueId: payload.data.issueId,
        referenceCount: references.length,
        actor: context.metadata.actor
      })

      // Stream the comment event to TUI before processing commands
      tuiEventStreamManager.streamEvent(payload, 'comment_created')

      // Handle each detected reference
      for (const reference of references) {
        const command = this.extractOpenCodeCommand(reference.raw)
        
        // Stream the command detection to TUI
        tuiEventStreamManager.streamEvent({
          ...payload,
          command: {
            raw: reference.raw,
            action: command.action
          }
        }, 'opencode_command')
        
        // Create and manage session for interactive commands
        if (this.shouldCreateSession(command)) {
          const session = linearSessionManager.createSession(context, command)
          linearSessionManager.activateSession(session.id)
          
          // Execute command in session context
          const result = await linearSessionManager.executeCommandInSession(session.id, command)
          
          // Handle session-based response
          await this.handleSessionCommandResponse(result, context, reference, session.id)
        } else {
          // Handle one-shot commands without session
          await this.handleOpenCodeReference(reference, context)
        }
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

      console.log(`Issue event processed:`, {
        issueId: payload.data.id,
        identifier: payload.data.identifier,
        action: payload.action,
        actor: context.metadata.actor
      })

      // Stream the issue event to TUI
      const eventType = payload.action === 'create' ? 'issue_created' : 'issue_updated'
      tuiEventStreamManager.streamEvent(payload, eventType)

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
   * Integrates with OpenCode by passing the raw reference for processing.
   * OpenCode's robust parser handles command extraction, execution, and response generation.
   * This method manages the complete lifecycle from detection to response handling.
   * 
   * @param reference - The detected OpenCode reference with full command text
   * @param context - Event context containing Linear metadata and payload information
   */
  private async handleOpenCodeReference(
    reference: import('./opencode-reference-detector').OpenCodeReference,
    context: EventContext
  ): Promise<void> {
    console.log(`OpenCode reference detected:`, {
      rawReference: reference.raw,
      position: reference.position,
      actor: context.metadata.actor,
      issueId: context.payload.data.issueId,
      commentId: context.payload.data.id,
      timestamp: context.metadata.timestamp
    })

    try {
      // Extract command and arguments from the raw reference
      const command = this.extractOpenCodeCommand(reference.raw)
      
      // Create execution context with Linear-specific information
      const executionContext = this.createExecutionContext(context, reference)
      
      // Execute the command through OpenCode's agent system
      const result = await this.executeOpenCodeCommand(command, executionContext)
      
      // Handle the response by updating the Linear issue
      await this.handleCommandResponse(result, context, reference)
      
      console.log(`OpenCode command executed successfully:`, {
        command: command.action,
        result: result.success ? 'success' : 'failed',
        issueId: context.payload.data.issueId,
        actor: context.metadata.actor
      })

      // Stream the command response to TUI
      tuiEventStreamManager.streamEvent({
        ...context.payload,
        command: {
          raw: reference.raw,
          action: command.action,
          success: result.success,
          response: result.response
        }
      }, 'opencode_response')

    } catch (error) {
      console.error(`OpenCode reference processing failed:`, {
        reference: reference.raw,
        error: error instanceof Error ? error.message : 'Unknown error',
        actor: context.metadata.actor,
        issueId: context.payload.data.issueId
      })
      
      // Attempt to notify Linear about the processing error
      await this.notifyProcessingError(error, context, reference)
    }
  }

  /**
   * Extract structured command information from raw OpenCode reference
   * 
   * Parses the raw reference text to identify the action, arguments, and options.
   * This provides a structured representation that OpenCode can process consistently.
   * 
   * @param rawReference - The raw @opencode reference text
   * @returns Structured command object with action, args, and options
   */
  private extractOpenCodeCommand(rawReference: string): {
    action: string
    arguments: string[]
    options: Record<string, string>
  } {
    // Remove @opencode prefix and trim whitespace
    const commandText = rawReference.replace(/@opencode/i, '').trim()
    
    // Split into parts while preserving quoted strings
    const parts = this.parseCommandLine(commandText)
    
    // First part is the action, rest are arguments
    const action = parts[0] || 'help'
    const arguments: string[] = []
    const options: Record<string, string> = {}
    
    // Parse arguments and options (key=value or --flag format)
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]
      if (part.startsWith('--') && part.includes('=')) {
        const [key, value] = part.substring(2).split('=', 2)
        options[key] = value
      } else if (part.startsWith('--')) {
        options[part.substring(2)] = 'true'
      } else {
        arguments.push(part)
      }
    }
    
    return { action, arguments, options }
  }

  /**
   * Parse command line string preserving quoted arguments
   * 
   * Handles complex command lines with quoted strings that may contain spaces.
   * This ensures that arguments like "create file with spaces.ts" are preserved correctly.
   * 
   * @param commandLine - Raw command line text
   * @returns Array of parsed command parts
   */
  private parseCommandLine(commandLine: string): string[] {
    const parts: string[] = []
    let current = ''
    let inQuotes = false
    let quoteChar = ''
    
    for (let i = 0; i < commandLine.length; i++) {
      const char = commandLine[i]
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false
        quoteChar = ''
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current)
          current = ''
        }
      } else {
        current += char
      }
    }
    
    if (current) {
      parts.push(current)
    }
    
    return parts
  }

  /**
   * Create execution context for OpenCode command processing
   * 
   * Combines Linear webhook context with OpenCode reference information
   * to provide comprehensive context for command execution.
   * 
   * @param context - Linear webhook event context
   * @param reference - OpenCode reference information
   * @returns Complete execution context for OpenCode
   */
  private createExecutionContext(context: EventContext, reference: import('./opencode-reference-detector').OpenCodeReference): {
    linear: {
      issueId: string
      issueIdentifier: string
      commentId: string
      actor: string
      timestamp: string
      issueUrl: string
    }
    command: {
      raw: string
      position: number
    }
    metadata: Record<string, any>
  } {
    const payload = context.payload
    const issueData = payload.data
    
    return {
      linear: {
        issueId: issueData.issueId || issueData.id,
        issueIdentifier: issueData.issue?.identifier || 'Unknown',
        commentId: issueData.id,
        actor: context.metadata.actor,
        timestamp: context.metadata.timestamp,
        issueUrl: issueData.issue?.url || payload.url || 'No URL'
      },
      command: {
        raw: reference.raw,
        position: reference.position
      },
      metadata: {
        webhookType: payload.type,
        webhookAction: payload.action,
        processedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Execute OpenCode command through the agent system
   * 
   * Integrates with OpenCode's agent architecture to execute commands
   * with full context awareness and proper error handling.
   * 
   * @param command - Structured command object
   * @param context - Execution context with Linear information
   * @returns Command execution result with success status and response data
   */
  private async executeOpenCodeCommand(
    command: { action: string; args: string[]; options: Record<string, string> },
    context: any
  ): Promise<{
    success: boolean
    response: string
    data?: any
    error?: string
  }> {
    try {
      // Import OpenCode agent dynamically to avoid circular dependencies
      const { executeOpenCodeAgent } = await import('../opencode/agent-executor')
      
      // Execute the command with full context
      const result = await executeOpenCodeAgent({
        action: command.action,
        arguments: command.arguments,
        options: command.options,
        context: context,
        source: 'linear-webhook'
      })
      
      return {
        success: true,
        response: result.response || 'Command executed successfully',
        data: result.data
      }
      
    } catch (error) {
      return {
        success: false,
        response: 'Command execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Handle command execution response by updating Linear issue
   * 
   * Posts the command result back to the Linear issue as a comment,
   * providing feedback to the user who initiated the command.
   * 
   * @param result - Command execution result
   * @param context - Original Linear webhook context
   * @param reference - Original OpenCode reference
   */
  private async handleCommandResponse(
    result: { success: boolean; response: string; data?: any; error?: string },
    context: EventContext,
    reference: import('./opencode-reference-detector').OpenCodeReference
  ): Promise<void> {
    try {
      // Import Linear CRUD operations
      const crud = getLinearCRUD()
      
      // Format response message
      const responseMessage = this.formatResponseMessage(result, reference)
      
      // Add comment to the Linear issue
      await crud.addComment(context.payload.data.issueId, responseMessage)
      
      console.log(`Response posted to Linear issue:`, {
        issueId: context.payload.data.issueId,
        success: result.success,
        messageLength: responseMessage.length
      })
      
    } catch (error) {
      console.error(`Failed to post response to Linear:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueId: context.payload.data.issueId
      })
    }
  }

  /**
   * Format command response for Linear comment display
   * 
   * Creates a well-formatted response message that clearly indicates
   * the command result and provides any relevant output or error information.
   * 
   * @param result - Command execution result
   * @param reference - Original OpenCode reference
   * @returns Formatted response message for Linear comment
   */
  private formatResponseMessage(
    result: { success: boolean; response: string; data?: any; error?: string },
    reference: import('./opencode-reference-detector').OpenCodeReference
  ): string {
    const status = result.success ? '✅ Success' : '❌ Failed'
    const command = reference.raw.replace(/@opencode/i, '').trim()
    
    let message = `**${status}** for command: \`${command}\`\n\n`
    message += `**Response:** ${result.response}\n`
    
    if (result.data && Object.keys(result.data).length > 0) {
      message += `\n**Output:**\n\`\`\`\n${JSON.stringify(result.data, null, 2)}\n\`\`\`\n`
    }
    
    if (result.error) {
      message += `\n**Error:** ${result.error}\n`
    }
    
    message += `\n*Processed by OpenCode at ${new Date().toISOString()}*`
    
    return message
  }

  /**
   * Determine if a command should create a session
   * 
   * Interactive commands that might require follow-up actions
   * should create sessions for better user experience.
   * 
   * @param command - Parsed command to evaluate
   * @returns True if command should create a session
   */
  private shouldCreateSession(command: { action: string; arguments: string[]; options: Record<string, string> }): boolean {
    // Commands that typically benefit from session context
    const sessionCommands = [
      'create-file',
      'edit-file',
      'build',
      'deploy',
      'debug',
      'shell',
      'terminal'
    ]
    
    // Check if command action requires a session
    if (sessionCommands.includes(command.action.toLowerCase())) {
      return true
    }
    
    // Check for session option
    if (command.options.session === 'true' || command.options.session === 'auto') {
      return true
    }
    
    // Commands with multiple arguments might benefit from sessions
    if (command.arguments.length > 2) {
      return true
    }
    
    return false
  }

  /**
   * Handle session-based command response
   * 
   * Processes responses from commands executed within a session context.
   * Provides session information and continuation options to the user.
   * 
   * @param result - Command execution result from session
   * @param context - Original Linear webhook context
   * @param reference - Original OpenCode reference
   * @param sessionId - ID of the session that executed the command
   */
  private async handleSessionCommandResponse(
    result: { success: boolean; response: string; data?: any; error?: string },
    context: EventContext,
    reference: import('./opencode-reference-detector').OpenCodeReference,
    sessionId: string
  ): Promise<void> {
    try {
      const crud = getLinearCRUD()
      
      // Format response with session information
      const responseMessage = this.formatSessionResponseMessage(result, reference, sessionId)
      
      // Add comment to the Linear issue
      await crud.addComment(context.payload.data.issueId, responseMessage)
      
      console.log(`Session-based response posted to Linear:`, {
        issueId: context.payload.data.issueId,
        sessionId: sessionId,
        success: result.success
      })
      
    } catch (error) {
      console.error(`Failed to post session response to Linear:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueId: context.payload.data.issueId,
        sessionId: sessionId
      })
    }
  }

  /**
   * Format session-based command response for Linear comment display
   * 
   * Creates a comprehensive response that includes command results,
   * session information, and options for continued interaction.
   * 
   * @param result - Command execution result
   * @param reference - Original OpenCode reference
   * @param sessionId - ID of the session
   * @returns Formatted response message for Linear comment
   */
  private formatSessionResponseMessage(
    result: { success: boolean; response: string; data?: any; error?: string },
    reference: import('./opencode-reference-detector').OpenCodeReference,
    sessionId: string
  ): string {
    const status = result.success ? '✅ Success' : '❌ Failed'
    const command = reference.raw.replace(/@opencode/i, '').trim()
    
    let message = `**${status}** (Session: \`${sessionId.substring(0, 8)}\`) for command: \`${command}\`\n\n`
    message += `**Response:** ${result.response}\n`
    
    if (result.data && Object.keys(result.data).length > 0) {
      message += `\n**Output:**\n\`\`\`\n${JSON.stringify(result.data, null, 2)}\n\`\`\`\n`
    }
    
    if (result.error) {
      message += `\n**Error:** ${result.error}\n`
    }
    
    // Add session continuation options
    message += `\n**Session Options:**\n`
    message += `- Session ID: \`${sessionId}\`\n`
    message += `- Continue with: \`@opencode --session=${sessionId} <command>\`\n`
    message += `- End session: \`@opencode --session=${sessionId} exit\`\n`
    
    message += `\n*Processed by OpenCode session at ${new Date().toISOString()}*`
    
    return message
  }

  /**
   * Notify Linear about processing errors
   * 
   * When command processing fails, posts an error comment to the Linear issue
   * so the user is aware that their command could not be processed.
   * 
   * @param error - Processing error that occurred
   * @param context - Original Linear webhook context
   * @param reference - Original OpenCode reference
   */
  private async notifyProcessingError(
    error: any,
    context: EventContext,
    reference: import('./opencode-reference-detector').OpenCodeReference
  ): Promise<void> {
    try {
      const crud = getLinearCRUD()
      
      const errorMessage = `**❌ Processing Error**\n\n` +
        `Failed to process command: \`${reference.raw}\`\n\n` +
        `**Error:** ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
        `*Please check the command syntax and try again.*\n\n` +
        `*Error occurred at ${new Date().toISOString()}*`
      
      await crud.addComment(context.payload.data.issueId, errorMessage)
      
    } catch (notifyError) {
      console.error(`Failed to notify Linear about processing error:`, notifyError)
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