/**
 * Session Manager for OpenCode Linear Integration
 * 
 * Manages interactive sessions for OpenCode command execution.
 * Handles session lifecycle, command history, and timeout management.
 * Provides context preservation across multiple command interactions.
 */

import { v4 as uuidv4 } from 'uuid'
import * as cron from 'node-cron'
import type { SessionContext, SessionState, SessionCommand, EventProcessingContext } from './types'

/**
 * Session Manager Configuration
 */
interface SessionManagerConfig {
  /** Default session timeout in minutes */
  defaultTimeout: number
  
  /** Maximum session duration in minutes */
  maxSessionDuration: number
  
  /** Cleanup interval in minutes */
  cleanupInterval: number
  
  /** Maximum commands per session */
  maxCommandsPerSession: number
}

/**
 * Session Manager
 * 
 * Manages interactive sessions for OpenCode command execution with
 * Linear webhook integration. Provides session lifecycle management,
 * command history tracking, and automatic cleanup.
 */
export class SessionManager {
  /** Active sessions storage */
  private sessions: Map<string, SessionState> = new Map()
  
  /** Session configuration */
  private config: SessionManagerConfig = {
    defaultTimeout: 30, // 30 minutes
    maxSessionDuration: 120, // 2 hours
    cleanupInterval: 5, // 5 minutes
    maxCommandsPerSession: 50
  }
  
  /** Cleanup task reference */
  private cleanupTask: cron.ScheduledTask | null = null

  /**
   * Initialize session manager
   * 
   * Starts the cleanup task and prepares session management.
   */
  constructor() {
    this.startCleanupTask()
    console.log('Session Manager initialized')
  }

  /**
   * Create a new session from webhook context
   * 
   * @param context - Event processing context from webhook
   * @param command - Parsed command information
   * @param options - Session creation options
   * @returns Created session state
   */
  createSession(
    context: EventProcessingContext,
    command: { action: string; arguments: string[]; options: Record<string, string> },
    options: { timeout?: number; priority?: 'low' | 'medium' | 'high' } = {}
  ): SessionState {
    const sessionId = uuidv4()
    const now = new Date().toISOString()
    
    const sessionContext: SessionContext = {
      id: sessionId,
      linear: {
        issueId: context.payload.data.issueId || context.payload.data.id,
        issueIdentifier: context.payload.data.issue?.identifier || 'Unknown',
        commentId: context.payload.data.id,
        actor: context.metadata.actor,
        timestamp: context.metadata.timestamp,
        issueUrl: context.payload.data.issue?.url || context.payload.url || 'No URL'
      },
      command: {
        raw: command.action + ' ' + command.arguments.join(' '),
        action: command.action,
        arguments: command.arguments,
        options: command.options
      },
      metadata: {
        createdAt: now,
        lastActivity: now,
        commandCount: 0,
        source: context.options.source || 'linear-webhook'
      }
    }

    const sessionState: SessionState = {
      id: sessionId,
      context: sessionContext,
      status: 'active',
      history: [],
      timeout: options.timeout || this.config.defaultTimeout,
      lastActivity: now
    }

    this.sessions.set(sessionId, sessionState)
    
    console.log(`Session created: ${sessionId} for issue ${sessionContext.linear.issueIdentifier}`)
    
    return sessionState
  }

  /**
   * Activate an existing session
   * 
   * @param sessionId - Session identifier
   * @returns True if session was activated successfully
   */
  activateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.warn(`Session not found: ${sessionId}`)
      return false
    }

    if (session.status === 'expired') {
      console.warn(`Cannot activate expired session: ${sessionId}`)
      return false
    }

    session.status = 'active'
    session.lastActivity = new Date().toISOString()
    
    console.log(`Session activated: ${sessionId}`)
    return true
  }

  /**
   * Execute a command within a session context
   * 
   * @param sessionId - Session identifier
   * @param command - Command to execute
   * @returns Command execution result
   */
  async executeCommandInSession(
    sessionId: string,
    command: { action: string; arguments: string[]; options: Record<string, string> }
  ): Promise<{
    success: boolean
    response: string
    data?: any
    error?: string
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        response: 'Session not found',
        error: `Session ${sessionId} does not exist`
      }
    }

    if (session.status === 'expired') {
      return {
        success: false,
        response: 'Session expired',
        error: `Session ${sessionId} has expired`
      }
    }

    // Check command limit
    if (session.history.length >= this.config.maxCommandsPerSession) {
      return {
        success: false,
        response: 'Session command limit exceeded',
        error: `Maximum ${this.config.maxCommandsPerSession} commands per session`
      }
    }

    const startTime = Date.now()
    const commandId = uuidv4()
    
    try {
      // Execute the command through OpenCode agent system
      const result = await this.executeOpenCodeCommand(command, session.context)
      
      const duration = Date.now() - startTime
      
      // Record command in session history
      const sessionCommand: SessionCommand = {
        id: commandId,
        action: command.action,
        arguments: command.arguments,
        options: command.options,
        timestamp: new Date().toISOString(),
        result: {
          success: result.success,
          response: result.response,
          data: result.data,
          error: result.error
        },
        duration
      }
      
      session.history.push(sessionCommand)
      session.context.metadata.lastActivity = new Date().toISOString()
      session.context.metadata.commandCount = session.history.length
      session.lastActivity = new Date().toISOString()
      
      console.log(`Command executed in session ${sessionId}: ${command.action} (${duration}ms)`)
      
      return result
      
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Record failed command
      const sessionCommand: SessionCommand = {
        id: commandId,
        action: command.action,
        arguments: command.arguments,
        options: command.options,
        timestamp: new Date().toISOString(),
        result: {
          success: false,
          response: 'Command execution failed',
          error: errorMessage
        },
        duration
      }
      
      session.history.push(sessionCommand)
      session.lastActivity = new Date().toISOString()
      
      console.error(`Command failed in session ${sessionId}: ${command.action} - ${errorMessage}`)
      
      return {
        success: false,
        response: 'Command execution failed',
        error: errorMessage
      }
    }
  }

  /**
   * Get session information
   * 
   * @param sessionId - Session identifier
   * @returns Session state or null if not found
   */
  getSession(sessionId: string): SessionState | null {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    // Check if session has expired
    if (this.isSessionExpired(session)) {
      session.status = 'expired'
      console.log(`Session expired: ${sessionId}`)
    }

    return session
  }

  /**
   * End a session
   * 
   * @param sessionId - Session identifier
   * @param reason - Reason for ending session
   * @returns True if session was ended successfully
   */
  endSession(sessionId: string, reason = 'user_request'): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    session.status = 'completed'
    session.lastActivity = new Date().toISOString()
    
    console.log(`Session ended: ${sessionId} (${reason})`)
    
    // Remove session after a short delay to allow final status checks
    setTimeout(() => {
      this.sessions.delete(sessionId)
    }, 5000)
    
    return true
  }

  /**
   * Get all active sessions
   * 
   * @returns Array of active session states
   */
  getActiveSessions(): SessionState[] {
    const activeSessions: SessionState[] = []
    
    for (const session of this.sessions.values()) {
      if (session.status === 'active' && !this.isSessionExpired(session)) {
        activeSessions.push(session)
      }
    }
    
    return activeSessions
  }

  /**
   * Get session statistics
   * 
   * @returns Session manager statistics
   */
  getStatistics(): {
    totalSessions: number
    activeSessions: number
    expiredSessions: number
    completedSessions: number
    averageCommandsPerSession: number
  } {
    let activeCount = 0
    let expiredCount = 0
    let completedCount = 0
    let totalCommands = 0
    
    for (const session of this.sessions.values()) {
      if (this.isSessionExpired(session)) {
        session.status = 'expired'
      }
      
      switch (session.status) {
        case 'active':
          activeCount++
          break
        case 'expired':
          expiredCount++
          break
        case 'completed':
          completedCount++
          break
      }
      
      totalCommands += session.history.length
    }
    
    const totalSessions = this.sessions.size
    const averageCommands = totalSessions > 0 ? totalCommands / totalSessions : 0
    
    return {
      totalSessions,
      activeSessions: activeCount,
      expiredSessions: expiredCount,
      completedSessions: completedCount,
      averageCommandsPerSession: Math.round(averageCommands * 100) / 100
    }
  }

  /**
   * Execute OpenCode command through agent system
   * 
   * @param command - Command to execute
   * @param context - Session context
   * @returns Command execution result
   */
  private async executeOpenCodeCommand(
    command: { action: string; arguments: string[]; options: Record<string, string> },
    context: SessionContext
  ): Promise<{
    success: boolean
    response: string
    data?: any
    error?: string
  }> {
    try {
      // Import OpenCode agent executor dynamically
      const { executeOpenCodeAgent } = await import('./agent-executor')
      
      const result = await executeOpenCodeAgent({
        action: command.action,
        arguments: command.arguments,
        options: command.options,
        context: context,
        source: 'linear-session'
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
   * Check if a session has expired
   * 
   * @param session - Session to check
   * @returns True if session has expired
   */
  private isSessionExpired(session: SessionState): boolean {
    const now = new Date()
    const lastActivity = new Date(session.lastActivity)
    const elapsedMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60)
    
    return elapsedMinutes > session.timeout
  }

  /**
   * Start cleanup task for expired sessions
   */
  private startCleanupTask(): void {
    // Run cleanup every 5 minutes
    this.cleanupTask = cron.schedule(`*/${this.config.cleanupInterval} * * * *`, () => {
      this.cleanup()
    }, {
      scheduled: true
    })
    
    console.log(`Session cleanup task started (every ${this.config.cleanupInterval} minutes)`)
  }

  /**
   * Cleanup expired and old sessions
   */
  private cleanup(): void {
    const now = new Date()
    let cleanedCount = 0
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const lastActivity = new Date(session.lastActivity)
      const elapsedMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60)
      
      // Remove expired sessions or very old completed sessions
      const shouldRemove = 
        (session.status === 'active' && elapsedMinutes > session.timeout) ||
        (session.status === 'completed' && elapsedMinutes > this.config.cleanupInterval * 2) ||
        (elapsedMinutes > this.config.maxSessionDuration)
      
      if (shouldRemove) {
        if (session.status === 'active') {
          session.status = 'expired'
        }
        
        this.sessions.delete(sessionId)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Session cleanup completed: removed ${cleanedCount} expired sessions`)
    }
  }

  /**
   * Shutdown session manager
   * 
   * Stops cleanup task and cleans up all sessions.
   */
  shutdown(): void {
    if (this.cleanupTask) {
      this.cleanupTask.stop()
      this.cleanupTask = null
    }
    
    // Mark all active sessions as completed
    for (const session of this.sessions.values()) {
      if (session.status === 'active') {
        session.status = 'completed'
      }
    }
    
    console.log('Session Manager shutdown completed')
  }
}

/**
 * Global session manager instance
 * 
 * Singleton pattern ensures consistent session management across the application.
 */
export const linearSessionManager = new SessionManager()