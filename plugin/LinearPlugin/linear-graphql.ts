/**
 * Linear GraphQL Client
 * 
 * Direct GraphQL client for Linear API that bypasses the Linear SDK's
 * Zod validation issues. This module provides raw GraphQL query capabilities
 * to fetch data exactly as needed from Linear's API.
 * 
 * The Linear SDK has internal validation that fails when the API response
 * format doesn't match the expected schema. By using raw GraphQL queries,
 * we can bypass this validation and handle the response format ourselves.
 */

import { getLinearClientUnsafe } from './linear-auth'

/**
 * Linear GraphQL query interface
 */
interface LinearGraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: Array<string | number>
    extensions?: Record<string, any>
  }>
}

/**
 * Execute a raw GraphQL query against Linear's API
 * 
 * @param query - GraphQL query string
 * @param variables - Optional query variables
 * @returns Promise resolving to GraphQL response
 */
async function executeGraphQL<T = any>(query: string, variables?: Record<string, any>): Promise<LinearGraphQLResponse<T>> {
  const client = getLinearClientUnsafe()
  
  if (!client) {
    throw new Error('Linear client not available - check API key configuration')
  }

  // Get the raw GraphQL client from the Linear SDK
  // @ts-ignore - Accessing internal property
  const graphqlClient = client._client || client.client
  
  if (!graphqlClient) {
    throw new Error('Unable to access GraphQL client from Linear SDK')
  }

  try {
    const response = await graphqlClient.request(query, variables)
    return { data: response }
  } catch (error: any) {
    // Handle GraphQL errors
    if (error.response?.errors) {
      return { errors: error.response.errors }
    }
    
    // Handle network/other errors
    throw new Error(`GraphQL request failed: ${error.message || 'Unknown error'}`)
  }
}

/**
 * GraphQL query for fetching issues with basic fields
 */
const ISSUES_QUERY = `
  query Issues($first: Int!) {
    issues(first: $first) {
      nodes {
        id
        identifier
        title
        description
        createdAt
        updatedAt
        url
        priority
        priorityLabel
        number
        branchName
        _state {
          id
          name
          type
          color
        }
        _assignee {
          id
          name
          displayName
          email
        }
        _team {
          id
          name
        }
        _creator {
          id
          name
          displayName
          email
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`

/**
 * GraphQL query for fetching a single issue
 */
const ISSUE_QUERY = `
  query Issue($id: String!) {
    issue(id: $id) {
      id
      identifier
      title
      description
      createdAt
      updatedAt
      url
      priority
      priorityLabel
      number
      branchName
      _state {
        id
        name
        type
        color
      }
      _assignee {
        id
        name
        displayName
        email
      }
      _team {
        id
        name
      }
      _creator {
        id
        name
        displayName
        email
      }
    }
  }
`

/**
 * GraphQL mutation for creating an issue
 */
const CREATE_ISSUE_MUTATION = `
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        description
        createdAt
        updatedAt
        url
        priority
        priorityLabel
        number
        branchName
        _state {
          id
          name
          type
          color
        }
        _assignee {
          id
          name
          displayName
          email
        }
        _team {
          id
          name
        }
        _creator {
          id
          name
          displayName
          email
        }
      }
    }
  }
`

/**
 * GraphQL mutation for updating an issue
 */
const UPDATE_ISSUE_MUTATION = `
  mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id
        identifier
        title
        description
        createdAt
        updatedAt
        url
        priority
        priorityLabel
        number
        branchName
        _state {
          id
          name
          type
          color
        }
        _assignee {
          id
          name
          displayName
          email
        }
        _team {
          id
          name
        }
        _creator {
          id
          name
          displayName
          email
        }
      }
    }
  }
`

/**
 * Raw issue type from GraphQL response
 */
export interface RawIssue {
  id: string
  identifier: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
  url: string
  priority: number
  priorityLabel: string
  number: number
  branchName?: string
  _state: {
    id: string
    name: string
    type: string
    color: string
  }
  _assignee?: {
    id: string
    name: string
    displayName: string
    email?: string
  }
  _team: {
    id: string
    name: string
  }
  _creator: {
    id: string
    name: string
    displayName: string
    email?: string
  }
}

/**
 * Fetch issues using raw GraphQL query
 * 
 * @param first - Maximum number of issues to return
 * @returns Promise resolving to array of issues
 */
export async function fetchIssues(first = 50): Promise<RawIssue[]> {
  const response = await executeGraphQL<{ issues: { nodes: RawIssue[] } }>(
    ISSUES_QUERY,
    { first }
  )

  if (response.errors) {
    throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`)
  }

  if (!response.data?.issues?.nodes) {
    throw new Error('No issues data returned from GraphQL query')
  }

  return response.data.issues.nodes
}

/**
 * Fetch a single issue using raw GraphQL query
 * 
 * @param id - Issue ID
 * @returns Promise resolving to issue or null if not found
 */
export async function fetchIssue(id: string): Promise<RawIssue | null> {
  const response = await executeGraphQL<{ issue: RawIssue }>(
    ISSUE_QUERY,
    { id }
  )

  if (response.errors) {
    throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`)
  }

  return response.data?.issue || null
}

/**
 * Create an issue using raw GraphQL mutation
 * 
 * @param input - Issue creation input
 * @returns Promise resolving to created issue
 */
export async function createIssue(input: {
  title: string
  description?: string
  teamId?: string
  assigneeId?: string
  stateId?: string
  priority?: number
}): Promise<RawIssue> {
  const response = await executeGraphQL<{ issueCreate: { success: boolean; issue: RawIssue } }>(
    CREATE_ISSUE_MUTATION,
    { input }
  )

  if (response.errors) {
    throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`)
  }

  if (!response.data?.issueCreate?.success || !response.data.issueCreate.issue) {
    throw new Error('Failed to create issue')
  }

  return response.data.issueCreate.issue
}

/**
 * Update an issue using raw GraphQL mutation
 * 
 * @param id - Issue ID
 * @param input - Issue update input
 * @returns Promise resolving to updated issue
 */
export async function updateIssue(id: string, input: {
  title?: string
  description?: string
  assigneeId?: string
  stateId?: string
  priority?: number
}): Promise<RawIssue> {
  const response = await executeGraphQL<{ issueUpdate: { success: boolean; issue: RawIssue } }>(
    UPDATE_ISSUE_MUTATION,
    { id, input }
  )

  if (response.errors) {
    throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`)
  }

  if (!response.data?.issueUpdate?.success || !response.data.issueUpdate.issue) {
    throw new Error('Failed to update issue')
  }

  return response.data.issueUpdate.issue
}

/**
 * GraphQL mutation for updating a project milestone
 */
const UPDATE_PROJECT_MILESTONE_MUTATION = `
  mutation UpdateProjectMilestone($id: String!, $input: ProjectMilestoneUpdateInput!) {
    projectMilestoneUpdate(id: $id, input: $input) {
      success
      projectMilestone {
        id
        name
        description
        targetDate
        sortOrder
      }
    }
  }
`

/**
 * Update a project milestone using raw HTTP GraphQL request
 * 
 * Bypasses the Linear SDK entirely to avoid serialization issues in OpenCode
 * 
 * @param id - Milestone ID
 * @param input - Milestone update input
 * @returns Promise resolving to success status
 */
export async function updateProjectMilestone(id: string, input: {
  name?: string
  description?: string
  targetDate?: string
  sortOrder?: number
}): Promise<boolean> {
  // Get API key from environment
  const apiKey = process.env.LINEAR_API_KEY
  if (!apiKey) {
    throw new Error('LINEAR_API_KEY environment variable not set')
  }

  // Make raw HTTP request to Linear GraphQL API
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey
    },
    body: JSON.stringify({
      query: UPDATE_PROJECT_MILESTONE_MUTATION,
      variables: { id, input }
    })
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()

  if (result.errors) {
    throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`)
  }

  if (!result.data?.projectMilestoneUpdate?.success) {
    throw new Error('Failed to update project milestone')
  }

  return true
}