import { LinearClient, Issue, Comment } from '@linear/sdk'
import { getLinearClient } from './linear-auth'

export class LinearCRUD {
  private client: LinearClient | null = null

  private async getClient(): Promise<LinearClient> {
    this.client ??= await getLinearClient()
    if (!this.client) throw new Error('Linear client not available')
    return this.client
  }

  // Issue CRUD
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

    // Get teamId - either provided or first available team
    if (data.teamId) {
      issueData.teamId = (await client.team(data.teamId))?.id
    } else {
      // Get first available team if none provided
      const teams = await client.teams({ first: 1 })
      issueData.teamId = teams.nodes[0]?.id
    }
    issueData.assigneeId = data.assigneeId ? (await client.user(data.assigneeId))?.id : undefined
    issueData.stateId = data.stateId ? (await client.workflowState(data.stateId))?.id : undefined
    
    if (data.labelIds?.length) {
      const labels = await Promise.all(data.labelIds.map(id => client.issueLabel(id)))
      issueData.labelIds = labels.filter(Boolean).map(label => label!.id)
    }

    if (data.priority !== undefined) issueData.priority = data.priority

    const result = await client.createIssue(issueData)
    return result.issue
  }

  async getIssue(issueId: string): Promise<Issue | null> {
    const client = await this.getClient()
    const result = await client.issue(issueId)
    return result ?? null
  }

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

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    
    updateData.assigneeId = data.assigneeId 
      ? (await client.user(data.assigneeId))?.id 
      : data.assigneeId === null ? null : undefined
      
    updateData.stateId = data.stateId 
      ? (await client.workflowState(data.stateId))?.id 
      : data.stateId === null ? null : undefined

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

  async deleteIssue(issueId: string): Promise<boolean> {
    const client = await this.getClient()
    const issue = await client.issue(issueId)
    if (!issue) return false
    await issue.delete()
    return true
  }

  async listIssues(first = 50): Promise<Issue[]> {
    const client = await this.getClient()
    const issues = await client.issues({ first })
    return issues.nodes.map(node => node)
  }

  // Comment CRUD
  async createComment(issueId: string, body: string): Promise<Comment | undefined> {
    const client = await this.getClient()
    const issue = await client.issue(issueId)
    if (!issue) throw new Error(`Issue ${issueId} not found`)
    const result = await client.createComment({ body, issueId: issue.id })
    return result.comment
  }

  async getComment(commentId: string): Promise<Comment | null> {
    const client = await this.getClient()
    const result = await client.comment({ id: commentId })
    return result ?? null
  }

  async updateComment(commentId: string, body: string): Promise<Comment | undefined> {
    const client = await this.getClient()
    const comment = await client.comment({ id: commentId })
    if (!comment) throw new Error(`Comment ${commentId} not found`)
    const result = await comment.update({ body })
    return result.comment
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const client = await this.getClient()
    const comment = await client.comment({ id: commentId })
    if (!comment) return false
    await comment.delete()
    return true
  }

  async listComments(issueId: string, first = 50): Promise<Comment[]> {
    const client = await this.getClient()
    const issue = await client.issue( issueId )
    if (!issue) throw new Error(`Issue ${issueId} not found`)
    const comments = await client.comments({ first, filter: { issue: { id: { eq: issueId } } } })
    return comments.nodes.map(node => node)
  }
}

export const linearCRUD = new LinearCRUD()