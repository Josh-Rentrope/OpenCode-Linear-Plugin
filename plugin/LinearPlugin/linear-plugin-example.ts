import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { testLinearAuth, getLinearClient } from './linear-auth'
import { getLinearCRUD } from './linear-crud'
import { getLinearProjectManagement } from './linear-project-management'
import { getLinearCollaboration } from './linear-collaboration'

import { z } from "zod"

export const LinearPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      linear_auth: tool({
        description: "Authenticate with Linear SDK and test connection",
        args: {},
        async execute(args, context) {
          return await testLinearAuth()
        },
      }),
      
      linear_create_issue: tool({
        description: "Create a new Linear issue",
        args: {
          title: z.string(),
          description: z.string().optional(),
          teamId: z.string().optional(),
          assigneeId: z.string().optional(),
          priority: z.number().optional()
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const issue = await crud.createIssue(args)
            return issue ? {
              success: true,
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              url: issue.url
            } : {
              success: false,
              error: "Failed to create issue"
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_get_issue: tool({
        description: "Get a Linear issue by ID",
        args: {
          issueId: z.string()
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const issue = await crud.getIssue(args.issueId)
            return issue ? {
              success: true,
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              description: issue.description,
              status: issue.state?.name,
              assignee: issue.assignee?.name,
              url: issue.url
            } : {
              success: false,
              error: "Issue not found"
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_add_comment: tool({
        description: "Add a comment to a Linear issue",
        args: {
          issueId: z.string(),
          body: z.string()
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const comment = await crud.addComment(args.issueId, args.body)
            return comment ? {
              success: true,
              id: comment.id,
              body: comment.body,
              createdAt: comment.createdAt
            } : {
              success: false,
              error: "Failed to add comment"
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_list_issues: tool({
        description: "List Linear issues with pagination",
        args: {
          
          first: z.number().optional()
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const issues = await crud.listIssues(args.first || 50)
            return {
              success: true,
              issues: issues.map(issue => ({
                id: issue.id,
                identifier: issue.identifier,
                title: issue.title,
                status: issue.state?.name,
                assignee: issue.assignee?.name,
                createdAt: issue.createdAt,
                url: issue.url
              })),
              count: issues.length
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      // ==================== PHASE 3: PROJECT MANAGEMENT ====================

      linear_create_project: tool({
        description: "Create a new Linear project",
        args: {
          name: z.string(),
          description: z.string().optional(),
          teamId: z.string(),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
          startDate: z.string().optional(),
          targetDate: z.string().optional(),
          assigneeIds: z.array(z.string()).optional(),
          labelIds: z.array(z.string()).optional()
        },
        async execute(args, context) {
          try {
            const projectMgmt = getLinearProjectManagement()
            const project = await projectMgmt.createProject(args)
            return project ? {
              success: true,
              id: project.id,
              name: project.name,
              description: project.description,
              teamId: project.teamId,
              state: project.state,
              priority: project.priority,
              progress: project.progress,
              url: project.url
            } : {
              success: false,
              error: "Failed to create project"
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_get_project: tool({
        description: "Get a Linear project by ID",
        args: {
          projectId: z.string()
        },
        async execute(args, context) {
          try {
            const projectMgmt = getLinearProjectManagement()
            const project = await projectMgmt.getProject(args.projectId)
            return project ? {
              success: true,
              id: project.id,
              name: project.name,
              description: project.description,
              teamId: project.teamId,
              state: project.state,
              priority: project.priority,
              progress: project.progress,
              startDate: project.startDate,
              targetDate: project.targetDate,
              url: project.url
            } : {
              success: false,
              error: "Project not found"
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_list_projects: tool({
        description: "List Linear projects with optional filtering",
        args: {
          teamId: z.string().optional(),
          state: z.enum(['active', 'completed', 'archived']).optional(),
          assigneeId: z.string().optional(),
          first: z.number().optional()
        },
        async execute(args, context) {
          try {
            const projectMgmt = getLinearProjectManagement()
            const projects = await projectMgmt.listProjects(args)
            return {
              success: true,
              projects: projects.map(project => ({
                id: project.id,
                name: project.name,
                description: project.description,
                teamId: project.teamId,
                state: project.state,
                priority: project.priority,
                progress: project.progress,
                createdAt: project.createdAt,
                url: project.url
              })),
              count: projects.length
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_update_project: tool({
        description: "Update an existing Linear project",
        args: {
          projectId: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          state: z.enum(['active', 'completed', 'archived']).optional(),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
          progress: z.number().optional(),
          assigneeIds: z.array(z.string()).optional(),
          labelIds: z.array(z.string()).optional()
        },
        async execute(args, context) {
          try {
            const projectMgmt = getLinearProjectManagement()
            const { projectId, ...updateData } = args
            const project = await projectMgmt.updateProject(projectId, updateData)
            return project ? {
              success: true,
              id: project.id,
              name: project.name,
              state: project.state,
              priority: project.priority,
              progress: project.progress,
              updatedAt: project.updatedAt
            } : {
              success: false,
              error: "Failed to update project"
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_create_milestone: tool({
        description: "Create a project milestone",
        args: {
          projectId: z.string(),
          title: z.string(),
          description: z.string().optional(),
          dueDate: z.string().optional(),
          position: z.number().optional()
        },
        async execute(args, context) {
          try {
            const projectMgmt = getLinearProjectManagement()
            const milestone = await projectMgmt.createMilestone(args)
            return milestone ? {
              success: true,
              id: milestone.id,
              projectId: milestone.projectId,
              title: milestone.title,
              description: milestone.description,
              dueDate: milestone.dueDate,
              completed: milestone.completed,
              position: milestone.position
            } : {
              success: false,
              error: "Failed to create milestone"
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_complete_milestone: tool({
        description: "Complete a project milestone",
        args: {
          milestoneId: z.string()
        },
        async execute(args, context) {
          try {
            const projectMgmt = getLinearProjectManagement()
            const milestone = await projectMgmt.completeMilestone(args.milestoneId)
            return milestone ? {
              success: true,
              id: milestone.id,
              projectId: milestone.projectId,
              title: milestone.title,
              completed: milestone.completed,
              completedAt: milestone.completedAt
            } : {
              success: false,
              error: "Failed to complete milestone"
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      // ==================== PHASE 3: COLLABORATION FEATURES ====================

      linear_get_team_metrics: tool({
        description: "Get team collaboration metrics",
        args: {
          teamId: z.string(),
          timeRange: z.enum(['7d', '30d', '90d']).optional()
        },
        async execute(args, context) {
          try {
            const collaboration = getLinearCollaboration()
            const metrics = await collaboration.getTeamMetrics(args.teamId, args.timeRange)
            return {
              success: true,
              teamId: metrics.teamId,
              teamName: metrics.teamName,
              activeMembers: metrics.activeMembers,
              totalIssues: metrics.totalIssues,
              completedIssues: metrics.completedIssues,
              averageResponseTime: metrics.averageResponseTime,
              collaborationScore: metrics.collaborationScore,
              topContributors: metrics.topContributors,
              activityTrend: metrics.activityTrend
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_get_recent_activity: tool({
        description: "Get recent team activity",
        args: {
          teamId: z.string().optional(),
          projectId: z.string().optional(),
          userId: z.string().optional(),
          limit: z.number().optional(),
          timeRange: z.enum(['1h', '24h', '7d', '30d']).optional()
        },
        async execute(args, context) {
          try {
            const collaboration = getLinearCollaboration()
            const activities = await collaboration.getRecentActivity(args)
            return {
              success: true,
              activities: activities.map(activity => ({
                id: activity.id,
                type: activity.type,
                userId: activity.userId,
                userName: activity.userName,
                issueId: activity.issueId,
                issueTitle: activity.issueTitle,
                projectId: activity.projectId,
                timestamp: activity.timestamp
              })),
              count: activities.length
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_get_project_progress: tool({
        description: "Get project progress summary",
        args: {
          projectId: z.string()
        },
        async execute(args, context) {
          try {
            const projectMgmt = getLinearProjectManagement()
            const progress = await projectMgmt.getProjectProgress(args.projectId)
            return {
              success: true,
              projectId: progress.projectId,
              totalIssues: progress.totalIssues,
              completedIssues: progress.completedIssues,
              totalMilestones: progress.totalMilestones,
              completedMilestones: progress.completedMilestones,
              progressPercentage: progress.progressPercentage
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      })
    },
  }
}