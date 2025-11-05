/**
 * Linear Collaboration Features
 * 
 * Advanced collaboration capabilities for Linear teams including real-time
 * notifications, activity tracking, and team coordination features.
 * 
 * Key Features:
 * - Real-time activity monitoring and notifications
 * - Team collaboration metrics and insights
 * - Automated workflow triggers based on team activity
 * - Integration with OpenCode for enhanced collaboration
 */

import { LinearClient } from '@linear/sdk'
import { getLinearClient } from './linear-auth'
import { getLinearCRUD } from './linear-crud'
import { getLinearProjectManagement } from './linear-project-management'

/**
 * Activity event interface
 */
export interface ActivityEvent {
  id: string
  type: 'issue_created' | 'issue_updated' | 'comment_added' | 'assignee_changed' | 'status_changed'
  userId: string
  userName: string
  userEmail?: string
  issueId?: string
  issueTitle?: string
  projectId?: string
  projectName?: string
  timestamp: string
  metadata?: Record<string, any>
}

/**
 * Team collaboration metrics
 */
export interface TeamMetrics {
  teamId: string
  teamName: string
  activeMembers: number
  totalIssues: number
  completedIssues: number
  averageResponseTime: number
  collaborationScore: number
  topContributors: Array<{
    userId: string
    userName: string
    contributions: number
  }>
  activityTrend: Array<{
    date: string
    activities: number
  }>
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  userId: string
  emailNotifications: boolean
  inAppNotifications: boolean
  mentionNotifications: boolean
  assignmentNotifications: boolean
  projectUpdates: boolean
  weeklyDigest: boolean
}

export class LinearCollaboration {
  private client: LinearClient | null = null
  private activityBuffer: ActivityEvent[] = []
  private notificationQueue: Array<{
    userId: string
    type: string
    message: string
    data?: any
  }> = []

  /**
   * Get authenticated Linear client
   */
  private async getClient(): Promise<LinearClient> {
    this.client ??= await getLinearClient()
    if (!this.client) throw new Error('Linear client not available')
    return this.client
  }

  // ==================== ACTIVITY TRACKING ====================

  /**
   * Track user activity across issues and comments
   */
  async trackActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>): Promise<ActivityEvent> {
    const activityEvent: ActivityEvent = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...event
    }

    // Add to activity buffer
    this.activityBuffer.push(activityEvent)

    // Keep buffer size manageable
    if (this.activityBuffer.length > 1000) {
      this.activityBuffer = this.activityBuffer.slice(-500)
    }

    // Process notifications based on activity
    await this.processActivityNotifications(activityEvent)

    return activityEvent
  }

  /**
   * Get recent activity for a team or project
   */
  async getRecentActivity(filters?: {
    teamId?: string
    projectId?: string
    userId?: string
    limit?: number
    timeRange?: '1h' | '24h' | '7d' | '30d'
  }): Promise<ActivityEvent[]> {
    let filtered = [...this.activityBuffer]

    // Apply filters
    if (filters?.teamId) {
      filtered = filtered.filter(activity => activity.projectId === filters.teamId)
    }
    if (filters?.projectId) {
      filtered = filtered.filter(activity => activity.projectId === filters.projectId)
    }
    if (filters?.userId) {
      filtered = filtered.filter(activity => activity.userId === filters.userId)
    }

    // Apply time range filter
    if (filters?.timeRange) {
      const now = new Date()
      let cutoffTime: Date

      switch (filters.timeRange) {
        case '1h':
          cutoffTime = new Date(now.getTime() - 60 * 60 * 1000)
          break
        case '24h':
          cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }

      filtered = filtered.filter(activity => 
        new Date(activity.timestamp) >= cutoffTime
      )
    }

    // Sort by timestamp (newest first) and limit
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return filtered.slice(0, filters?.limit || 50)
  }

  // ==================== NOTIFICATION SYSTEM ====================

  /**
   * Process notifications based on activity
   */
  private async processActivityNotifications(activity: ActivityEvent): Promise<void> {
    try {
      switch (activity.type) {
        case 'issue_created':
          await this.notifyIssueCreated(activity)
          break
        case 'comment_added':
          await this.notifyCommentAdded(activity)
          break
        case 'assignee_changed':
          await this.notifyAssignmentChanged(activity)
          break
        case 'status_changed':
          await this.notifyStatusChanged(activity)
          break
      }
    } catch (error) {
      console.error('Failed to process activity notifications:', error)
    }
  }

  /**
   * Notify team about new issue creation
   */
  private async notifyIssueCreated(activity: ActivityEvent): Promise<void> {
    const message = `New issue created: "${activity.issueTitle}" by ${activity.userName}`
    
    this.notificationQueue.push({
      userId: activity.userId,
      type: 'issue_created',
      message,
      data: {
        issueId: activity.issueId,
        issueTitle: activity.issueTitle,
        createdBy: activity.userName
      }
    })

    await this.flushNotifications()
  }

  /**
   * Notify about new comments
   */
  private async notifyCommentAdded(activity: ActivityEvent): Promise<void> {
    const message = `New comment on "${activity.issueTitle}" by ${activity.userName}`
    
    this.notificationQueue.push({
      userId: activity.userId,
      type: 'comment_added',
      message,
      data: {
        issueId: activity.issueId,
        issueTitle: activity.issueTitle,
        commentBy: activity.userName
      }
    })

    await this.flushNotifications()
  }

  /**
   * Notify about assignment changes
   */
  private async notifyAssignmentChanged(activity: ActivityEvent): Promise<void> {
    const message = `Issue "${activity.issueTitle}" assigned to ${activity.userName}`
    
    this.notificationQueue.push({
      userId: activity.userId,
      type: 'assignee_changed',
      message,
      data: {
        issueId: activity.issueId,
        issueTitle: activity.issueTitle,
        assignedTo: activity.userName
      }
    })

    await this.flushNotifications()
  }

  /**
   * Notify about status changes
   */
  private async notifyStatusChanged(activity: ActivityEvent): Promise<void> {
    const message = `Issue "${activity.issueTitle}" status changed by ${activity.userName}`
    
    this.notificationQueue.push({
      userId: activity.userId,
      type: 'status_changed',
      message,
      data: {
        issueId: activity.issueId,
        issueTitle: activity.issueTitle,
        changedBy: activity.userName
      }
    })

    await this.flushNotifications()
  }

  /**
   * Flush notification queue
   */
  private async flushNotifications(): Promise<void> {
    if (this.notificationQueue.length === 0) return

    const notifications = [...this.notificationQueue]
    this.notificationQueue = []

    for (const notification of notifications) {
      try {
        // Here you would integrate with actual notification systems
        // For now, we'll just log and potentially add comments to Linear
        console.log(`Notification for ${notification.userId}: ${notification.message}`)
        
        // Example: Add notification comment to relevant issue
        if (notification.data?.issueId && notification.type === 'mention') {
          const crud = getLinearCRUD()
          await crud.addComment(notification.data.issueId, 
            `🔔 Notification: ${notification.message}`)
        }
      } catch (error) {
        console.error(`Failed to send notification to ${notification.userId}:`, error)
      }
    }
  }

  // ==================== TEAM COLLABORATION METRICS ====================

  /**
   * Calculate team collaboration metrics
   */
  async getTeamMetrics(teamId: string, timeRange: '7d' | '30d' | '90d' = '30d'): Promise<TeamMetrics> {
    const client = await this.getClient()
    const projectMgmt = getLinearProjectManagement()
    
    try {
      // Get team information
      const team = await client.team(teamId)
      if (!team) throw new Error(`Team ${teamId} not found`)

      // Get team members
      const teamMembers = await projectMgmt.getTeamMembers(teamId)
      const activeMembers = teamMembers.filter(member => 
        new Date(member.joinedAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
      ).length

      // Get team issues
      const crud = getLinearCRUD()
      const allIssues = await crud.listIssues(200)
      const teamIssues = allIssues.filter(issue => {
        // Filter issues that belong to this team's projects
        return issue.assigneeId && teamMembers.some(member => member.userId === issue.assigneeId)
      })

      const completedIssues = teamIssues.filter(issue => 
        issue.state?.name === 'Done' || issue.state?.name === 'Completed'
      )

      // Calculate average response time (time from issue creation to first comment)
      let totalResponseTime = 0
      let responseCount = 0
      
      for (const issue of teamIssues) {
        if (issue.createdAt) {
          const comments = await crud.listComments(issue.id, 10)
          if (comments.length > 0) {
            const firstComment = comments[0]
            if (firstComment.createdAt) {
              const responseTime = new Date(firstComment.createdAt).getTime() - 
                                new Date(issue.createdAt).getTime()
              totalResponseTime += responseTime
              responseCount++
            }
          }
        }
      }

      const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0

      // Calculate top contributors
      const contributorCounts = new Map<string, number>()
      
      for (const issue of teamIssues) {
        if (issue.assigneeId) {
          const count = contributorCounts.get(issue.assigneeId) || 0
          contributorCounts.set(issue.assigneeId, count + 1)
        }
      }

      const topContributors = Array.from(contributorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId, contributions]) => ({
          userId,
          userName: teamMembers.find(m => m.userId === userId)?.userId || userId,
          contributions
        }))

      // Calculate activity trend
      const activityTrend = await this.calculateActivityTrend(teamId, timeRange)

      // Calculate collaboration score (0-100)
      const collaborationScore = this.calculateCollaborationScore({
        activeMembers,
        totalIssues: teamIssues.length,
        completedIssues: completedIssues.length,
        averageResponseTime,
        activityTrend
      })

      return {
        teamId,
        teamName: team.name,
        activeMembers,
        totalIssues: teamIssues.length,
        completedIssues: completedIssues.length,
        averageResponseTime: Math.round(averageResponseTime / (1000 * 60)), // Convert to minutes
        collaborationScore,
        topContributors,
        activityTrend
      }
    } catch (error) {
      console.error(`Failed to get team metrics for ${teamId}:`, error)
      throw error
    }
  }

  /**
   * Calculate activity trend over time
   */
  private async calculateActivityTrend(teamId: string, timeRange: '7d' | '30d' | '90d'): Promise<Array<{
    date: string
    activities: number
  }>> {
    const recentActivity = await this.getRecentActivity({
      teamId,
      timeRange: timeRange === '7d' ? '7d' : timeRange === '30d' ? '30d' : '30d'
    })

    const activityByDate = new Map<string, number>()
    
    for (const activity of recentActivity) {
      const date = activity.timestamp.split('T')[0]
      const count = activityByDate.get(date) || 0
      activityByDate.set(date, count + 1)
    }

    return Array.from(activityByDate.entries())
      .map(([date, activities]) => ({ date, activities }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Calculate collaboration score
   */
  private calculateCollaborationScore(metrics: {
    activeMembers: number
    totalIssues: number
    completedIssues: number
    averageResponseTime: number
    activityTrend: Array<{ date: string; activities: number }>
  }): number {
    let score = 0

    // Member activity score (30%)
    const memberScore = Math.min(metrics.activeMembers * 10, 30)
    score += memberScore

    // Issue completion rate (25%)
    const completionRate = metrics.totalIssues > 0 
      ? (metrics.completedIssues / metrics.totalIssues) * 100 
      : 0
    const completionScore = Math.min(completionRate * 0.25, 25)
    score += completionScore

    // Response time score (25%)
    const responseScore = metrics.averageResponseTime > 0 
      ? Math.max(0, 25 - (metrics.averageResponseTime / 60)) // Convert minutes to score
      : 25
    score += responseScore

    // Activity consistency score (20%)
    const avgActivities = metrics.activityTrend.length > 0 
      ? metrics.activityTrend.reduce((sum, day) => sum + day.activities, 0) / metrics.activityTrend.length
      : 0
    const activityScore = Math.min(avgActivities * 2, 20)
    score += activityScore

    return Math.round(Math.min(score, 100))
  }

  // ==================== AUTOMATED WORKFLOWS ====================

  /**
   * Trigger automated workflows based on activity patterns
   */
  async triggerAutomatedWorkflows(activity: ActivityEvent): Promise<void> {
    try {
      // Auto-assign issues based on workload
      if (activity.type === 'issue_created') {
        await this.autoAssignIssue(activity)
      }

      // Escalate stale issues
      if (activity.type === 'issue_updated') {
        await this.checkForStaleIssue(activity)
      }

      // Celebrate milestones
      if (activity.type === 'status_changed') {
        await this.celebrateMilestone(activity)
      }
    } catch (error) {
      console.error('Failed to trigger automated workflows:', error)
    }
  }

  /**
   * Auto-assign issues to team members with lowest workload
   */
  private async autoAssignIssue(activity: ActivityEvent): Promise<void> {
    if (!activity.issueId || !activity.projectId) return

    try {
      const projectMgmt = getLinearProjectManagement()
      const metrics = await this.getTeamMetrics(activity.projectId)
      
      // Find team member with lowest workload
      const lowestWorkloadMember = metrics.topContributors
        .filter(contributor => contributor.contributions < 5) // Low threshold for auto-assignment
        .sort((a, b) => a.contributions - b.contributions)[0]

      if (lowestWorkloadMember) {
        const crud = getLinearCRUD()
        await crud.updateIssue(activity.issueId, {
          assigneeId: lowestWorkloadMember.userId
        })

        console.log(`Auto-assigned issue ${activity.issueId} to ${lowestWorkloadMember.userName}`)
      }
    } catch (error) {
      console.error('Failed to auto-assign issue:', error)
    }
  }

  /**
   * Check for stale issues and escalate if needed
   */
  private async checkForStaleIssue(activity: ActivityEvent): Promise<void> {
    if (!activity.issueId) return

    try {
      const crud = getLinearCRUD()
      const issue = await crud.getIssue(activity.issueId)
      
      if (!issue || !issue.updatedAt) return

      const daysSinceUpdate = (Date.now() - new Date(issue.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSinceUpdate > 7 && issue.state?.name !== 'Done') {
        // Escalate by adding a comment and changing priority
        await crud.addComment(issue.id, 
          `⚠️ This issue has been stale for ${Math.round(daysSinceUpdate)} days. Consider escalating priority.`)
        
        await crud.updateIssue(issue.id, {
          priority: Math.max((issue.priority || 1) + 1, 4) // Increase priority, max 4
        })

        console.log(`Escalated stale issue ${activity.issueId}`)
      }
    } catch (error) {
      console.error('Failed to check stale issue:', error)
    }
  }

  /**
   * Celebrate project milestones
   */
  private async celebrateMilestone(activity: ActivityEvent): Promise<void> {
    if (!activity.issueId) return

    try {
      const crud = getLinearCRUD()
      const issue = await crud.getIssue(activity.issueId)
      
      if (issue?.state?.name === 'Done') {
        // Add celebration comment
        await crud.addComment(issue.id, 
          `🎉 Great work! Issue "${issue.title}" has been completed. Thanks to ${activity.userName} for closing this!`)
        
        console.log(`Celebrated completion of issue ${activity.issueId}`)
      }
    } catch (error) {
      console.error('Failed to celebrate milestone:', error)
    }
  }
}

/**
 * Singleton instance for collaboration features
 */
let _collaborationInstance: LinearCollaboration | null = null

export function getLinearCollaboration(): LinearCollaboration {
  if (!_collaborationInstance) {
    _collaborationInstance = new LinearCollaboration()
  }
  return _collaborationInstance
}