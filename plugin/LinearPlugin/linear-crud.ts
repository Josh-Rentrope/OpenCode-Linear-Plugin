/**
 * Linear CRUD Operations
 * 
 * A minimal wrapper around the Linear SDK providing basic CRUD operations
 * for Issues and Comments. This class handles authentication, validation,
 * and common patterns while keeping the API simple and focused.
 * 
 * Key design principles:
 * - Use nullish operators to avoid verbose if statements
 * - Handle teamId requirement automatically for issue creation
 * - Return undefined/null for not-found entities rather than throwing
 * - Keep error handling simple and informative
 */

import { LinearClient, Issue, Comment } from '@linear/sdk'
import { getLinearClient } from './linear-auth'

/**
 * Rate limit entry for tracking API usage
 */
interface RateLimitEntry {
  count: number
  resetTime: number
  windowStart: number
}

/**
 * Cache entry for storing API responses
 */
interface CacheEntry<T> {
  data: T
  expiry: number
  cachedAt: number
}

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number
  
  /** Time window in milliseconds */
  windowMs: number
  
  /** Retry after delay in milliseconds */
  retryAfterMs: number
}

/**
 * Cache configuration
 */
interface CacheConfig {
  /** Default TTL in milliseconds */
  defaultTtl: number
  
  /** Maximum cache size */
  maxSize: number
  
  /** Cleanup interval in milliseconds */
  cleanupInterval: number
}

export class LinearCRUD {
  /** Cached Linear client instance to avoid repeated auth checks */
  private client: LinearClient | null = null
  
  /** Rate limiting storage */
  private rateLimits: Map<string, RateLimitEntry> = new Map()
  
  /** Response cache storage */
  private cache: Map<string, CacheEntry<any>> = new Map()
  
  /** Rate limiting configuration */
  private rateLimitConfig: RateLimitConfig = {
    maxRequests: 100, // Linear's typical rate limit
    windowMs: 60 * 1000, // 1 minute window
    retryAfterMs: 1000 // 1 second retry delay
  }
  
  /** Cache configuration */
  private cacheConfig: CacheConfig = {
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000,
    cleanupInterval: 60 * 1000 // 1 minute
  }

  /**
   * Get authenticated Linear client
   * Uses nullish assignment to cache client after first successful auth
   * @throws Error if Linear client cannot be initialized
   */
  private async getClient(): Promise<LinearClient> {
    this.client ??= await getLinearClient()
    if (!this.client) throw new Error('Linear client not available')
    
    // Initialize cleanup tasks on first client access
    this.initializeCleanupTasks()
    
    return this.client
  }

  /**
   * Initialize cleanup tasks for rate limiting and cache
   */
  private initializeCleanupTasks(): void {
    if (typeof this.cleanupInterval === 'undefined') {
      // Start cleanup interval
      this.cleanupInterval = setInterval(() => {
        this.cleanupRateLimits()
        this.cleanupCache()
      }, this.cacheConfig.cleanupInterval)
    }
  }

  private cleanupInterval: NodeJS.Timeout | undefined

  // ==================== RATE LIMITING & CACHING ====================

  /**
   * Check rate limit for a specific operation
   * 
   * @param operation - Operation type for rate limiting
   * @returns Promise that resolves when rate limit allows operation
   */
  private async checkRateLimit(operation: string): Promise<void> {
    const now = Date.now()
    const entry = this.rateLimits.get(operation)
    
    if (!entry) {
      // First request for this operation
      this.rateLimits.set(operation, {
        count: 1,
        resetTime: now + this.rateLimitConfig.windowMs,
        windowStart: now
      })
      return
    }
    
    // Check if we're in a new window
    if (now >= entry.resetTime) {
      // Reset window
      entry.count = 1
      entry.windowStart = now
      entry.resetTime = now + this.rateLimitConfig.windowMs
      return
    }
    
    // Check if we've exceeded the rate limit
    if (entry.count >= this.rateLimitConfig.maxRequests) {
      const waitTime = entry.resetTime - now
      console.warn(`Rate limit exceeded for ${operation}. Waiting ${waitTime}ms`)
      
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, waitTime))
      return this.checkRateLimit(operation) // Recursive check after wait
    }
    
    // Increment counter
    entry.count++
  }

  /**
   * Get cached response if available and not expired
   * 
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    // Check if expired
    if (Date.now() >= entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  /**
   * Set cached response with TTL
   * 
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (optional)
   */
  private setCachedData<T>(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.cacheConfig.defaultTtl)
    
    const entry: CacheEntry<T> = {
      data,
      expiry,
      cachedAt: Date.now()
    }
    
    this.cache.set(key, entry)
    
    // Enforce cache size limit
    if (this.cache.size > this.cacheConfig.maxSize) {
      this.evictOldestCacheEntries()
    }
  }

  /**
   * Generate cache key for operations
   * 
   * @param operation - Operation type
   * @param params - Operation parameters
   * @returns Cache key string
   */
  private generateCacheKey(operation: string, params: any): string {
    const paramString = JSON.stringify(params, Object.keys(params).sort())
    return `${operation}:${Buffer.from(paramString).toString('base64')}`
  }

  /**
   * Execute operation with rate limiting and caching
   * 
   * @param operation - Operation type
   * @param params - Operation parameters
   * @param executor - Function to execute the operation
   * @param useCache - Whether to use caching (default: true)
   * @param ttl - Cache TTL (optional)
   * @returns Operation result
   */
  private async executeWithRateLimitAndCache<T>(
    operation: string,
    params: any,
    executor: () => Promise<T>,
    useCache = true,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    if (useCache) {
      const cacheKey = this.generateCacheKey(operation, params)
      const cached = this.getCachedData<T>(cacheKey)
      if (cached !== null) {
        return cached
      }
    }
    
    // Check rate limit
    await this.checkRateLimit(operation)
    
    // Execute operation
    try {
      const result = await executor()
      
      // Cache result
      if (useCache) {
        const cacheKey = this.generateCacheKey(operation, params)
        this.setCachedData(cacheKey, result, ttl)
      }
      
      return result
      
    } catch (error) {
      // Don't cache errors
      throw error
    }
  }

  /**
   * Cleanup expired rate limit entries
   */
  private cleanupRateLimits(): void {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [operation, entry] of this.rateLimits.entries()) {
      if (now >= entry.resetTime) {
        this.rateLimits.delete(operation)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired rate limit entries`)
    }
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiry) {
        this.cache.delete(key)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache entries`)
    }
  }

  /**
   * Evict oldest cache entries to maintain size limit
   */
  private evictOldestCacheEntries(): void {
    const entries = Array.from(this.cache.entries())
    
    // Sort by cachedAt timestamp (oldest first)
    entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt)
    
    // Remove oldest entries to get under the limit
    const toRemove = entries.slice(0, entries.length - this.cacheConfig.maxSize + 1)
    
    for (const [key] of toRemove) {
      this.cache.delete(key)
    }
    
    console.log(`Evicted ${toRemove.length} oldest cache entries`)
  }

  /**
   * Get rate limiting statistics
   * 
   * @returns Rate limit information
   */
  getRateLimitStats(): {
    activeLimits: number
    totalRequests: number
    windowMs: number
    maxRequests: number
  } {
    let totalRequests = 0
    
    for (const entry of this.rateLimits.values()) {
      totalRequests += entry.count
    }
    
    return {
      activeLimits: this.rateLimits.size,
      totalRequests,
      windowMs: this.rateLimitConfig.windowMs,
      maxRequests: this.rateLimitConfig.maxRequests
    }
  }

  /**
   * Get cache statistics
   * 
   * @returns Cache performance information
   */
  getCacheStats(): {
    size: number
    maxSize: number
    hitRate: number
    defaultTtl: number
  } {
    // Note: Hit rate calculation would require tracking hits/misses separately
    // For now, return basic stats
    return {
      size: this.cache.size,
      maxSize: this.cacheConfig.maxSize,
      hitRate: 0, // Would need hit/miss tracking
      defaultTtl: this.cacheConfig.defaultTtl
    }
  }

  // ==================== ISSUE CRUD OPERATIONS ====================

  /**
   * Create a new Linear issue
   * 
   * Automatically handles teamId requirement by using the first available team
   * if none is specified. Linear requires a team for all issues.
   * 
   * @param data - Issue creation data (title is required, others optional)
   * @returns Created issue or undefined if creation fails
   */
  async createIssue(data: {
    title: string
    description?: string
    teamId?: string
    assigneeId?: string
    stateId?: string
    labelIds?: string[]
    priority?: number
  }): Promise<Issue | undefined> {
    const client = await this.getClient()
    
    const issueData: any = {
      title: data.title,
      description: data.description
    }

    // Linear requires a teamId - use provided or auto-select first available
    if (data.teamId) {
      issueData.teamId = (await client.team(data.teamId))?.id
    } else {
      // Auto-select first available team for convenience
      const teams = await client.teams({ first: 1 })
      issueData.teamId = teams.nodes[0]?.id
    }
    
    // Use optional chaining to handle optional relationships gracefully
    issueData.assigneeId = data.assigneeId ? (await client.user(data.assigneeId))?.id : undefined
    issueData.stateId = data.stateId ? (await client.workflowState(data.stateId))?.id : undefined
    
    // Handle labels array - filter out invalid labels
    if (data.labelIds?.length) {
      const labels = await Promise.all(data.labelIds.map(id => client.issueLabel(id)))
      issueData.labelIds = labels.filter(Boolean).map(label => label!.id)
    }

    if (data.priority !== undefined) issueData.priority = data.priority

    const result = await client.createIssue(issueData)
    return result.issue
  }

  /**
   * Retrieve a specific issue by ID
   * 
   * @param issueId - Linear issue identifier
   * @returns Issue object or null if not found
   */
  async getIssue(issueId: string): Promise<Issue | null> {
    return this.executeWithRateLimitAndCache(
      'getIssue',
      { issueId },
      async () => {
        const client = await this.getClient()
        const result = await client.issue(issueId)
        return result ?? null
      },
      true, // Use cache
      2 * 60 * 1000 // 2 minutes TTL for issue data
    )
  }

  /**
   * Retrieve a specific issue by ID with full state information
   * 
   * @param issueId - Linear issue identifier
   * @returns Issue object with state details or null if not found
   */
  async getIssueWithState(issueId: string): Promise<Issue | null> {
    return this.executeWithRateLimitAndCache(
      'getIssueWithState',
      { issueId },
      async () => {
        const client = await this.getClient()
        const issue = await client.issue(issueId)
        
        if (!issue) return null
        
        // Try to fetch state information if available
        if (issue.state && typeof issue.state === 'object' && 'id' in issue.state) {
          try {
            const state = await client.workflowState(issue.state.id)
            return {
              ...issue,
              state: state
            }
          } catch (error) {
            // If state fetch fails, return original issue
          }
        }
        
        return issue
      },
      true, // Use cache
      3 * 60 * 1000 // 3 minutes TTL for issue with state
    )
  }

  /**
   * Update an existing issue
   * 
   * Supports partial updates - only provided fields will be modified.
   * Use null to explicitly remove assignee or state.
   * 
   * @param issueId - Issue to update
   * @param data - Fields to update (all optional)
   * @returns Updated issue or undefined if update fails
   * @throws Error if issue not found
   */
  async updateIssue(issueId: string, data: {
    title?: string
    description?: string
    assigneeId?: string
    stateId?: string
    labelIds?: string[]
    priority?: number
  }): Promise<Issue | undefined> {
    const client = await this.getClient()
    const issue = await client.issue(issueId)
    if (!issue ) throw new Error(`Issue ${issueId} not found`)

    const updateData: any = {}

    // Only include defined fields in update
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    
    // Handle null vs undefined - null means remove, undefined means don't change
    updateData.assigneeId = data.assigneeId 
      ? (await client.user(data.assigneeId))?.id 
      : data.assigneeId === null ? null : undefined
      
    updateData.stateId = data.stateId 
      ? (await client.workflowState(data.stateId))?.id 
      : data.stateId === null ? null : undefined

    // Handle labels - empty array removes all labels
    if (data.labelIds !== undefined) {
      updateData.labelIds = data.labelIds?.length 
        ? (await Promise.all(data.labelIds.map(id => client.issueLabel(id))))
            .filter(Boolean)
            .map(label => label!.id)
        : []
    }

    if (data.priority !== undefined) updateData.priority = data.priority

    const result = await issue.update(updateData)
    return result.issue
  }

  /**
   * Delete an issue
   * 
   * @param issueId - Issue to delete
   * @returns True if deleted, false if issue not found
   */
  async deleteIssue(issueId: string): Promise<boolean> {
    const client = await this.getClient()
    const issue = await client.issue(issueId)
    if (!issue) return false
    await issue.delete()
    return true
  }

  /**
   * List issues with pagination
   * 
   * @param first - Maximum number of issues to return (default: 50)
   * @returns Array of issues
   */
  async listIssues(first = 50): Promise<Issue[]> {
    const client = await this.getClient()
    const issues = await client.issues({ first })
    return issues.nodes.map(node => node)
  }

  // ==================== COMMENT CRUD OPERATIONS ====================

  /**
   * Create a comment on an issue
   * 
   * @param issueId - Issue to comment on
   * @param body - Comment content
   * @returns Created comment or undefined if creation fails
   * @throws Error if issue not found
   */
  async createComment(issueId: string, body: string): Promise<Comment | undefined> {
    const client = await this.getClient()
    const issue = await client.issue(issueId)
    if (!issue) throw new Error(`Issue ${issueId} not found`)
    const result = await client.createComment({ body, issueId: issue.id })
    return result.comment
  }

  /**
   * Add a comment to an issue (alias for createComment)
   * 
   * This method provides a more intuitive name for adding comments
   * and is specifically used by the webhook event processor for
   * posting OpenCode command responses back to Linear issues.
   * 
   * @param issueId - Issue to add comment to
   * @param body - Comment content (supports Markdown formatting)
   * @returns Created comment or undefined if creation fails
   * @throws Error if issue not found or comment creation fails
   */
  async addComment(issueId: string, body: string): Promise<Comment | undefined> {
    try {
      // console.log(`Adding comment to Linear issue:`, {
      //   issueId,
      //   bodyLength: body.length,
      //   bodyPreview: body.substring(0, 100) + (body.length > 100 ? '...' : '')
      // })

      const comment = await this.createComment(issueId, body)
      
      if (comment) {
        // console.log(`Successfully added comment to Linear issue:`, {
        //   issueId,
        //   commentId: comment.id,
        //   createdAt: comment.createdAt
        // })
      }
      
      return comment

    } catch (error) {
      // console.error(`Failed to add comment to Linear issue:`, {
      //   issueId,
      //   error: error instanceof Error ? error.message : 'Unknown error',
      //   bodyLength: body.length
      // })
      throw error
    }
  }

  /**
   * Retrieve a specific comment by ID
   * 
   * @param commentId - Linear comment identifier
   * @returns Comment object or null if not found
   */
  async getComment(commentId: string): Promise<Comment | null> {
    const client = await this.getClient()
    const result = await client.comment({ id: commentId })
    return result ?? null
  }

  /**
   * Update an existing comment
   * 
   * @param commentId - Comment to update
   * @param body - New comment content
   * @returns Updated comment or undefined if update fails
   * @throws Error if comment not found
   */
  async updateComment(commentId: string, body: string): Promise<Comment | undefined> {
    const client = await this.getClient()
    const comment = await client.comment({ id: commentId })
    if (!comment) throw new Error(`Comment ${commentId} not found`)
    const result = await comment.update({ body })
    return result.comment
  }

  /**
   * Delete a comment
   * 
   * @param commentId - Comment to delete
   * @returns True if deleted, false if comment not found
   */
  async deleteComment(commentId: string): Promise<boolean> {
    const client = await this.getClient()
    const comment = await client.comment({ id: commentId })
    if (!comment) return false
    await comment.delete()
    return true
  }

  /**
   * List comments for an issue with pagination
   * 
   * @param issueId - Issue to get comments for
   * @param first - Maximum number of comments to return (default: 50)
   * @returns Array of comments
   * @throws Error if issue not found
   */
  async listComments(issueId: string, first = 50): Promise<Comment[]> {
    return this.executeWithRateLimitAndCache(
      'listComments',
      { issueId, first },
      async () => {
        const client = await this.getClient()
        const issue = await client.issue(issueId)
        if (!issue) throw new Error(`Issue ${issueId} not found`)
        const comments = await client.comments({ first, filter: { issue: { id: { eq: issueId } } } })
        return comments.nodes.map(node => node)
      },
      true, // Use cache
      1 * 60 * 1000 // 1 minute TTL for comments
    )
  }

  /**
   * Get all available workflow states
   * 
   * @returns Array of workflow states
   */
  async getWorkflowStates(): Promise<any[]> {
    return this.executeWithRateLimitAndCache(
      'getWorkflowStates',
      {},
      async () => {
        const client = await this.getClient()
        const states = await client.workflowStates()
        return states.nodes.map(state => ({
          id: state.id,
          name: state.name,
          type: state.type,
          color: state.color,
          position: state.position
        }))
      },
      true, // Use cache
      10 * 60 * 1000 // 10 minutes TTL for workflow states
    )
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Create multiple issues in bulk
   * 
   * @param issues - Array of issue creation data
   * @returns Array of created issues
   */
  async bulkCreateIssues(issues: Array<{
    title: string
    description?: string
    teamId?: string
    assigneeId?: string
    stateId?: string
    labelIds?: string[]
    priority?: number
  }>): Promise<Issue[]> {
    const results: Issue[] = []
    
    // Process in batches to respect rate limits
    const batchSize = 5 // Process 5 issues at a time
    
    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (issueData) => {
        try {
          const issue = await this.createIssue(issueData)
          return { success: true, issue, error: null }
        } catch (error) {
          console.error(`Failed to create issue: ${issueData.title}`, error)
          return { success: false, issue: null, error }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      
      // Collect successful results
      for (const result of batchResults) {
        if (result.success && result.issue) {
          results.push(result.issue)
        }
      }
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < issues.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log(`Bulk create completed: ${results.length}/${issues.length} issues created successfully`)
    return results
  }

  /**
   * Update multiple issues in bulk
   * 
   * @param updates - Array of issue update data with IDs
   * @returns Array of updated issues
   */
  async bulkUpdateIssues(updates: Array<{
    issueId: string
    title?: string
    description?: string
    assigneeId?: string
    stateId?: string
    labelIds?: string[]
    priority?: number
  }>): Promise<Issue[]> {
    const results: Issue[] = []
    
    // Process in batches to respect rate limits
    const batchSize = 5
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (updateData) => {
        try {
          const { issueId, ...data } = updateData
          const issue = await this.updateIssue(issueId, data)
          return { success: true, issue, error: null }
        } catch (error) {
          console.error(`Failed to update issue: ${updateData.issueId}`, error)
          return { success: false, issue: null, error }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      
      // Collect successful results
      for (const result of batchResults) {
        if (result.success && result.issue) {
          results.push(result.issue)
        }
      }
      
      // Small delay between batches
      if (i + batchSize < updates.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log(`Bulk update completed: ${results.length}/${updates.length} issues updated successfully`)
    return results
  }

  /**
   * Add multiple comments to issues in bulk
   * 
   * @param comments - Array of comment data
   * @returns Array of created comments
   */
  async bulkAddComments(comments: Array<{
    issueId: string
    body: string
  }>): Promise<Comment[]> {
    const results: Comment[] = []
    
    // Process in batches to respect rate limits
    const batchSize = 10 // Comments are lighter, can process more at once
    
    for (let i = 0; i < comments.length; i += batchSize) {
      const batch = comments.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (commentData) => {
        try {
          const comment = await this.createComment(commentData.issueId, commentData.body)
          return { success: true, comment, error: null }
        } catch (error) {
          console.error(`Failed to create comment for issue: ${commentData.issueId}`, error)
          return { success: false, comment: null, error }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      
      // Collect successful results
      for (const result of batchResults) {
        if (result.success && result.comment) {
          results.push(result.comment)
        }
      }
      
      // Small delay between batches
      if (i + batchSize < comments.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    console.log(`Bulk comment creation completed: ${results.length}/${comments.length} comments created successfully`)
    return results
  }

  /**
   * Delete multiple issues in bulk
   * 
   * @param issueIds - Array of issue IDs to delete
   * @returns Object with success count and failed IDs
   */
  async bulkDeleteIssues(issueIds: string[]): Promise<{
    successCount: number
    failedIds: string[]
  }> {
    let successCount = 0
    const failedIds: string[] = []
    
    // Process in batches to respect rate limits
    const batchSize = 5
    
    for (let i = 0; i < issueIds.length; i += batchSize) {
      const batch = issueIds.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (issueId) => {
        try {
          const success = await this.deleteIssue(issueId)
          return { success, issueId }
        } catch (error) {
          console.error(`Failed to delete issue: ${issueId}`, error)
          return { success: false, issueId }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      
      // Count successes and failures
      for (const result of batchResults) {
        if (result.success) {
          successCount++
        } else {
          failedIds.push(result.issueId)
        }
      }
      
      // Small delay between batches
      if (i + batchSize < issueIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log(`Bulk delete completed: ${successCount}/${issueIds.length} issues deleted successfully`)
    return { successCount, failedIds }
  }
}

/**
 * Singleton instance for easy usage across the application
 * 
 * Using a singleton pattern ensures we reuse the same authenticated
 * Linear client instance, avoiding repeated authentication overhead.
 * This instance is used throughout the webhook processing system
 * for creating issues, adding comments, and managing Linear data.
 */
let _linearCRUDInstance: LinearCRUD | null = null

/**
 * Get or create the LinearCRUD singleton instance
 * 
 * This function ensures the LinearCRUD instance is created safely
 * with proper error handling and initialization.
 * 
 * @returns LinearCRUD singleton instance
 * @throws Error if LinearCRUD cannot be initialized
 */
export function getLinearCRUD(): LinearCRUD {
  if (!_linearCRUDInstance) {
    try {
      _linearCRUDInstance = new LinearCRUD()
    } catch (error) {
      console.error("Linear Plugin: Failed to create LinearCRUD instance:", error)
      throw new Error(`LinearCRUD initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  return _linearCRUDInstance
}

/**
 * Legacy export for backward compatibility
 * 
 * @deprecated Use getLinearCRUD() instead for better error handling
 */
export const linearCRUD = getLinearCRUD()

/**
 * Export the LinearCRUD class as linearClient for backward compatibility
 * 
 * The webhook event processor references `linearClient.addComment()`,
 * so we export the singleton instance with that name to maintain
 * compatibility while keeping the class name descriptive.
 * 
 * @deprecated Use getLinearCRUD() instead for better error handling
 */
export const linearClient = getLinearCRUD()