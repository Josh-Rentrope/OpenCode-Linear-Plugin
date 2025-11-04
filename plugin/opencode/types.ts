/**
 * OpenCode Integration Types
 * 
 * Common type definitions for OpenCode integration components.
 * Includes event types, session types, and agent execution interfaces.
 */

/**
 * Linear stream event structure for TUI integration
 */
export interface LinearStreamEvent {
  /** Unique event identifier */
  id: string
  
  /** Event type for routing and filtering */
  type: string
  
  /** Event payload data */
  payload: any
  
  /** Event timestamp */
  timestamp: string
  
  /** Additional event metadata */
  metadata: {
    source: string
    processedAt: string
    [key: string]: any
  }
}

/**
 * Session context for OpenCode command execution
 */
export interface SessionContext {
  /** Unique session identifier */
  id: string
  
  /** Linear webhook event context */
  linear: {
    issueId: string
    issueIdentifier: string
    commentId: string
    actor: string
    timestamp: string
    issueUrl: string
  }
  
  /** Command information */
  command: {
    raw: string
    action: string
    arguments: string[]
    options: Record<string, string>
  }
  
  /** Session metadata */
  metadata: {
    createdAt: string
    lastActivity: string
    commandCount: number
    source: string
  }
}

/**
 * Session state information
 */
export interface SessionState {
  /** Session identifier */
  id: string
  
  /** Session context */
  context: SessionContext
  
  /** Session status */
  status: 'active' | 'paused' | 'completed' | 'expired'
  
  /** Session history */
  history: SessionCommand[]
  
  /** Session timeout */
  timeout: number
  
  /** Last activity timestamp */
  lastActivity: string
}

/**
 * Command execution record for session history
 */
export interface SessionCommand {
  /** Command identifier */
  id: string
  
  /** Command action */
  action: string
  
  /** Command arguments */
  arguments: string[]
  
  /** Command options */
  options: Record<string, string>
  
  /** Execution timestamp */
  timestamp: string
  
  /** Execution result */
  result: {
    success: boolean
    response: string
    data?: any
    error?: string
  }
  
  /** Execution duration in milliseconds */
  duration: number
}

/**
 * Agent execution request structure
 */
export interface AgentExecutionRequest {
  /** Command action to execute */
  action: string
  
  /** Command arguments */
  arguments: string[]
  
  /** Command options */
  options: Record<string, string>
  
  /** Execution context */
  context: any
  
  /** Execution source */
  source: string
}

/**
 * Agent execution result structure
 */
export interface AgentExecutionResult {
  /** Execution success status */
  success: boolean
  
  /** Response message */
  response: string
  
  /** Result data */
  data?: any
  
  /** Error information */
  error?: string
  
  /** Execution metadata */
  metadata: {
    executedAt: string
    duration: number
    agent: string
    source: string
  }
}

/**
 * OpenCode reference detection result
 */
export interface OpenCodeReference {
  /** Raw reference text */
  raw: string
  
  /** Reference position in text */
  position: {
    start: number
    end: number
  }
  
  /** Reference type */
  type: 'command' | 'mention' | 'tag'
  
  /** Extracted command if applicable */
  command?: {
    action: string
    arguments: string[]
    options: Record<string, string>
  }
}

/**
 * Event processing context for webhook handlers
 */
export interface EventProcessingContext {
  /** Original webhook payload */
  payload: any
  
  /** Detected OpenCode references */
  references: OpenCodeReference[]
  
  /** Event metadata */
  metadata: {
    eventType: string
    action: string
    actor: string
    timestamp: string
    entityId: string
  }
  
  /** Processing options */
  options: {
    createSession?: boolean
    timeout?: number
    priority?: 'low' | 'medium' | 'high'
    source?: string
  }
}