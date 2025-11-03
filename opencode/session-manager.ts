/**
 * OpenCode Session Manager for Linear Integration
 * 
 * Manages OpenCode sessions that are initiated from Linear commands.
 * Provides session lifecycle management, context preservation, and
 * integration with the OpenCode TUI for interactive sessions.
 */

import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'

/**
 * Session status types for tracking session lifecycle
 */
export type SessionStatus = 'initializing' | 'active' | 'paused' | 'completed' | 'error'

/**
 * OpenCode session initiated from Linear
 * 
 * Represents an interactive session that was started by a Linear command.
 * Maintains context, state, and communication channels for the session.
 */
export interface LinearOpenCodeSession {
  /** Unique session identifier */
  id: string
  /** Session status for lifecycle tracking */
  status: SessionStatus
  /** Original Linear context that initiated the session */
  linearContext: {
    issueId: string
    issueIdentifier: string
    commentId: string
    actor: string
    timestamp: string
    issueUrl: string
  }
  /** Initial command that started the session */
  initialCommand: {
    raw: string
    action: string
    arguments: string[]
    options: Record<string, string>
  }
  /** Session execution history */
  history: Array<{
    timestamp: string
    type: 'command' | 'response' | 'error' | 'status'
    content: string
    data?: any
  }>
  /** Current session state and context */
  state: {
    currentDirectory?: string
    activeFiles: string[]
    environment: Record<string, string>
    metadata: Record<string, any>
  }
  /** Session metadata */
  metadata: {
    createdAt: string
    updatedAt: string
    duration?: number
    commandCount: number
    lastActivity: string
  }
}

/**
 * Session Manager for Linear-initiated OpenCode sessions
 * 
 * Handles the creation, management, and lifecycle of sessions that
 * are started from Linear commands. Provides persistence and recovery
 * capabilities for long-running interactive sessions.
 */
export class LinearSessionManager extends EventEmitter {
  private sessions: Map<string, LinearOpenCodeSession> = new Map()
  private activeSessions: Set<string> = new Set()
  private maxSessionDuration = 60 * 60 * 1000 // 1 hour in milliseconds
  private cleanupInterval: NodeJS.Timeout | null = null

  /**
   * Initialize the session manager
   * 
   * Sets up session tracking, cleanup processes, and event handling.
   * Starts automatic cleanup of expired sessions.
   */
  constructor() {
    super()
    this.setupCleanupProcess()
    console.log('Linear Session Manager initialized')
  }

  /**
   * Create a new session from a Linear command
   * 
   * Initiates a new OpenCode session based on a Linear webhook event.
   * Creates the session context, initializes state, and starts tracking.
   * 
   * @param linearContext - Linear webhook context information
   * @param command - Parsed OpenCode command that initiated the session
   * @returns Created session information
   */
  createSession(
    linearContext: any,
    command: { action: string; arguments: string[]; options: Record<string, string> }
  ): LinearOpenCodeSession {
    const sessionId = uuidv4()
    const now = new Date().toISOString()

    const session: LinearOpenCodeSession = {
      id: sessionId,
      status: 'initializing',
      linearContext: {
        issueId: linearContext.payload.data.issueId,
        issueIdentifier: linearContext.payload.data.issue?.identifier || 'Unknown',
        commentId: linearContext.payload.data.id,
        actor: linearContext.metadata.actor,
        timestamp: linearContext.metadata.timestamp,
        issueUrl: linearContext.payload.data.issue?.url || linearContext.payload.url || '#'
      },
      initialCommand: {
        raw: command.action + ' ' + command.arguments.join(' '),
        action: command.action,
        arguments: command.arguments,
        options: command.options
      },
      history: [{
        timestamp: now,
        type: 'command',
        content: `Session initiated by: ${command.action} ${command.arguments.join(' ')}`,
        data: { command }
      }],
      state: {
        activeFiles: [],
        environment: {
          SESSION_SOURCE: 'linear',
          LINEAR_ISSUE_ID: linearContext.payload.data.issueId,
          LINEAR_ACTOR: linearContext.metadata.actor
        },
        metadata: {
          source: 'linear-webhook',
          initialCommand: command.action
        }
      },
      metadata: {
        createdAt: now,
        updatedAt: now,
        commandCount: 1,
        lastActivity: now
      }
    }

    // Store the session
    this.sessions.set(sessionId, session)
    this.activeSessions.add(sessionId)

    // Emit session creation event
    this.emit('session:created', session)

    console.log(`New OpenCode session created:`, {
      sessionId,
      issueId: session.linearContext.issueId,
      actor: session.linearContext.actor,
      command: command.action
    })

    return session
  }

  /**
   * Activate a session for command execution
   * 
   * Transitions a session from initializing to active state.
   * Prepares the session for interactive command execution.
   * 
   * @param sessionId - ID of the session to activate
   * @returns True if session was successfully activated
   */
  activateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.error(`Session not found: ${sessionId}`)
      return false
    }

    if (session.status !== 'initializing') {
      console.warn(`Session ${sessionId} is not in initializing state: ${session.status}`)
      return false
    }

    session.status = 'active'
    session.metadata.updatedAt = new Date().toISOString()
    session.metadata.lastActivity = session.metadata.updatedAt

    this.emit('session:activated', session)

    console.log(`Session activated: ${sessionId} for issue ${session.linearContext.issueIdentifier}`)
    return true
  }

  /**
   * Execute a command within an active session
   * 
   * Processes a command in the context of an existing session.
   * Updates session state, history, and tracks activity.
   * 
   * @param sessionId - ID of the session to execute command in
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

    if (session.status !== 'active') {
      return {
        success: false,
        response: 'Session not active',
        error: `Session ${sessionId} is not active (status: ${session.status})`
      }
    }

    try {
      // Record command in history
      const commandTimestamp = new Date().toISOString()
      session.history.push({
        timestamp: commandTimestamp,
        type: 'command',
        content: `${command.action} ${command.arguments.join(' ')}`,
        data: { command }
      })

      // Execute the command through OpenCode agent
      const { executeOpenCodeAgent } = await import('./agent-executor')
      const result = await executeOpenCodeAgent({
        action: command.action,
        arguments: command.arguments,
        options: command.options,
        context: {
          linear: session.linearContext,
          command: { raw: command.action + ' ' + command.arguments.join(' '), position: 0 },
          metadata: { ...session.state.metadata, sessionId }
        },
        source: 'linear-session'
      })

      // Record response in history
      session.history.push({
        timestamp: new Date().toISOString(),
        type: 'response',
        content: result.response,
        data: result.data
      })

      // Update session metadata
      session.metadata.updatedAt = new Date().toISOString()
      session.metadata.lastActivity = session.metadata.updatedAt
      session.metadata.commandCount += 1

      // Update session state based on command results
      this.updateSessionState(session, command, result)

      this.emit('session:command-executed', { session, command, result })

      return result

    } catch (error) {
      // Record error in history
      session.history.push({
        timestamp: new Date().toISOString(),
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error',
        data: { error }
      })

      session.status = 'error'
      session.metadata.updatedAt = new Date().toISOString()

      this.emit('session:error', { session, error })

      return {
        success: false,
        response: 'Command execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Update session state based on command execution results
   * 
   * Updates the session's working directory, active files, and environment
   * based on the results of command execution. This maintains context
   * across multiple commands in the same session.
   * 
   * @param session - Session to update
   * @param command - Command that was executed
   * @param result - Command execution result
   */
  private updateSessionState(
    session: LinearOpenCodeSession,
    command: { action: string; arguments: string[]; options: Record<string, string> },
    result: any
  ): void {
    // Update working directory for file operations
    if (command.action === 'create-file' && result.success && command.arguments.length > 0) {
      const filePath = command.arguments[0]
      session.state.activeFiles.push(filePath)
      
      // Update current directory based on file path
      const pathParts = filePath.split('/')
      if (pathParts.length > 1) {
        session.state.currentDirectory = pathParts.slice(0, -1).join('/')
      }
    }

    // Update environment variables from command options
    if (command.options) {
      Object.entries(command.options).forEach(([key, value]) => {
        if (key.startsWith('env.')) {
          const envKey = key.substring(4)
          session.state.environment[envKey] = value
        }
      })
    }

    // Store command-specific metadata
    session.state.metadata[`last_${command.action}`] = {
      timestamp: new Date().toISOString(),
      arguments: command.arguments,
      success: result.success
    }
  }

  /**
   * Pause an active session
   * 
   * Temporarily pauses a session without terminating it.
   * The session can be resumed later with preserved state.
   * 
   * @param sessionId - ID of the session to pause
   * @returns True if session was successfully paused
   */
  pauseSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'active') {
      return false
    }

    session.status = 'paused'
    session.metadata.updatedAt = new Date().toISOString()
    this.activeSessions.delete(sessionId)

    this.emit('session:paused', session)

    console.log(`Session paused: ${sessionId}`)
    return true
  }

  /**
   * Resume a paused session
   * 
   * Reactivates a previously paused session.
   * Restores the session to active state for continued use.
   * 
   * @param sessionId - ID of the session to resume
   * @returns True if session was successfully resumed
   */
  resumeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'paused') {
      return false
    }

    session.status = 'active'
    session.metadata.updatedAt = new Date().toISOString()
    session.metadata.lastActivity = session.metadata.updatedAt
    this.activeSessions.add(sessionId)

    this.emit('session:resumed', session)

    console.log(`Session resumed: ${sessionId}`)
    return true
  }

  /**
   * Complete and terminate a session
   * 
   * Marks a session as completed and performs cleanup.
   * Archives the session history and removes from active tracking.
   * 
   * @param sessionId - ID of the session to complete
   * @param summary - Optional completion summary
   * @returns True if session was successfully completed
   */
  completeSession(sessionId: string, summary?: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    session.status = 'completed'
    session.metadata.updatedAt = new Date().toISOString()
    
    // Calculate session duration
    const createdAt = new Date(session.metadata.createdAt).getTime()
    const updatedAt = new Date(session.metadata.updatedAt).getTime()
    session.metadata.duration = updatedAt - createdAt

    // Add completion summary to history
    if (summary) {
      session.history.push({
        timestamp: new Date().toISOString(),
        type: 'status',
        content: `Session completed: ${summary}`,
        data: { summary, duration: session.metadata.duration }
      })
    }

    this.activeSessions.delete(sessionId)

    this.emit('session:completed', session)

    console.log(`Session completed: ${sessionId} (duration: ${session.metadata.duration}ms)`)
    return true
  }

  /**
   * Get session information
   * 
   * Retrieves detailed information about a specific session.
   * 
   * @param sessionId - ID of the session to retrieve
   * @returns Session information or null if not found
   */
  getSession(sessionId: string): LinearOpenCodeSession | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * Get all sessions for a specific Linear issue
   * 
   * Retrieves all sessions that were initiated from a particular Linear issue.
   * Useful for tracking issue-related activity and context.
   * 
   * @param issueId - Linear issue ID to filter sessions by
   * @returns Array of sessions for the issue
   */
  getSessionsForIssue(issueId: string): LinearOpenCodeSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.linearContext.issueId === issueId
    )
  }

  /**
   * Get all active sessions
   * 
   * Returns all currently active sessions across all issues.
   * 
   * @returns Array of active session information
   */
  getActiveSessions(): LinearOpenCodeSession[] {
    return Array.from(this.activeSessions).map(sessionId => 
      this.sessions.get(sessionId)
    ).filter(session => session !== undefined) as LinearOpenCodeSession[]
  }

  /**
   * Get session statistics
   * 
   * Returns comprehensive statistics about session usage and status.
   * 
   * @returns Session statistics object
   */
  getStats(): {
    totalSessions: number
    activeSessions: number
    completedSessions: number
    errorSessions: number
    averageDuration: number
    totalCommands: number
  } {
    const sessions = Array.from(this.sessions.values())
    
    const completedSessions = sessions.filter(s => s.status === 'completed')
    const totalDuration = completedSessions.reduce((sum, s) => 
      sum + (s.metadata.duration || 0), 0
    )
    
    return {
      totalSessions: sessions.length,
      activeSessions: this.activeSessions.size,
      completedSessions: completedSessions.length,
      errorSessions: sessions.filter(s => s.status === 'error').length,
      averageDuration: completedSessions.length > 0 ? totalDuration / completedSessions.length : 0,
      totalCommands: sessions.reduce((sum, s) => sum + s.metadata.commandCount, 0)
    }
  }

  /**
   * Set up automatic cleanup process
   * 
   * Configures periodic cleanup of expired and old sessions
   * to prevent memory leaks and maintain system performance.
   */
  private setupCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions()
    }, 5 * 60 * 1000) // Run every 5 minutes
  }

  /**
   * Clean up expired sessions
   * 
   * Removes sessions that have exceeded the maximum duration
   * or have been inactive for too long.
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now()
    const expiredSessions: string[] = []

    for (const [sessionId, session] of this.sessions) {
      const lastActivity = new Date(session.metadata.lastActivity).getTime()
      const inactiveDuration = now - lastActivity

      // Clean up sessions inactive for too long
      if (inactiveDuration > this.maxSessionDuration) {
        expiredSessions.push(sessionId)
      }
    }

    // Remove expired sessions
    expiredSessions.forEach(sessionId => {
      const session = this.sessions.get(sessionId)
      if (session) {
        this.completeSession(sessionId, 'Expired due to inactivity')
        this.sessions.delete(sessionId)
        console.log(`Expired session cleaned up: ${sessionId}`)
      }
    })

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`)
    }
  }

  /**
   * Shutdown the session manager
   * 
   * Performs graceful shutdown of all active sessions
   * and cleans up resources.
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Complete all active sessions
    const activeSessionIds = Array.from(this.activeSessions)
    activeSessionIds.forEach(sessionId => {
      this.completeSession(sessionId, 'Session manager shutdown')
    })

    console.log('Linear Session Manager shutdown complete')
  }
}

// Export singleton instance for easy usage
export const linearSessionManager = new LinearSessionManager()