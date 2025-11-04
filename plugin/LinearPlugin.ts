import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { testLinearAuth, getLinearClient } from './LinearPlugin/linear-auth'
import { getLinearCRUD } from './LinearPlugin/linear-crud'

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
            const result = issue ? {
              success: true,
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              url: issue.url
            } : {
              success: false,
              error: "Failed to create issue"
            }
            return JSON.stringify(result)
          } catch (error) {
            const errorResult = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
            return JSON.stringify(errorResult)
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
            const issue = await crud.getIssueWithState(args.issueId)
            const result = issue ? {
              success: true,
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              description: issue.description,
              status: issue.state?.name || issue.state?.type || 'Unknown',
              stateId: issue.state?.id,
              stateType: issue.state?.type,
              assignee: issue.assignee?.name,
              assigneeId: issue.assignee?.id,
              priority: issue.priority,
              labels: (() => {
                if (!issue.labels) return []
                if (Array.isArray(issue.labels)) {
                  return issue.labels.map((label: any) => label.name || label).filter(Boolean)
                }
                // Handle case where labels might be a different structure
                try {
                  const labelsStr = String(issue.labels)
                  return labelsStr ? [labelsStr] : []
                } catch {
                  return []
                }
              })(),
              createdAt: issue.createdAt,
              updatedAt: issue.updatedAt,
              url: issue.url
            } : {
              success: false,
              error: "Issue not found"
            }
            return JSON.stringify(result)
          } catch (error) {
            const errorResult = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
            return JSON.stringify(errorResult)
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
            const result = comment ? {
              success: true,
              id: comment.id,
              body: comment.body,
              createdAt: comment.createdAt
            } : {
              success: false,
              error: "Failed to add comment"
            }
            return JSON.stringify(result)
          } catch (error) {
            const errorResult = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
            return JSON.stringify(errorResult)
          }
        },
      }),

      linear_update_issue_status: tool({
        description: "Update status of a Linear issue",
        args: {
          issueId: z.string(),
          statusName: z.string(),
          statusId: z.string().optional()
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            
            // If statusId is not provided, try to find state by name with fuzzy matching
            let stateId = args.statusId
            if (!stateId) {
              // Get available workflow states to find matching one
              const client = (crud as any).client || await (crud as any).getClient()
              const statesResponse = await client.workflowStates()
              const states = statesResponse.nodes
              
              // First try exact match
              let matchingState = states.find((state: any) => 
                state.name === args.statusName || state.type === args.statusName
              )
              
              // If no exact match, try fuzzy matching
              if (!matchingState) {
                const searchTerm = args.statusName.toLowerCase().trim()
                
                // Try case-insensitive match
                matchingState = states.find((state: any) => 
                  state.name.toLowerCase() === searchTerm || 
                  state.type.toLowerCase() === searchTerm
                )
              }
              
              // If still no match, try partial matching
              if (!matchingState) {
                const searchTerm = args.statusName.toLowerCase().trim()
                matchingState = states.find((state: any) => 
                  state.name.toLowerCase().includes(searchTerm) || 
                  state.type.toLowerCase().includes(searchTerm) ||
                  searchTerm.includes(state.name.toLowerCase()) ||
                  searchTerm.includes(state.type.toLowerCase())
                )
              }
              
              // If still no match, try common variations
              if (!matchingState) {
                const variations: { [key: string]: string[] } = {
                  'todo': ['todo', 'to-do', 'to do'],
                  'inprogress': ['in progress', 'in-progress', 'inprogress', 'working', 'started'],
                  'done': ['done', 'completed', 'finished', 'closed'],
                  'backlog': ['backlog', 'icebox', 'later'],
                  'canceled': ['canceled', 'cancelled', 'won\'t do', 'wont do']
                }
                
                const normalizedSearch = args.statusName.toLowerCase().replace(/[^a-z0-9]/g, '')
                for (const [canonical, variants] of Object.entries(variations)) {
                  if (variants.some(variant => 
                    variant.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedSearch ||
                    normalizedSearch.includes(variant.toLowerCase().replace(/[^a-z0-9]/g, ''))
                  )) {
                    matchingState = states.find((state: any) => 
                      state.name.toLowerCase().replace(/[^a-z0-9]/g, '') === canonical ||
                      state.type.toLowerCase().replace(/[^a-z0-9]/g, '') === canonical
                    )
                    if (matchingState) break
                  }
                }
              }
              
              stateId = matchingState?.id
              
              // If still no match, return a helpful error without updating
              if (!stateId) {
                const availableStates = states.map((state: any) => 
                  `${state.name} (${state.type})`
                ).join(', ')
                
                const errorResult = {
                  success: false,
                  error: `Status "${args.statusName}" not found. Available states: ${availableStates}`,
                  searchedFor: args.statusName,
                  availableStates: states.map((state: any) => ({
                    id: state.id,
                    name: state.name,
                    type: state.type
                  }))
                }
                return JSON.stringify(errorResult)
              }
            }
            
            const issue = await crud.updateIssue(args.issueId, { stateId })
            const result = issue ? {
              success: true,
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              status: issue.state?.name || 'Updated',
              stateId: issue.state?.id,
              url: issue.url
            } : {
              success: false,
              error: "Failed to update issue status"
            }
            return JSON.stringify(result)
          } catch (error) {
            const errorResult = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
            return JSON.stringify(errorResult)
          }
        },
      }),

      linear_list_issues: tool({
        description: "List Linear issues with pagination",
        args: {
          first: z.number().optional(),
          filter: z.object({
            status: z.string().optional(),
            assignee: z.string().optional(),
            team: z.string().optional()
          }).optional()
        },
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const issues = await crud.listIssues(args.first || 50)
            const filter = args.filter || {}
            
            const filteredIssues = issues.filter(issue => {
              if (filter.status && issue.state?.name !== filter.status && issue.state?.type !== filter.status) {
                return false
              }
              if (filter.assignee && issue.assignee?.name !== filter.assignee) {
                return false
              }
              return true
            })
            
            const result = {
              success: true,
              issues: filteredIssues.map(issue => ({
                id: issue.id,
                identifier: issue.identifier,
                title: issue.title,
                status: issue.state?.name || issue.state?.type || 'Unknown',
                stateId: issue.state?.id,
                stateType: issue.state?.type,
                assignee: issue.assignee?.name,
                assigneeId: issue.assignee?.id,
                priority: issue.priority,
              labels: (() => {
                if (!issue.labels) return []
                if (Array.isArray(issue.labels)) {
                  return issue.labels.map((label: any) => label.name || label).filter(Boolean)
                }
                // Handle case where labels might be a different structure
                try {
                  const labelsStr = String(issue.labels)
                  return labelsStr ? [labelsStr] : []
                } catch {
                  return []
                }
              })(),
                createdAt: issue.createdAt,
                updatedAt: issue.updatedAt,
                url: issue.url
              })),
              count: filteredIssues.length
            }
            return JSON.stringify(result)
          } catch (error) {
            const errorResult = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
            return JSON.stringify(errorResult)
          }
        },
      }),

      linear_get_workflow_states: tool({
        description: "Get all available workflow states in Linear",
        args: {},
        async execute(args, context) {
          try {
            const crud = getLinearCRUD()
            const states = await crud.getWorkflowStates()
            const result = {
              success: true,
              states: states,
              count: states.length
            }
            return JSON.stringify(result)
          } catch (error) {
            const errorResult = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
            return JSON.stringify(errorResult)
          }
        },
      })
    },
  }
}

export default LinearPlugin;