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

export class LinearCRUD {
  /** Cached Linear client instance to avoid repeated auth checks */
  private client: LinearClient | null = null

  /**
   * Get authenticated Linear client
   * Uses nullish assignment to cache the client after first successful auth
   * @throws Error if Linear client cannot be initialized
   */
  private async getClient(): Promise<LinearClient> {
    this.client ??= await getLinearClient()
    if (!this.client) throw new Error('Linear client not available')
    return this.client
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
    const client = await this.getClient()
    const result = await client.issue(issueId)
    return result ?? null
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
    const client = await this.getClient()
    const issue = await client.issue( issueId )
    if (!issue) throw new Error(`Issue ${issueId} not found`)
    const comments = await client.comments({ first, filter: { issue: { id: { eq: issueId } } } })
    return comments.nodes.map(node => node)
  }
}

/**
 * Singleton instance for easy usage across the application
 * 
 * Using a singleton pattern ensures we reuse the same authenticated
 * Linear client instance, avoiding repeated authentication overhead.
 */
export const linearCRUD = new LinearCRUD()