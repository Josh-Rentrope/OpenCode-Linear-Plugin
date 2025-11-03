/**
 * Linear Authentication Module
 * 
 * Handles authentication and client management for the Linear API.
 * Provides a centralized authentication system with retry logic,
 * error handling, and connection validation for the Linear SDK.
 * 
 * This module ensures that all Linear API interactions are properly
 * authenticated and handles common authentication scenarios including
 * token expiration, network issues, and invalid credentials.
 */

import { LinearClient } from '@linear/sdk'

/**
 * Cached Linear client instance for reuse across the application
 * 
 * Using a singleton pattern for the Linear client provides several benefits:
 * - Reduces authentication overhead by reusing the same client
 * - Maintains consistent connection state across API calls
 * - Allows for centralized authentication management
 * - Enables connection pooling and rate limit handling
 */
let linearClient: LinearClient | null = null

/**
 * Linear API key from environment variables
 * 
 * The API key should be set in the environment as LINEAR_API_KEY.
 * This key is required for all Linear API interactions and can be
 * obtained from Linear Settings > Account > Security > API Keys.
 */
const apiKey = process.env.LINEAR_API_KEY

/**
 * Initialize Linear client if API key is available
 * 
 * Attempts to create a Linear client instance during module initialization.
 * If the API key is missing, logs a warning but allows the application
 * to continue running for development/testing scenarios.
 */
if (!apiKey) {
  console.warn("Linear Plugin: LINEAR_API_KEY environment variable not found")
  console.warn("Linear integration will be disabled until API key is provided")
} else {
  try {
    linearClient = new LinearClient({ apiKey })
    console.log("Linear Plugin: Client initialized successfully")
  } catch (error) {
    console.error("Linear Plugin: Failed to initialize client:", error)
    linearClient = null
  }
}

/**
 * Get authenticated Linear client with validation
 * 
 * Returns a validated Linear client instance that has been tested for
 * authentication. Includes retry logic for transient authentication
 * failures and comprehensive error handling.
 * 
 * The authentication validation works by accessing the `viewer` property,
 * which makes a lightweight API call to verify the credentials are valid.
 * 
 * @returns Promise resolving to authenticated Linear client or null if authentication fails
 */
export async function getLinearClient(): Promise<LinearClient | null> {
  // Early return if no client was initialized during module load
  if (!linearClient) {
    console.warn("Linear Plugin: No client available - check API key configuration")
    return null
  }

  try {
    // Validate authentication by accessing the viewer (current user)
    // This is a lightweight API call that verifies the API key is valid
    await linearClient.viewer
    return linearClient

  } catch (error) {
    console.warn(`Linear Plugin: Authentication validation failed:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
    
    // Implement retry logic for transient authentication failures
    // This handles cases where the token might be temporarily invalid
    // due to network issues or Linear API rate limiting
    try {
      console.log("Linear Plugin: Attempting authentication retry...")
      
      // Wait 1 second before retry to allow for transient issues to resolve
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Retry the authentication validation
      await linearClient.viewer
      console.log("Linear Plugin: Authentication retry successful")
      return linearClient

    } catch (retryError) {
      console.error(`Linear Plugin: Authentication retry failed:`, {
        error: retryError instanceof Error ? retryError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
      
      // At this point, we've confirmed the authentication is genuinely failing
      // This could be due to expired token, invalid key, or account issues
      return null
    }
  }
}

/**
 * Test Linear authentication and provide detailed feedback
 * 
 * Performs a comprehensive authentication test and returns a detailed
 * status message suitable for logging, health checks, or user feedback.
 * This function is designed to provide clear information about the
 * authentication state and any potential issues.
 * 
 * @returns Promise resolving to detailed authentication status message
 */
export async function testLinearAuth(): Promise<string> {
  const client = await getLinearClient()
  
  if (!client) {
    return "Linear Plugin: Authentication failed - check LINEAR_API_KEY environment variable and network connection"
  }

  try {
    // Attempt to retrieve the current user information
    // This validates both authentication and basic API access
    const user = await client.viewer
    
    if (user) {
      const displayName = user.displayName || user.name || 'Unknown User'
      const email = user.email ? ` (${user.email})` : ''
      
      return `Linear Plugin: Successfully authenticated as ${displayName}${email}`
    } else {
      return "Linear Plugin: Authentication failed - could not retrieve user information"
    }
    
  } catch (error) {
    // Provide detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return `Linear Plugin: Authentication error - ${errorMessage}`
  }
}

/**
 * Get Linear client without authentication validation
 * 
 * Returns the raw Linear client instance without performing authentication
 * validation. This is useful for scenarios where you want to attempt
 * API operations and handle authentication errors at the operation level
 * rather than pre-validating the client.
 * 
 * @warning This function does not validate authentication. Use with caution.
 * @returns Linear client instance or null if not initialized
 */
export function getLinearClientUnsafe(): LinearClient | null {
  return linearClient
}

/**
 * Reinitialize Linear client with new API key
 * 
 * Allows for runtime reconfiguration of the Linear client with a new API key.
 * This is useful for scenarios where the API key might need to be updated
 * without restarting the application.
 * 
 * @param newApiKey - New Linear API key to use for authentication
 * @returns Promise resolving to success status
 */
export async function reinitializeLinearClient(newApiKey: string): Promise<boolean> {
  try {
    console.log("Linear Plugin: Reinitializing client with new API key...")
    
    // Create new client with the provided API key
    const newClient = new LinearClient({ apiKey: newApiKey })
    
    // Validate the new client works
    await newClient.viewer
    
    // Replace the old client if validation succeeds
    linearClient = newClient
    
    console.log("Linear Plugin: Client reinitialized successfully")
    return true
    
  } catch (error) {
    console.error("Linear Plugin: Failed to reinitialize client:", error)
    return false
  }
}