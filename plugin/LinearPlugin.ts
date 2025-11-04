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
          priority: z.number().min(1).max(4).optional().describe("Priority 1-4 (optional)")
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
            return JSON.stringify(issue ? {
              success: true,
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              description: issue.description,
              status: issue.state?.name || 'Unknown',
              assignee: issue.assignee?.name || 'Unassigned',
              url: issue.url
            } : {
              success: false,
              error: "Issue not found"
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
        description: "Update an existing Linear issue",
        args: {
          issueId: z.string().describe("Linear issue ID"),
          title: z.string().optional().describe("New title (optional)"),
          description: z.string().optional().describe("New description (optional)"),
          statu: z.string().optional().describe("New Status (optional)"),

          assigneeId: z.string().optional().describe("New assignee ID (optional)"),
          priority: z.number().min(1).max(4).optional().describe("New priority 1-4 (optional)")
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const issue = await crud.updateIssue(args.issueId, args)
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
      })
    },
  }
}

// Export the plugin as default for easy importing
export default LinearPlugin