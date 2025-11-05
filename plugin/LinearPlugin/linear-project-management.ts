/**
 * Linear Project Management
 * 
 * Advanced project management features for Linear integration.
 * Provides comprehensive project operations including creation, management,
 * team coordination, and progress tracking capabilities.
 * 
 * Key Features:
 * - Project CRUD operations with team management
 * - Project milestone and timeline tracking
 * - Team member assignment and role management
 * - Project progress monitoring and reporting
 * - Integration with existing Linear CRUD operations
 */

import { LinearClient } from '@linear/sdk'
import { getLinearClient } from './linear-auth'
import { getLinearCRUD } from './linear-crud'

/**
 * Project interface extending Linear's project structure
 */
export interface Project {
  id: string
  name: string
  description?: string
  teamId: string
  state: 'active' | 'completed' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  startDate?: string
  targetDate?: string
  progress: number
  assigneeIds: string[]
  labelIds: string[]
  createdAt: string
  updatedAt: string
  url?: string
}

/**
 * Project milestone interface
 */
export interface ProjectMilestone {
  id: string
  projectId: string
  title: string
  description?: string
  dueDate?: string
  completed: boolean
  completedAt?: string
  position: number
}

/**
 * Team member role interface
 */
export interface TeamMember {
  userId: string
  teamId: string
  role: 'admin' | 'member' | 'viewer'
  joinedAt: string
}

export class LinearProjectManagement {
  private client: LinearClient | null = null

  /**
   * Get authenticated Linear client
   */
  private async getClient(): Promise<LinearClient> {
    this.client ??= await getLinearClient()
    if (!this.client) throw new Error('Linear client not available')
    return this.client
  }

  // ==================== PROJECT CRUD OPERATIONS ====================

  /**
   * Create a new Linear project
   */
  async createProject(data: {
    name: string
    description?: string
    teamId: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    startDate?: string
    targetDate?: string
    assigneeIds?: string[]
    labelIds?: string[]
  }): Promise<Project | undefined> {
    const client = await this.getClient()
    
    try {
      const projectData: any = {
        name: data.name,
        description: data.description,
        teamId: data.teamId,
        priority: data.priority || 'medium',
        state: 'active',
        progress: 0
      }

      if (data.startDate) projectData.startDate = data.startDate
      if (data.targetDate) projectData.targetDate = data.targetDate
      if (data.assigneeIds) projectData.assigneeIds = data.assigneeIds
      if (data.labelIds) projectData.labelIds = data.labelIds

      const result = await client.createProject(projectData)
      
      if (result.project) {
        return {
          id: result.project.id,
          name: result.project.name,
          description: result.project.description,
          teamId: result.project.teamId,
          state: result.project.state || 'active',
          priority: result.project.priority || 'medium',
          startDate: result.project.startDate,
          targetDate: result.project.targetDate,
          progress: 0,
          assigneeIds: result.project.assigneeIds || [],
          labelIds: result.project.labelIds || [],
          createdAt: result.project.createdAt,
          updatedAt: result.project.updatedAt,
          url: result.project.url
        }
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  }

  /**
   * Get a specific project by ID
   */
  async getProject(projectId: string): Promise<Project | null> {
    const client = await this.getClient()
    
    try {
      const project = await client.project(projectId)
      
      if (!project) return null
      
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        teamId: project.teamId,
        state: project.state as 'active' | 'completed' | 'archived',
        priority: project.priority as 'low' | 'medium' | 'high' | 'urgent',
        startDate: project.startDate,
        targetDate: project.targetDate,
        progress: project.progress || 0,
        assigneeIds: project.assigneeIds || [],
        labelIds: project.labelIds || [],
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        url: project.url
      }
    } catch (error) {
      console.error(`Failed to get project ${projectId}:`, error)
      return null
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(projectId: string, data: {
    name?: string
    description?: string
    state?: 'active' | 'completed' | 'archived'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    startDate?: string
    targetDate?: string
    progress?: number
    assigneeIds?: string[]
    labelIds?: string[]
  }): Promise<Project | undefined> {
    const client = await this.getClient()
    
    try {
      const project = await client.project(projectId)
      if (!project) throw new Error(`Project ${projectId} not found`)

      const updateData: any = {}
      
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.state !== undefined) updateData.state = data.state
      if (data.priority !== undefined) updateData.priority = data.priority
      if (data.startDate !== undefined) updateData.startDate = data.startDate
      if (data.targetDate !== undefined) updateData.targetDate = data.targetDate
      if (data.progress !== undefined) updateData.progress = data.progress
      if (data.assigneeIds !== undefined) updateData.assigneeIds = data.assigneeIds
      if (data.labelIds !== undefined) updateData.labelIds = data.labelIds

      const result = await project.update(updateData)
      
      if (result.project) {
        return {
          id: result.project.id,
          name: result.project.name,
          description: result.project.description,
          teamId: result.project.teamId,
          state: result.project.state as 'active' | 'completed' | 'archived',
          priority: result.project.priority as 'low' | 'medium' | 'high' | 'urgent',
          startDate: result.project.startDate,
          targetDate: result.project.targetDate,
          progress: result.project.progress || 0,
          assigneeIds: result.project.assigneeIds || [],
          labelIds: result.project.labelIds || [],
          createdAt: result.project.createdAt,
          updatedAt: result.project.updatedAt,
          url: result.project.url
        }
      }
    } catch (error) {
      console.error(`Failed to update project ${projectId}:`, error)
      throw error
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<boolean> {
    const client = await this.getClient()
    
    try {
      const project = await client.project(projectId)
      if (!project) return false
      
      await project.delete()
      return true
    } catch (error) {
      console.error(`Failed to delete project ${projectId}:`, error)
      return false
    }
  }

  /**
   * List projects with optional filtering
   */
  async listProjects(filters?: {
    teamId?: string
    state?: 'active' | 'completed' | 'archived'
    assigneeId?: string
    first?: number
  }): Promise<Project[]> {
    const client = await this.getClient()
    
    try {
      const filter: any = {}
      if (filters?.teamId) filter.team = { id: { eq: filters.teamId } }
      if (filters?.state) filter.state = { eq: filters.state }
      if (filters?.assigneeId) filter.assignee = { id: { eq: filters.assigneeId } }

      const projects = await client.projects({ 
        first: filters?.first || 50,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      })
      
      return projects.nodes.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        teamId: project.teamId,
        state: project.state as 'active' | 'completed' | 'archived',
        priority: project.priority as 'low' | 'medium' | 'high' | 'urgent',
        startDate: project.startDate,
        targetDate: project.targetDate,
        progress: project.progress || 0,
        assigneeIds: project.assigneeIds || [],
        labelIds: project.labelIds || [],
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        url: project.url
      }))
    } catch (error) {
      console.error('Failed to list projects:', error)
      return []
    }
  }

  // ==================== PROJECT MILESTONES ====================

  /**
   * Create a project milestone
   */
  async createMilestone(data: {
    projectId: string
    title: string
    description?: string
    dueDate?: string
    position?: number
  }): Promise<ProjectMilestone | undefined> {
    const client = await this.getClient()
    
    try {
      const milestoneData: any = {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        completed: false,
        position: data.position || 0
      }

      if (data.dueDate) milestoneData.dueDate = data.dueDate

      const result = await client.createProjectMilestone(milestoneData)
      
      if (result.projectMilestone) {
        return {
          id: result.projectMilestone.id,
          projectId: result.projectMilestone.projectId,
          title: result.projectMilestone.title,
          description: result.projectMilestone.description,
          dueDate: result.projectMilestone.dueDate,
          completed: result.projectMilestone.completed || false,
          completedAt: result.projectMilestone.completedAt,
          position: result.projectMilestone.position || 0
        }
      }
    } catch (error) {
      console.error('Failed to create milestone:', error)
      throw error
    }
  }

  /**
   * Complete a milestone
   */
  async completeMilestone(milestoneId: string): Promise<ProjectMilestone | undefined> {
    const client = await this.getClient()
    
    try {
      const milestone = await client.projectMilestone(milestoneId)
      if (!milestone) throw new Error(`Milestone ${milestoneId} not found`)

      const result = await milestone.update({
        completed: true,
        completedAt: new Date().toISOString()
      })
      
      if (result.projectMilestone) {
        return {
          id: result.projectMilestone.id,
          projectId: result.projectMilestone.projectId,
          title: result.projectMilestone.title,
          description: result.projectMilestone.description,
          dueDate: result.projectMilestone.dueDate,
          completed: result.projectMilestone.completed || false,
          completedAt: result.projectMilestone.completedAt,
          position: result.projectMilestone.position || 0
        }
      }
    } catch (error) {
      console.error(`Failed to complete milestone ${milestoneId}:`, error)
      throw error
    }
  }

  // ==================== TEAM MANAGEMENT ====================

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const client = await this.getClient()
    
    try {
      const team = await client.team(teamId)
      if (!team) return []

      const members = await client.teamMembers({ 
        first: 100,
        filter: { team: { id: { eq: teamId } } }
      })
      
      return members.nodes.map(member => ({
        userId: member.user?.id || '',
        teamId: member.team?.id || teamId,
        role: member.role as 'admin' | 'member' | 'viewer',
        joinedAt: member.createdAt
      }))
    } catch (error) {
      console.error(`Failed to get team members for ${teamId}:`, error)
      return []
    }
  }

  /**
   * Add team member
   */
  async addTeamMember(teamId: string, userId: string, role: 'admin' | 'member' | 'viewer' = 'member'): Promise<boolean> {
    const client = await this.getClient()
    
    try {
      const result = await client.createTeamMember({
        teamId,
        userId,
        role
      })
      
      return !!result.teamMember
    } catch (error) {
      console.error(`Failed to add team member ${userId} to ${teamId}:`, error)
      return false
    }
  }

  // ==================== PROJECT ANALYTICS ====================

  /**
   * Get project progress summary
   */
  async getProjectProgress(projectId: string): Promise<{
    projectId: string
    totalIssues: number
    completedIssues: number
    totalMilestones: number
    completedMilestones: number
    progressPercentage: number
  }> {
    const crud = getLinearCRUD()
    
    try {
      const project = await this.getProject(projectId)
      if (!project) throw new Error(`Project ${projectId} not found`)

      // Get issues for this project (assuming issues have project association)
      const issues = await crud.listIssues(100)
      const projectIssues = issues.filter(issue => 
        issue.labelIds?.some(labelId => 
          project.labelIds.includes(labelId)
        )
      )

      const completedIssues = projectIssues.filter(issue => 
        issue.state?.name === 'Done' || issue.state?.name === 'Completed'
      )

      // Get milestones for this project
      const milestones = await client.projectMilestones({
        first: 50,
        filter: { project: { id: { eq: projectId } } }
      })

      const completedMilestones = milestones.nodes.filter(milestone => milestone.completed)

      const progressPercentage = projectIssues.length > 0 
        ? (completedIssues.length / projectIssues.length) * 100 
        : 0

      return {
        projectId,
        totalIssues: projectIssues.length,
        completedIssues: completedIssues.length,
        totalMilestones: milestones.nodes.length,
        completedMilestones: completedMilestones.length,
        progressPercentage: Math.round(progressPercentage)
      }
    } catch (error) {
      console.error(`Failed to get project progress for ${projectId}:`, error)
      throw error
    }
  }
}

/**
 * Singleton instance for project management
 */
let _projectManagementInstance: LinearProjectManagement | null = null

export function getLinearProjectManagement(): LinearProjectManagement {
  if (!_projectManagementInstance) {
    _projectManagementInstance = new LinearProjectManagement()
  }
  return _projectManagementInstance
}