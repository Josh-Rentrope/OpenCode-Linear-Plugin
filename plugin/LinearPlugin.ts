/**
 * Linear Plugin for OpenCode
 * 
 * This plugin provides comprehensive Linear integration for OpenCode, including:
 * - Authentication and connection testing
 * - Issue management (create, read, update, delete)
 * - Comment management (create, read, update, delete)
 * - Team and project operations
 * 
 * The plugin is designed to work seamlessly with OpenCode's tool system,
 * allowing agents to interact with Linear issues and comments through
 * natural language commands.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { z } from "zod"
import { testLinearAuth, getLinearClient } from './LinearPlugin/linear-auth'
import { getLinearCRUD } from './LinearPlugin/linear-crud'

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
          title: z.string().describe("Issue title"),
          description: z.string().optional().describe("Issue description (optional)"),
          teamId: z.string().optional().describe("Team ID (optional, will auto-select if not provided)"),
          assigneeId: z.string().optional().describe("Assignee ID (optional)"),
          stateId: z.string().optional().describe("Workflow state ID (optional)"),
          labelIds: z.array(z.string()).optional().describe("Array of label IDs (optional)"),
          priority: z.number().min(1).max(4).optional().describe("Priority 1-4 (optional)"),
          parentId: z.string().optional().describe("Parent issue ID to create a sub-issue (optional)"),
          projectId: z.string().optional().describe("Project ID to add issue to project (optional)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const issue = await crud.createIssue(args)
            return JSON.stringify(issue ? {
              success: true,
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              url: issue.url
            } : {
              success: false,
              error: "Failed to create issue"
            })
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
          issueId: z.string().describe("Linear issue ID")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const issue = await crud.getIssue(args.issueId)
            if (!issue) {
              return JSON.stringify({
                success: false,
                error: "Issue not found"
              })
            }
            
            // Fetch labels and parent for the issue
            const labels = await issue.labels()
            const parent = issue.parentId ? await issue.parent : null
            
            return JSON.stringify({
              success: true,
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              description: issue.description,
              state: issue.state ? {
                id: issue.state.id,
                name: issue.state.name,
                type: issue.state.type,
                color: issue.state.color
              } : null,
              assignee: issue.assignee ? {
                id: issue.assignee.id,
                name: issue.assignee.name
              } : null,
              labels: labels.nodes.map(label => ({
                id: label.id,
                name: label.name,
                color: label.color
              })),
              parent: parent ? {
                id: parent.id,
                identifier: parent.identifier,
                title: parent.title
              } : null,
              url: issue.url
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_update_issue: tool({
        description: "Update an existing Linear issue (requires creator ownership unless force=true)",
        args: {
          issueId: z.string().describe("Linear issue ID"),
          title: z.string().optional().describe("New title (optional)"),
          description: z.string().optional().describe("New description (optional)"),
          assigneeId: z.string().optional().describe("New assignee ID (optional)"),
          stateId: z.string().optional().describe("New workflow state ID (optional)"),
          labelIds: z.array(z.string()).optional().describe("New array of label IDs (optional)"),
          priority: z.number().min(1).max(4).optional().describe("New priority 1-4 (optional)"),
          parentId: z.string().optional().describe("New parent issue ID (optional, null to remove parent)"),
          projectId: z.string().optional().describe("Project ID to add issue to project (optional, null to remove from project)"),
          force: z.boolean().optional().describe("Force update even if not creator (default: false)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const { force, ...issueData } = args
            const issue = await crud.updateIssue(args.issueId, issueData, { force })
            return JSON.stringify( issue ? {
              success: true,
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              url: issue.url
            } : {
              success: false,
              error: "Failed to update issue"
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_delete_issue: tool({
        description: "Delete a Linear issue - requires creator ownership unless force=true",
        args: {
          issueId: z.string().describe("Linear issue ID"),
          force: z.boolean().optional().describe("Force deletion even if not creator (default: false)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const deleted = await crud.deleteIssue(args.issueId, { force: args.force })
            return JSON.stringify({
              success: deleted,
              message: deleted ? "Issue deleted successfully" : "Issue not found"
            })
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
          issueId: z.string().describe("Linear issue ID"),
          body: z.string().describe("Comment content")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const comment = await crud.addComment(args.issueId, args.body)
            return JSON.stringify(comment ? {
              success: true,
              id: comment.id,
              body: comment.body,
              createdAt: comment.createdAt
            } : {
              success: false,
              error: "Failed to add comment"
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_update_comment: tool({
        description: "Update a Linear comment - requires comment author ownership unless force=true",
        args: {
          commentId: z.string().describe("Comment ID"),
          body: z.string().describe("New comment content"),
          force: z.boolean().optional().describe("Force update even if not author (default: false)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const comment = await crud.updateComment(args.commentId, args.body, { force: args.force })
            return JSON.stringify(comment ? {
              success: true,
              id: comment.id,
              body: comment.body,
              updatedAt: comment.updatedAt
            } : {
              success: false,
              error: "Failed to update comment"
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_delete_comment: tool({
        description: "Delete a Linear comment - requires comment author ownership unless force=true",
        args: {
          commentId: z.string().describe("Comment ID"),
          force: z.boolean().optional().describe("Force deletion even if not author (default: false)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const deleted = await crud.deleteComment(args.commentId, { force: args.force })
            return JSON.stringify({
              success: deleted,
              message: deleted ? "Comment deleted successfully" : "Comment not found"
            })
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
          first: z.number().optional().describe("Maximum number of issues to return (default: 50)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const issues = await crud.listIssues(args.first || 50)
            return JSON.stringify({
              success: true,
              issues: issues.map(issue => ({
                id: issue.id,
                identifier: issue.identifier,
                title: issue.title,
                status: 'Unknown', // State data is not properly populated by Linear SDK
                assignee: issue.assignee?.name || 'Unassigned',
                createdAt: issue.createdAt,
                url: issue.url
              })),
              count: issues.length
            });
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_list_comments: tool({
        description: "List comments for a Linear issue",
        args: {
          issueId: z.string().describe("Linear issue ID"),
          first: z.number().optional().describe("Maximum number of comments to return (default: 50)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const comments = await crud.listComments(args.issueId, args.first || 50)
            return JSON.stringify({
              success: true,
              comments: comments.map(comment => ({
                id: comment.id,
                body: comment.body,
                author: comment.user?.name || 'Unknown',
                createdAt: comment.createdAt
              })),
              count: comments.length
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_list_states: tool({
        description: "List workflow states (statuses) for a team",
        args: {
          teamId: z.string().optional().describe("Team ID (optional, will auto-select if not provided)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const states = await crud.listStates(args.teamId)
            return JSON.stringify({
              success: true,
              states: states.map(state => ({
                id: state.id,
                name: state.name,
                type: state.type,
                color: state.color,
                description: state.description
              })),
              count: states.length
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_list_labels: tool({
        description: "List issue labels for a team",
        args: {
          teamId: z.string().optional().describe("Team ID (optional, will auto-select if not provided)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const labels = await crud.listLabels(args.teamId)
            return JSON.stringify({
              success: true,
              labels: labels.map(label => ({
                id: label.id,
                name: label.name,
                color: label.color,
                description: label.description
              })),
              count: labels.length
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_list_children: tool({
        description: "List child issues (sub-issues) of a parent issue",
        args: {
          parentId: z.string().describe("Parent issue ID"),
          first: z.number().optional().describe("Maximum number of children to return (default: 50)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const children = await crud.listChildren(args.parentId, args.first || 50)
            return JSON.stringify({
              success: true,
              children: children.map(child => ({
                id: child.id,
                identifier: child.identifier,
                title: child.title,
                state: child.state?.name || 'Unknown',
                assignee: child.assignee?.name || 'Unassigned',
                url: child.url
              })),
              count: children.length
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_create_relation: tool({
        description: "Create an issue relation (blocks, duplicate, related, similar) - requires issue creator ownership unless force=true",
        args: {
          issueId: z.string().describe("Issue ID that has the relation"),
          relatedIssueId: z.string().describe("Related issue ID"),
          type: z.enum(['blocks', 'duplicate', 'related', 'similar']).describe("Relation type: blocks, duplicate, related, or similar"),
          force: z.boolean().optional().describe("Force creation even if not issue creator (default: false)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const { force, ...relationData } = args
            const relation = await crud.createRelation(relationData, { force })
            return JSON.stringify(relation ? {
              success: true,
              id: relation.id,
              type: relation.type,
              createdAt: relation.createdAt
            } : {
              success: false,
              error: "Failed to create relation"
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_list_relations: tool({
        description: "List issue relations for an issue",
        args: {
          issueId: z.string().describe("Issue ID"),
          direction: z.enum(['from', 'to', 'both']).optional().describe("Direction: 'from' (relations FROM this issue), 'to' (relations TO this issue), or 'both' (default: both)"),
          first: z.number().optional().describe("Maximum number of relations to return (default: 50)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const relations = await crud.listRelations(args.issueId, args.direction || 'both', args.first || 50)
            
            // Fetch issue details for each relation
            const relationsWithDetails = await Promise.all(relations.map(async (relation) => {
              const issue = await relation.issue
              const relatedIssue = await relation.relatedIssue
              return {
                id: relation.id,
                type: relation.type,
                issue: {
                  id: issue.id,
                  identifier: issue.identifier,
                  title: issue.title
                },
                relatedIssue: {
                  id: relatedIssue.id,
                  identifier: relatedIssue.identifier,
                  title: relatedIssue.title
                },
                createdAt: relation.createdAt
              }
            }))
            
            return JSON.stringify({
              success: true,
              relations: relationsWithDetails,
              count: relationsWithDetails.length
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_delete_relation: tool({
        description: "Delete an issue relation - requires issue creator ownership unless force=true",
        args: {
          relationId: z.string().describe("Relation ID to delete"),
          force: z.boolean().optional().describe("Force deletion even if not issue creator (default: false)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const deleted = await crud.deleteRelation(args.relationId, { force: args.force })
            return JSON.stringify({
              success: deleted,
              message: deleted ? "Relation deleted successfully" : "Relation not found"
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      // ==================== PROJECT TOOLS ====================

      linear_create_project: tool({
        description: "Create a new Linear project",
        args: {
          name: z.string().describe("Project name"),
          teamIds: z.array(z.string()).describe("Array of team IDs"),
          description: z.string().optional().describe("Project description (optional)"),
          content: z.string().optional().describe("Project content in markdown (optional)"),
          color: z.string().optional().describe("Project color (optional)"),
          icon: z.string().optional().describe("Project icon (optional)"),
          leadId: z.string().optional().describe("Project lead user ID (optional)"),
          memberIds: z.array(z.string()).optional().describe("Array of member user IDs (optional)"),
          labelIds: z.array(z.string()).optional().describe("Array of label IDs (optional)"),
          priority: z.number().min(0).max(4).optional().describe("Priority 0-4 (optional)"),
          startDate: z.string().optional().describe("Start date (optional)"),
          targetDate: z.string().optional().describe("Target date (optional)"),
          statusId: z.string().optional().describe("Project status ID (optional)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const project = await crud.createProject(args)
            return JSON.stringify(project ? {
              success: true,
              id: project.id,
              name: project.name,
              url: project.url
            } : {
              success: false,
              error: "Failed to create project"
            })
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
          projectId: z.string().describe("Project ID")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const project = await crud.getProject(args.projectId)
            if (!project) {
              return JSON.stringify({
                success: false,
                error: "Project not found"
              })
            }
            
            const lead = await project.lead
            
            return JSON.stringify({
              success: true,
              id: project.id,
              name: project.name,
              description: project.description,
              content: project.content,
              color: project.color,
              icon: project.icon,
              priority: project.priority,
              priorityLabel: project.priorityLabel,
              startDate: project.startDate,
              targetDate: project.targetDate,
              progress: project.progress,
              lead: lead ? {
                id: lead.id,
                name: lead.name
              } : null,
              url: project.url
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_update_project: tool({
        description: "Update a Linear project - requires project lead ownership unless force=true",
        args: {
          projectId: z.string().describe("Project ID"),
          name: z.string().optional().describe("New name (optional)"),
          description: z.string().optional().describe("New description (optional)"),
          content: z.string().optional().describe("New content in markdown (optional)"),
          color: z.string().optional().describe("New color (optional)"),
          icon: z.string().optional().describe("New icon (optional)"),
          leadId: z.string().optional().describe("New lead user ID (optional)"),
          memberIds: z.array(z.string()).optional().describe("New array of member user IDs (optional)"),
          labelIds: z.array(z.string()).optional().describe("New array of label IDs (optional)"),
          priority: z.number().min(0).max(4).optional().describe("New priority 0-4 (optional)"),
          startDate: z.string().optional().describe("New start date (optional)"),
          targetDate: z.string().optional().describe("New target date (optional)"),
          statusId: z.string().optional().describe("New project status ID (optional)"),
          teamIds: z.array(z.string()).optional().describe("New array of team IDs (optional)"),
          force: z.boolean().optional().describe("Force update even if not project lead (default: false)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const { force, ...projectData } = args
            const project = await crud.updateProject(args.projectId, projectData, { force })
            return JSON.stringify(project ? {
              success: true,
              id: project.id,
              name: project.name,
              url: project.url
            } : {
              success: false,
              error: "Failed to update project"
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_delete_project: tool({
        description: "Delete a Linear project - requires project lead ownership unless force=true",
        args: {
          projectId: z.string().describe("Project ID"),
          force: z.boolean().optional().describe("Force deletion even if not project lead (default: false)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const deleted = await crud.deleteProject(args.projectId, { force: args.force })
            return JSON.stringify({
              success: deleted,
              message: deleted ? "Project deleted successfully" : "Project not found"
            })
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
          first: z.number().optional().describe("Maximum number of projects to return (default: 50)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const projects = await crud.listProjects(undefined, args.first || 50)
            return JSON.stringify({
              success: true,
              projects: await Promise.all(projects.map(async (project) => {
                const lead = await project.lead
                return {
                  id: project.id,
                  name: project.name,
                  description: project.description,
                  priority: project.priority,
                  progress: project.progress,
                  startDate: project.startDate,
                  targetDate: project.targetDate,
                  lead: lead ? lead.name : 'No lead',
                  url: project.url
                }
              })),
              count: projects.length
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_list_my_projects: tool({
        description: "List Linear projects where current user is the lead",
        args: {
          first: z.number().optional().describe("Maximum number of projects to return (default: 50)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const projects = await crud.listMyProjects(args.first || 50)
            return JSON.stringify({
              success: true,
              projects: await Promise.all(projects.map(async (project) => {
                const lead = await project.lead
                return {
                  id: project.id,
                  name: project.name,
                  description: project.description,
                  priority: project.priority,
                  progress: project.progress,
                  startDate: project.startDate,
                  targetDate: project.targetDate,
                  lead: lead ? lead.name : 'No lead',
                  url: project.url
                }
              })),
              count: projects.length
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_list_project_issues: tool({
        description: "List all issues in a Linear project",
        args: {
          projectId: z.string().describe("Project ID"),
          first: z.number().optional().describe("Maximum number of issues to return (default: 50)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const issues = await crud.listProjectIssues(args.projectId, args.first || 50)
            return JSON.stringify({
              success: true,
              issues: issues.map(issue => ({
                id: issue.id,
                identifier: issue.identifier,
                title: issue.title,
                url: issue.url
              })),
              count: issues.length
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      // ==================== PROJECT MILESTONE TOOLS ====================

      linear_create_milestone: tool({
        description: "Create a project milestone - requires project lead ownership unless force=true",
        args: {
          name: z.string().describe("Milestone name"),
          projectId: z.string().describe("Project ID"),
          description: z.string().optional().describe("Milestone description (optional)"),
          targetDate: z.string().optional().describe("Target date (optional)"),
          sortOrder: z.number().optional().describe("Sort order (optional)"),
          force: z.boolean().optional().describe("Force creation even if not project lead (default: false)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const { force, ...milestoneData } = args
            const milestone = await crud.createProjectMilestone(milestoneData, { force })
            return JSON.stringify(milestone ? {
              success: true,
              id: milestone.id,
              name: milestone.name
            } : {
              success: false,
              error: "Failed to create milestone"
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_update_milestone: tool({
        description: "Update a project milestone - requires project lead ownership unless force=true",
        args: {
          milestoneId: z.string().describe("Milestone ID"),
          name: z.string().optional().describe("New name (optional)"),
          description: z.string().optional().describe("New description (optional)"),
          targetDate: z.string().optional().describe("New target date (optional)"),
          sortOrder: z.number().optional().describe("New sort order (optional)"),
          force: z.boolean().optional().describe("Force update even if not project lead (default: false)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const { force, ...milestoneData } = args
            const success = await crud.updateProjectMilestone(args.milestoneId, milestoneData, { force })
            
            return JSON.stringify({
              success,
              milestoneId: args.milestoneId,
              message: "Milestone updated successfully"
            })
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        },
      }),

      linear_delete_milestone: tool({
        description: "Delete a project milestone - requires project lead ownership unless force=true",
        args: {
          milestoneId: z.string().describe("Milestone ID"),
          force: z.boolean().optional().describe("Force deletion even if not project lead (default: false)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const deleted = await crud.deleteProjectMilestone(args.milestoneId, { force: args.force })
            return JSON.stringify({
              success: deleted,
              message: deleted ? "Milestone deleted successfully" : "Milestone not found"
            })
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        },
      }),

      linear_list_milestones: tool({
        description: "List milestones for a Linear project",
        args: {
          projectId: z.string().describe("Project ID"),
          first: z.number().optional().describe("Maximum number of milestones to return (default: 50)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const milestones = await crud.listProjectMilestones(args.projectId, args.first || 50)
            return JSON.stringify({
              success: true,
              milestones: milestones.map(milestone => ({
                id: milestone.id,
                name: milestone.name,
                description: milestone.description,
                targetDate: milestone.targetDate,
                progress: milestone.progress,
                sortOrder: milestone.sortOrder
              })),
              count: milestones.length
            })
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

// Export the plugin as default for easy importing
export default LinearPlugin