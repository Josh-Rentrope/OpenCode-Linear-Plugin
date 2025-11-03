/**
 * OpenCode Agent Executor
 * 
 * Provides the bridge between Linear webhook events and OpenCode's agent system.
 * This module handles command execution, context management, and response formatting
 * for Linear-triggered OpenCode operations.
 */

import { task } from '../opencode-dev'

/**
 * OpenCode command execution request
 * 
 * Defines the structure for commands coming from Linear webhooks.
 * Includes the command itself and rich context for proper execution.
 */
export interface OpenCodeCommandRequest {
  /** The primary action to execute (e.g., 'create-file', 'run-tests') */
  action: string
  /** Command arguments that provide additional context */
  arguments: string[]
  /** Command options in key=value format */
  options: Record<string, string>
  /** Rich context including Linear metadata and user information */
  context: {
    linear: {
      issueId: string
      issueIdentifier: string
      commentId: string
      actor: string
      timestamp: string
      issueUrl: string
    }
    command: {
      raw: string
      position: number
    }
    metadata: Record<string, any>
  }
  /** Source identifier for tracking command origins */
  source: string
}

/**
 * OpenCode command execution result
 * 
 * Standardized response format for all command executions.
 * Provides success status, response message, and optional data.
 */
export interface OpenCodeCommandResult {
  /** Whether the command executed successfully */
  success: boolean
  /** Human-readable response message */
  response: string
  /** Optional structured data from command execution */
  data?: any
  /** Error details if execution failed */
  error?: string
  /** Execution metadata for debugging and monitoring */
  metadata?: {
    executionTime: number
    agent: string
    source: string
  }
}

/**
 * Execute OpenCode command through the appropriate agent
 * 
 * Routes commands to the correct OpenCode agent based on the action type.
 * Provides comprehensive context and handles error scenarios gracefully.
 * 
 * @param request - Complete command request with context
 * @returns Execution result with response and optional data
 */
export async function executeOpenCodeAgent(request: OpenCodeCommandRequest): Promise<OpenCodeCommandResult> {
  const startTime = Date.now()
  
  try {
    console.log(`Executing OpenCode command:`, {
      action: request.action,
      arguments: request.arguments,
      options: request.options,
      source: request.source,
      issueId: request.context.linear.issueId,
      actor: request.context.linear.actor
    })

    // Determine the appropriate agent type based on the action
    const agentType = determineAgentType(request.action)
    
    // Construct the prompt for the agent with full context
    const prompt = constructAgentPrompt(request)
    
    // Execute the command through the OpenCode agent system
    const agentResult = await task({
      description: `Execute ${request.action} command from Linear`,
      prompt: prompt,
      subagent_type: agentType
    })

    const executionTime = Date.now() - startTime

    // Parse and format the agent result
    const result = parseAgentResult(agentResult, request, executionTime)
    
    console.log(`OpenCode command completed:`, {
      action: request.action,
      success: result.success,
      executionTime: executionTime,
      issueId: request.context.linear.issueId
    })

    return result

  } catch (error) {
    const executionTime = Date.now() - startTime
    
    console.error(`OpenCode command execution failed:`, {
      action: request.action,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: executionTime,
      issueId: request.context.linear.issueId
    })

    return {
      success: false,
      response: 'Command execution failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        executionTime,
        agent: 'unknown',
        source: request.source
      }
    }
  }
}

/**
 * Determine the appropriate OpenCode agent type for a given action
 * 
 * Maps command actions to specialized agents that can handle them effectively.
 * Uses a fallback to general agent for unknown actions.
 * 
 * @param action - The command action to determine agent type for
 * @returns OpenCode agent type string
 */
function determineAgentType(action: string): string {
  // Map common actions to specialized agents
  const agentMap: Record<string, string> = {
    'create-file': 'CodeWriterAgent',
    'edit-file': 'CodeWriterAgent',
    'delete-file': 'CodeWriterAgent',
    'run-tests': 'TestRunnerAgent',
    'test': 'TestRunnerAgent',
    'deploy': 'general',
    'build': 'general',
    'help': 'general',
    'status': 'general',
    'search': 'general',
    'find': 'general'
  }

  // Normalize action to lowercase for matching
  const normalizedAction = action.toLowerCase()
  
  return agentMap[normalizedAction] || 'general'
}

/**
 * Construct comprehensive prompt for OpenCode agent
 * 
 * Creates a detailed prompt that includes the command, context, and expectations.
 * Provides the agent with all necessary information to execute the command properly.
 * 
 * @param request - Complete command request with context
 * @returns Detailed prompt string for the agent
 */
function constructAgentPrompt(request: OpenCodeCommandRequest): string {
  const { action, arguments: args, options, context } = request
  
  let prompt = `Execute the following OpenCode command that was triggered from a Linear issue:\n\n`
  prompt += `**Command:** ${action}\n`
  
  if (args.length > 0) {
    prompt += `**Arguments:** ${args.join(', ')}\n`
  }
  
  if (Object.keys(options).length > 0) {
    prompt += `**Options:** ${JSON.stringify(options, null, 2)}\n`
  }
  
  prompt += `\n**Context:**\n`
  prompt += `- Issue ID: ${context.linear.issueId} (${context.linear.issueIdentifier})\n`
  prompt += `- Comment ID: ${context.linear.commentId}\n`
  prompt += `- Requested by: ${context.linear.actor}\n`
  prompt += `- Issue URL: ${context.linear.issueUrl}\n`
  prompt += `- Original command: ${context.command.raw}\n`
  prompt += `- Source: Linear webhook\n`
  
  prompt += `\n**Instructions:**\n`
  prompt += `1. Execute the command with the provided arguments and options\n`
  prompt += `2. Provide a clear, concise response that can be posted back to Linear\n`
  prompt += `3. Include any relevant output, errors, or status information\n`
  prompt += `4. Format the response to be easily readable in a Linear comment\n`
  prompt += `5. If the command requires additional information, explain what's needed\n`
  
  // Add action-specific instructions
  switch (action.toLowerCase()) {
    case 'create-file':
      prompt += `\n**For file creation:**\n`
      prompt += `- Create the file with appropriate content based on the arguments\n`
      prompt += `- Use the file extension to determine the language/type\n`
      prompt += `- Include basic boilerplate if appropriate\n`
      break
      
    case 'run-tests':
      prompt += `\n**For test execution:**\n`
      prompt += `- Run the relevant test suite\n`
      prompt += `- Include test results summary\n`
      prompt += `- Highlight any failures or errors\n`
      break
      
    case 'help':
      prompt += `\n**For help requests:**\n`
      prompt += `- Provide helpful information about OpenCode capabilities\n`
      prompt += `- Include examples of common commands\n`
      prompt += `- Suggest relevant documentation or resources\n`
      break
  }
  
  prompt += `\n**Response Format:**\n`
  prompt += `Provide a response that can be directly posted to a Linear issue comment.`
  prompt += ` Include relevant code blocks, status indicators, and clear next steps if applicable.`
  
  return prompt
}

/**
 * Parse and format agent execution result
 * 
 * Processes the raw agent result into a standardized format suitable
 * for Linear integration and response handling.
 * 
 * @param agentResult - Raw result from OpenCode agent execution
 * @param request - Original command request for context
 * @param executionTime - Time taken to execute the command
 * @returns Formatted command execution result
 */
function parseAgentResult(
  agentResult: any,
  request: OpenCodeCommandRequest,
  executionTime: number
): OpenCodeCommandResult {
  try {
    // Extract the main response from the agent result
    const response = typeof agentResult === 'string' 
      ? agentResult 
      : agentResult.response || agentResult.message || 'Command completed'
    
    // Extract any structured data if available
    const data = agentResult.data || agentResult.output
    
    // Determine success based on agent response
    const success = !agentResult.error && 
                   !response.toLowerCase().includes('error') &&
                   !response.toLowerCase().includes('failed')
    
    return {
      success,
      response: response.trim(),
      data,
      error: agentResult.error,
      metadata: {
        executionTime,
        agent: determineAgentType(request.action),
        source: request.source
      }
    }
    
  } catch (error) {
    return {
      success: false,
      response: 'Failed to parse agent result',
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      metadata: {
        executionTime,
        agent: determineAgentType(request.action),
        source: request.source
      }
    }
  }
}

/**
 * Get available OpenCode commands and their descriptions
 * 
 * Provides a list of supported commands that can be triggered from Linear.
 * Useful for help responses and documentation generation.
 * 
 * @returns Array of available command descriptions
 */
export function getAvailableCommands(): Array<{
  action: string
  description: string
  examples: string[]
  agent: string
}> {
  return [
    {
      action: 'create-file',
      description: 'Create a new file with specified content',
      examples: [
        '@opencode create-file component.ts --typescript',
        '@opencode create-file README.md --template=basic'
      ],
      agent: 'CodeWriterAgent'
    },
    {
      action: 'edit-file',
      description: 'Edit an existing file with changes',
      examples: [
        '@opencode edit-file component.ts --add=import',
        '@opencode edit-file config.json --update=version'
      ],
      agent: 'CodeWriterAgent'
    },
    {
      action: 'run-tests',
      description: 'Execute test suite and report results',
      examples: [
        '@opencode run-tests',
        '@opencode run-tests --verbose --coverage'
      ],
      agent: 'TestRunnerAgent'
    },
    {
      action: 'help',
      description: 'Get help with OpenCode commands and capabilities',
      examples: [
        '@opencode help',
        '@opencode help create-file'
      ],
      agent: 'general'
    },
    {
      action: 'status',
      description: 'Get current status of the project or workspace',
      examples: [
        '@opencode status',
        '@opencode status --detailed'
      ],
      agent: 'general'
    }
  ]
}