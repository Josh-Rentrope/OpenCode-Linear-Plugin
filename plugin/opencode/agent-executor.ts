/**
 * OpenCode Agent Executor
 * 
 * Provides command execution interface for OpenCode agents.
 * Handles command routing, execution context management, and result processing.
 * Integrates with the OpenCode plugin system for agent execution.
 */

import type { AgentExecutionRequest, AgentExecutionResult } from './types'

/**
 * Agent Executor Configuration
 */
interface AgentExecutorConfig {
  /** Default execution timeout in milliseconds */
  defaultTimeout: number
  
  /** Maximum execution timeout in milliseconds */
  maxTimeout: number
  
  /** Enable execution logging */
  enableLogging: boolean
  
  /** Execution retry attempts */
  retryAttempts: number
}

/**
 * OpenCode Agent Executor
 * 
 * Executes OpenCode commands through the agent system with proper
 * context management and error handling. Provides a unified interface
 * for command execution from various sources (webhooks, sessions, etc.).
 */
export class AgentExecutor {
  /** Executor configuration */
  private config: AgentExecutorConfig = {
    defaultTimeout: 30000, // 30 seconds
    maxTimeout: 300000, // 5 minutes
    enableLogging: true,
    retryAttempts: 2
  }

  /**
   * Execute an OpenCode command
   * 
   * @param request - Agent execution request
   * @returns Execution result with success status and response
   */
  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now()
    const executionId = this.generateExecutionId()
    
    try {
      if (this.config.enableLogging) {
        console.log(`Executing OpenCode command: ${request.action}`, {
          executionId,
          arguments: request.arguments,
          options: request.options,
          source: request.source
        })
      }

      // Validate request
      this.validateRequest(request)
      
      // Execute command with timeout
      const result = await this.executeWithTimeout(request, executionId)
      
      const duration = Date.now() - startTime
      
      if (this.config.enableLogging) {
        console.log(`Command execution completed: ${request.action}`, {
          executionId,
          success: result.success,
          duration: `${duration}ms`
        })
      }

      return {
        ...result,
        metadata: {
          executedAt: new Date().toISOString(),
          duration,
          agent: 'OpenCodeAgent',
          source: request.source
        }
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (this.config.enableLogging) {
        console.error(`Command execution failed: ${request.action}`, {
          executionId,
          error: errorMessage,
          duration: `${duration}ms`
        })
      }

      return {
        success: false,
        response: 'Command execution failed',
        error: errorMessage,
        metadata: {
          executedAt: new Date().toISOString(),
          duration,
          agent: 'OpenCodeAgent',
          source: request.source
        }
      }
    }
  }

  /**
   * Execute command with timeout and retry logic
   * 
   * @param request - Execution request
   * @param executionId - Unique execution identifier
   * @returns Execution result
   */
  private async executeWithTimeout(
    request: AgentExecutionRequest,
    executionId: string
  ): Promise<Omit<AgentExecutionResult, 'metadata'>> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.config.retryAttempts + 1; attempt++) {
      try {
        // Determine timeout based on request options
        const timeout = this.getExecutionTimeout(request)
        
        // Execute with timeout
        const result = await Promise.race([
          this.executeCommand(request, executionId),
          this.createTimeoutPromise(timeout)
        ])
        
        return result
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (this.config.enableLogging) {
          console.warn(`Command execution attempt ${attempt} failed: ${request.action}`, {
            executionId,
            error: lastError.message,
            willRetry: attempt <= this.config.retryAttempts
          })
        }
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(lastError)) {
          throw lastError
        }
        
        // Wait before retry (exponential backoff)
        if (attempt <= this.config.retryAttempts) {
          await this.delay(Math.pow(2, attempt - 1) * 1000)
        }
      }
    }
    
    throw lastError || new Error('All execution attempts failed')
  }

  /**
   * Execute the actual command
   * 
   * @param request - Execution request
   * @param executionId - Execution identifier
   * @returns Command execution result
   */
  private async executeCommand(
    request: AgentExecutionRequest,
    executionId: string
  ): Promise<Omit<AgentExecutionResult, 'metadata'>> {
    // This is where the actual OpenCode agent execution happens
    // For now, we'll provide a mock implementation that can be
    // replaced with actual OpenCode agent integration
    
    const { action, arguments: args, options, context } = request
    
    // Mock command execution based on action type
    switch (action.toLowerCase()) {
      case 'help':
        return {
          success: true,
          response: this.generateHelpMessage(),
          data: {
            availableCommands: ['create', 'update', 'delete', 'list', 'help'],
            usage: '@opencode <command> [arguments] [options]'
          }
        }
        
      case 'create':
        return this.handleCreateCommand(args, options, context)
        
      case 'update':
        return this.handleUpdateCommand(args, options, context)
        
      case 'delete':
        return this.handleDeleteCommand(args, options, context)
        
      case 'list':
        return this.handleListCommand(args, options, context)
        
      case 'status':
        return this.handleStatusCommand(args, options, context)
        
      default:
        return {
          success: false,
          response: `Unknown command: ${action}`,
          error: `Command '${action}' is not recognized. Use 'help' for available commands.`
        }
    }
  }

  /**
   * Handle create commands
   */
  private handleCreateCommand(
    args: string[],
    options: Record<string, string>,
    context: any
  ): Omit<AgentExecutionResult, 'metadata'> {
    const entityType = args[0]
    
    if (!entityType) {
      return {
        success: false,
        response: 'Create command requires an entity type',
        error: 'Usage: @opencode create <entity> [properties]'
      }
    }
    
    // Mock implementation
    return {
      success: true,
      response: `Created ${entityType} successfully`,
      data: {
        entity: entityType,
        id: `mock_${Date.now()}`,
        properties: options,
        context: context.linear?.issueIdentifier || 'Unknown'
      }
    }
  }

  /**
   * Handle update commands
   */
  private handleUpdateCommand(
    args: string[],
    options: Record<string, string>,
    context: any
  ): Omit<AgentExecutionResult, 'metadata'> {
    const entityId = args[0]
    
    if (!entityId) {
      return {
        success: false,
        response: 'Update command requires an entity ID',
        error: 'Usage: @opencode update <id> [properties]'
      }
    }
    
    // Mock implementation
    return {
      success: true,
      response: `Updated ${entityId} successfully`,
      data: {
        id: entityId,
        updatedProperties: options,
        context: context.linear?.issueIdentifier || 'Unknown'
      }
    }
  }

  /**
   * Handle delete commands
   */
  private handleDeleteCommand(
    args: string[],
    options: Record<string, string>,
    context: any
  ): Omit<AgentExecutionResult, 'metadata'> {
    const entityId = args[0]
    
    if (!entityId) {
      return {
        success: false,
        response: 'Delete command requires an entity ID',
        error: 'Usage: @opencode delete <id>'
      }
    }
    
    // Mock implementation
    return {
      success: true,
      response: `Deleted ${entityId} successfully`,
      data: {
        id: entityId,
        context: context.linear?.issueIdentifier || 'Unknown'
      }
    }
  }

  /**
   * Handle list commands
   */
  private handleListCommand(
    args: string[],
    options: Record<string, string>,
    context: any
  ): Omit<AgentExecutionResult, 'metadata'> {
    const entityType = args[0] || 'items'
    
    // Mock implementation
    return {
      success: true,
      response: `Found 3 ${entityType}`,
      data: {
        entity: entityType,
        items: [
          { id: 'item1', name: 'Sample Item 1' },
          { id: 'item2', name: 'Sample Item 2' },
          { id: 'item3', name: 'Sample Item 3' }
        ],
        context: context.linear?.issueIdentifier || 'Unknown'
      }
    }
  }

  /**
   * Handle status commands
   */
  private handleStatusCommand(
    args: string[],
    options: Record<string, string>,
    context: any
  ): Omit<AgentExecutionResult, 'metadata'> {
    // Mock implementation
    return {
      success: true,
      response: 'System status: Operational',
      data: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        context: context.linear?.issueIdentifier || 'Unknown'
      }
    }
  }

  /**
   * Generate help message
   */
  private generateHelpMessage(): string {
    return `
**OpenCode Commands:**

• **create** <entity> [properties] - Create a new entity
• **update** <id> [properties] - Update an existing entity  
• **delete** <id> - Delete an entity
• **list** [entity] - List entities
• **status** - Show system status
• **help** - Show this help message

**Options:**
Use \`--key=value\` format for options (e.g., \`--priority=high\`)

**Examples:**
• @opencode create issue --title="Bug fix" --priority=high
• @opencode list issues --status=open
• @opencode status
    `.trim()
  }

  /**
   * Validate execution request
   */
  private validateRequest(request: AgentExecutionRequest): void {
    if (!request.action || typeof request.action !== 'string') {
      throw new Error('Invalid action: must be a non-empty string')
    }
    
    if (!Array.isArray(request.arguments)) {
      throw new Error('Invalid arguments: must be an array')
    }
    
    if (!request.options || typeof request.options !== 'object') {
      throw new Error('Invalid options: must be an object')
    }
    
    if (!request.source || typeof request.source !== 'string') {
      throw new Error('Invalid source: must be a non-empty string')
    }
  }

  /**
   * Get execution timeout from request
   */
  private getExecutionTimeout(request: AgentExecutionRequest): number {
    const timeoutOption = request.options.timeout
    if (timeoutOption) {
      const timeout = parseInt(timeoutOption, 10)
      if (!isNaN(timeout) && timeout > 0) {
        return Math.min(timeout, this.config.maxTimeout)
      }
    }
    
    return this.config.defaultTimeout
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Command execution timeout (${timeout}ms)`))
      }, timeout)
    })
  }

  /**
   * Check if error should not be retried
   */
  private shouldNotRetry(error: Error): boolean {
    const noRetryMessages = [
      'Invalid action',
      'Invalid arguments', 
      'Invalid options',
      'Invalid source',
      'Unknown command',
      'Usage:',
      'permission denied',
      'authentication failed'
    ]
    
    return noRetryMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    )
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Global agent executor instance
 */
export const agentExecutor = new AgentExecutor()

/**
 * Execute OpenCode agent command (convenience function)
 * 
 * @param request - Agent execution request
 * @returns Execution result
 */
export async function executeOpenCodeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
  return agentExecutor.execute(request)
}