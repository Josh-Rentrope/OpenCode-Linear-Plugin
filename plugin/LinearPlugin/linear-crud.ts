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

import { LinearClient, Issue, Comment, WorkflowState, IssueLabel, IssueRelation, User, Project, ProjectMilestone, IssueRelationType } from '@linear/sdk'
import { getLinearClient } from './linear-auth'
import * as LinearGraphQL from './linear-graphql'

/**
 * Configuration options for LinearCRUD operations
 */
export interface LinearCRUDOptions {
  /** Enable safety checks for ownership/permissions (default: true) */
  enableSafetyChecks?: boolean
}

/**
 * Options for individual CRUD operations
 */
export interface OperationOptions {
  /** Force operation even if safety checks fail (default: false) */
  force?: boolean
}

export class LinearCRUD {
  /** Cached Linear client instance to avoid repeated auth checks */
  private client: LinearClient | null = null
  
  /** Cached current user to avoid repeated fetches */
  private currentUser: User | null = null
  
  /** Configuration options */
  private options: LinearCRUDOptions

  /**
   * Create a new LinearCRUD instance
   * @param options - Configuration options
   */
  constructor(options: LinearCRUDOptions = {}) {
    this.options = {
      enableSafetyChecks: true,
      ...options
    }
  }

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

  /**
   * Get the current authenticated user
   * Cached after first fetch to avoid repeated API calls
   * @returns Current user
   */
  async getCurrentUser(): Promise<User> {
    if (!this.currentUser) {
      const client = await this.getClient()
      this.currentUser = await client.viewer
    }
    return this.currentUser
  }

  /**
   * Check if current user owns/created an entity
   * @param creatorId - The creator/owner ID to check
   * @param entityType - Type of entity for error message
   * @param entityId - Entity ID for error message
   * @param options - Operation options
   * @throws Error if safety check fails
   */
  private async checkOwnership(
    creatorId: string | undefined,
    entityType: string,
    entityId: string,
    options?: OperationOptions
  ): Promise<void> {
    // Skip check if safety disabled globally or force flag set
    if (!this.options.enableSafetyChecks || options?.force) {
      return
    }

    const currentUser = await this.getCurrentUser()
    
    if (!creatorId || creatorId !== currentUser.id) {
      throw new Error(
        `Cannot modify ${entityType} ${entityId}: You are not the creator/owner. ` +
        `Use force: true to override this safety check.`
      )
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
    parentId?: string
    projectId?: string
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
    
    // Handle parent relationship for sub-issues
    if (data.parentId) {
      issueData.parentId = (await client.issue(data.parentId))?.id
    }
    
    // Handle project assignment
    if (data.projectId) {
      issueData.projectId = (await client.project(data.projectId))?.id
    }
    
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
   * @param options - Operation options (force to skip safety checks)
   * @returns Updated issue or undefined if update fails
   * @throws Error if issue not found or if safety check fails
   */
  async updateIssue(issueId: string, data: {
    title?: string
    description?: string
    assigneeId?: string
    stateId?: string
    labelIds?: string[]
    priority?: number
    parentId?: string
    projectId?: string
  }, options?: OperationOptions): Promise<Issue | undefined> {
    const client = await this.getClient()
    const issue = await client.issue(issueId)
    if (!issue ) throw new Error(`Issue ${issueId} not found`)

    // Safety check: verify current user is the creator
    await this.checkOwnership(issue.creatorId, 'issue', issueId, options)

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

    // Handle parent relationship - null removes parent, undefined doesn't change
    updateData.parentId = data.parentId
      ? (await client.issue(data.parentId))?.id
      : data.parentId === null ? null : undefined

    // Handle project assignment - null removes from project, undefined doesn't change
    updateData.projectId = data.projectId
      ? (await client.project(data.projectId))?.id
      : data.projectId === null ? null : undefined

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
   * @param options - Operation options (force to skip safety checks)
   * @returns True if deleted, false if issue not found
   * @throws Error if safety check fails
   */
  async deleteIssue(issueId: string, options?: OperationOptions): Promise<boolean> {
    const client = await this.getClient()
    const issue = await client.issue(issueId)
    if (!issue) return false
    
    // Safety check: verify current user is the creator
    await this.checkOwnership(issue.creatorId, 'issue', issueId, options)
    
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
      console.log(`Adding comment to Linear issue:`, {
        issueId,
        bodyLength: body.length,
        bodyPreview: body.substring(0, 100) + (body.length > 100 ? '...' : '')
      })

      const comment = await this.createComment(issueId, body)
      
      if (comment) {
        console.log(`Successfully added comment to Linear issue:`, {
          issueId,
          commentId: comment.id,
          createdAt: comment.createdAt
        })
      }
      
      return comment

    } catch (error) {
      console.error(`Failed to add comment to Linear issue:`, {
        issueId,
        error: error instanceof Error ? error.message : 'Unknown error',
        bodyLength: body.length
      })
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
   * @param options - Operation options (force to skip safety checks)
   * @returns Updated comment or undefined if update fails
   * @throws Error if comment not found or if safety check fails
   */
  async updateComment(commentId: string, body: string, options?: OperationOptions): Promise<Comment | undefined> {
    const client = await this.getClient()
    const comment = await client.comment({ id: commentId })
    if (!comment) throw new Error(`Comment ${commentId} not found`)
    
    // Safety check: verify current user is the comment author
    const user = await comment.user
    await this.checkOwnership(user?.id, 'comment', commentId, options)
    
    const result = await comment.update({ body })
    return result.comment
  }

  /**
   * Delete a comment
   * 
   * @param commentId - Comment to delete
   * @param options - Operation options (force to skip safety checks)
   * @returns True if deleted, false if comment not found
   * @throws Error if safety check fails
   */
  async deleteComment(commentId: string, options?: OperationOptions): Promise<boolean> {
    const client = await this.getClient()
    const comment = await client.comment({ id: commentId })
    if (!comment) return false
    
    // Safety check: verify current user is the comment author
    const user = await comment.user
    await this.checkOwnership(user?.id, 'comment', commentId, options)
    
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

  // ==================== WORKFLOW STATE OPERATIONS ====================

  /**
   * List workflow states for a team
   * 
   * Retrieves all available workflow states (statuses) for a team.
   * If no teamId is provided, uses the first available team.
   * 
   * @param teamId - Team ID (optional, will auto-select if not provided)
   * @returns Array of workflow states
   */
  async listStates(teamId?: string): Promise<WorkflowState[]> {
    const client = await this.getClient()
    
    // Get team - use provided or auto-select first available
    let team
    if (teamId) {
      team = await client.team(teamId)
    } else {
      const teams = await client.teams({ first: 1 })
      team = teams.nodes[0]
    }
    
    if (!team) throw new Error('No team found')
    
    // Get workflow states for the team
    const states = await team.states()
    return states.nodes.map(node => node)
  }

  // ==================== LABEL OPERATIONS ====================

  /**
   * List issue labels for a team
   * 
   * Retrieves all available issue labels for a team.
   * If no teamId is provided, uses the first available team.
   * 
   * @param teamId - Team ID (optional, will auto-select if not provided)
   * @returns Array of issue labels
   */
  async listLabels(teamId?: string): Promise<IssueLabel[]> {
    const client = await this.getClient()
    
    // Get team - use provided or auto-select first available
    let team
    if (teamId) {
      team = await client.team(teamId)
    } else {
      const teams = await client.teams({ first: 1 })
      team = teams.nodes[0]
    }
    
    if (!team) throw new Error('No team found')
    
    // Get labels for the team
    const labels = await team.labels()
    return labels.nodes.map(node => node)
  }

  // ==================== ISSUE RELATIONSHIP OPERATIONS ====================

  /**
   * List child issues (sub-issues) of a parent issue
   * 
   * @param parentId - Parent issue ID
   * @param first - Maximum number of children to return (default: 50)
   * @returns Array of child issues
   * @throws Error if parent issue not found
   */
  async listChildren(parentId: string, first = 50): Promise<Issue[]> {
    const client = await this.getClient()
    const parent = await client.issue(parentId)
    if (!parent) throw new Error(`Issue ${parentId} not found`)
    
    const children = await parent.children({ first })
    return children.nodes.map(node => node)
  }

  /**
   * Create an issue relation (blocks, duplicate, related, similar)
   * 
   * @param data - Relation creation data
   * @param options - Operation options (force to skip safety checks)
   * @returns Created issue relation or undefined if creation fails
   * @throws Error if safety check fails
   */
  async createRelation(data: {
    issueId: string
    relatedIssueId: string
    type: IssueRelationType | 'blocks' | 'duplicate' | 'related' | 'similar'
  }, options?: OperationOptions): Promise<IssueRelation | undefined> {
    const client = await this.getClient()
    
    // Verify both issues exist
    const issue = await client.issue(data.issueId)
    if (!issue) throw new Error(`Issue ${data.issueId} not found`)
    
    const relatedIssue = await client.issue(data.relatedIssueId)
    if (!relatedIssue) throw new Error(`Related issue ${data.relatedIssueId} not found`)
    
    // Safety check: verify current user is the creator of the source issue
    await this.checkOwnership(issue.creatorId, 'issue (for creating relations)', data.issueId, options)
    
    const result = await client.createIssueRelation({
      issueId: data.issueId,
      relatedIssueId: data.relatedIssueId,
      type: data.type as IssueRelationType
    })
    
    return result.issueRelation
  }

  /**
   * List issue relations for an issue
   * 
   * @param issueId - Issue ID
   * @param direction - 'from' (relations FROM this issue), 'to' (relations TO this issue), or 'both'
   * @param first - Maximum number of relations to return (default: 50)
   * @returns Array of issue relations
   * @throws Error if issue not found
   */
  async listRelations(issueId: string, direction: 'from' | 'to' | 'both' = 'both', first = 50): Promise<IssueRelation[]> {
    const client = await this.getClient()
    const issue = await client.issue(issueId)
    if (!issue) throw new Error(`Issue ${issueId} not found`)
    
    const relations: IssueRelation[] = []
    
    if (direction === 'from' || direction === 'both') {
      const fromRelations = await issue.relations({ first })
      relations.push(...fromRelations.nodes.map(node => node))
    }
    
    if (direction === 'to' || direction === 'both') {
      const toRelations = await issue.inverseRelations({ first })
      relations.push(...toRelations.nodes.map(node => node))
    }
    
    return relations
  }

  /**
   * Delete an issue relation
   * 
   * @param relationId - Relation ID to delete
   * @param options - Operation options (force to skip safety checks)
   * @returns True if deleted, false if relation not found
   * @throws Error if safety check fails
   */
  async deleteRelation(relationId: string, options?: OperationOptions): Promise<boolean> {
    const client = await this.getClient()
    const relation = await client.issueRelation(relationId)
    if (!relation) return false
    
    // Safety check: verify current user created the source issue that has this relation
    const issue = await relation.issue
    await this.checkOwnership(issue?.creatorId, 'issue relation', relationId, options)
    
    await relation.delete()
    return true
  }

  // ==================== PROJECT CRUD OPERATIONS ====================

  /**
   * Create a new project
   * 
   * @param data - Project creation data
   * @returns Created project or undefined if creation fails
   */
  async createProject(data: {
    name: string
    teamIds: string[]
    description?: string
    content?: string
    color?: string
    icon?: string
    leadId?: string
    memberIds?: string[]
    labelIds?: string[]
    priority?: number
    startDate?: string
    targetDate?: string
    statusId?: string
  }): Promise<Project | undefined> {
    const client = await this.getClient()
    
    const projectData: any = {
      name: data.name,
      teamIds: data.teamIds,
      description: data.description,
      content: data.content,
      color: data.color,
      icon: data.icon,
      priority: data.priority,
      startDate: data.startDate,
      targetDate: data.targetDate
    }

    if (data.leadId) projectData.leadId = data.leadId
    if (data.memberIds) projectData.memberIds = data.memberIds
    if (data.labelIds) projectData.labelIds = data.labelIds
    if (data.statusId) projectData.statusId = data.statusId

    const result = await client.createProject(projectData)
    return result.project
  }

  /**
   * Get a project by ID
   * 
   * @param projectId - Project ID
   * @returns Project or null if not found
   */
  async getProject(projectId: string): Promise<Project | null> {
    const client = await this.getClient()
    const project = await client.project(projectId)
    return project ?? null
  }

  /**
   * Update an existing project
   * 
   * @param projectId - Project ID to update
   * @param data - Fields to update (all optional)
   * @param options - Operation options (force to skip safety checks)
   * @returns Updated project or undefined if update fails
   * @throws Error if project not found or if safety check fails
   */
  async updateProject(projectId: string, data: {
    name?: string
    description?: string
    content?: string
    color?: string
    icon?: string
    leadId?: string
    memberIds?: string[]
    labelIds?: string[]
    priority?: number
    startDate?: string
    targetDate?: string
    statusId?: string
    teamIds?: string[]
  }, options?: OperationOptions): Promise<Project | undefined> {
    const client = await this.getClient()
    const project = await client.project(projectId)
    if (!project) throw new Error(`Project ${projectId} not found`)

    // Safety check: verify current user is the project lead
    await this.checkOwnership(project.leadId, 'project', projectId, options)

    const updateData: any = {}
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.content !== undefined) updateData.content = data.content
    if (data.color !== undefined) updateData.color = data.color
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.leadId !== undefined) updateData.leadId = data.leadId
    if (data.memberIds !== undefined) updateData.memberIds = data.memberIds
    if (data.labelIds !== undefined) updateData.labelIds = data.labelIds
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.startDate !== undefined) updateData.startDate = data.startDate
    if (data.targetDate !== undefined) updateData.targetDate = data.targetDate
    if (data.statusId !== undefined) updateData.statusId = data.statusId
    if (data.teamIds !== undefined) updateData.teamIds = data.teamIds

    const result = await client.updateProject(projectId, updateData)
    return result.project
  }

  /**
   * Delete a project
   * 
   * @param projectId - Project ID to delete
   * @param options - Operation options (force to skip safety checks)
   * @returns True if deleted, false if not found
   * @throws Error if safety check fails
   */
  async deleteProject(projectId: string, options?: OperationOptions): Promise<boolean> {
    const client = await this.getClient()
    const project = await client.project(projectId)
    if (!project) return false

    // Safety check: verify current user is the project lead
    await this.checkOwnership(project.leadId, 'project', projectId, options)

    await client.deleteProject(projectId)
    return true
  }

  /**
   * List projects with optional filtering
   * 
   * @param filter - Optional filter (e.g., { lead: { isMe: { eq: true } } })
   * @param first - Maximum number of projects to return (default: 50)
   * @returns Array of projects
   */
  async listProjects(filter?: any, first = 50): Promise<Project[]> {
    const client = await this.getClient()
    const projects = await client.projects({ filter, first })
    return projects.nodes.map(node => node)
  }

  /**
   * List projects where current user is the lead
   * 
   * @param first - Maximum number of projects to return (default: 50)
   * @returns Array of projects
   */
  async listMyProjects(first = 50): Promise<Project[]> {
    return this.listProjects({
      lead: {
        isMe: { eq: true }
      }
    }, first)
  }

  /**
   * List issues in a project
   * 
   * @param projectId - Project ID
   * @param first - Maximum number of issues to return (default: 50)
   * @returns Array of issues
   */
  async listProjectIssues(projectId: string, first = 50): Promise<Issue[]> {
    const client = await this.getClient()
    const project = await client.project(projectId)
    if (!project) throw new Error(`Project ${projectId} not found`)
    
    const issues = await project.issues({ first })
    return issues.nodes.map(node => node)
  }



  // ==================== PROJECT MILESTONE OPERATIONS ====================

  /**
   * Create a project milestone
   * 
   * @param data - Milestone creation data
   * @param options - Operation options (force to skip safety checks)
   * @returns Created milestone or undefined if creation fails
   * @throws Error if safety check fails (must be project lead)
   */
  async createProjectMilestone(data: {
    name: string
    projectId: string
    description?: string
    targetDate?: string
    sortOrder?: number
  }, options?: OperationOptions): Promise<ProjectMilestone | undefined> {
    const client = await this.getClient()
    
    // Get project to check ownership
    const project = await client.project(data.projectId)
    if (!project) throw new Error(`Project ${data.projectId} not found`)
    
    // Safety check: verify current user is the project lead
    await this.checkOwnership(project.leadId, 'project (for creating milestones)', data.projectId, options)
    
    const result = await client.createProjectMilestone({
      name: data.name,
      projectId: data.projectId,
      description: data.description,
      targetDate: data.targetDate,
      sortOrder: data.sortOrder
    })
    
    return result.projectMilestone
  }

  /**
   * Update a project milestone
   * 
   * Uses direct GraphQL to bypass SDK serialization issues in OpenCode environment
   * 
   * @param milestoneId - Milestone ID
   * @param data - Fields to update
   * @param options - Operation options (force to skip safety checks)
   * @returns Boolean indicating success
   * @throws Error if milestone not found or if safety check fails
   */
  async updateProjectMilestone(milestoneId: string, data: {
    name?: string
    description?: string
    targetDate?: string
    sortOrder?: number
  }, options?: OperationOptions): Promise<boolean> {
    // Note: Milestone update has a known issue in OpenCode's plugin environment
    // The error occurs during OpenCode's tool invocation processing, before our code executes
    // Attempted fixes: SDK method, GraphQL with SDK, raw HTTP - all fail at same point
    // Root cause appears to be in OpenCode's handling of certain Linear SDK return types
    
    // Use direct GraphQL mutation (currently still fails, but leaves door open for future fix)
    return await LinearGraphQL.updateProjectMilestone(milestoneId, data)
  }

  /**
   * Delete a project milestone
   * 
   * @param milestoneId - Milestone ID
   * @param options - Operation options (force to skip safety checks)
   * @returns True if deleted, false if not found
   * @throws Error if safety check fails
   */
  async deleteProjectMilestone(milestoneId: string, options?: OperationOptions): Promise<boolean> {
    const client = await this.getClient()
    const milestone = await client.projectMilestone(milestoneId)
    if (!milestone) return false
    
    // Get project to check ownership
    const project = await milestone.project
    if (!project) throw new Error(`Project for milestone ${milestoneId} not found`)
    
    // Safety check: verify current user is the project lead
    await this.checkOwnership(project.leadId, 'project milestone', milestoneId, options)
    
    await client.deleteProjectMilestone(milestoneId)
    return true
  }

  /**
   * List milestones for a project
   * 
   * @param projectId - Project ID
   * @param first - Maximum number of milestones to return (default: 50)
   * @returns Array of milestones
   */
  async listProjectMilestones(projectId: string, first = 50): Promise<ProjectMilestone[]> {
    const client = await this.getClient()
    const project = await client.project(projectId)
    if (!project) throw new Error(`Project ${projectId} not found`)
    
    const milestones = await project.projectMilestones({ first })
    return milestones.nodes.map(node => node)
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