/**
 * TUI Event Stream Manager
 * 
 * Provides real-time event streaming for OpenCode TUI integration.
 * Manages event broadcasting, subscription handling, and stream lifecycle.
 * This is a lightweight implementation that can be extended based on
 * specific TUI requirements.
 */

import type { LinearStreamEvent } from './types'

/**
 * Event subscription interface for TUI components
 */
export interface EventSubscription {
  id: string
  eventType: string
  callback: (event: LinearStreamEvent) => void
  active: boolean
}

/**
 * TUI Event Stream Manager
 * 
 * Handles real-time event streaming from Linear webhooks to OpenCode TUI.
 * Provides subscription-based event delivery and stream management.
 */
export class TUIEventStreamManager {
  /** Active event subscriptions */
  private subscriptions: Map<string, EventSubscription> = new Map()
  
  /** Event buffer for recent events */
  private eventBuffer: LinearStreamEvent[] = []
  
  /** Maximum buffer size to prevent memory leaks */
  private maxBufferSize = 1000
  
  /** Stream status */
  private isStreaming = false
  
  /** Subscription counter for unique IDs */
  private subscriptionCounter = 0

  /**
   * Start the TUI event streaming service
   * 
   * Initializes the event stream manager and prepares for event processing.
   * This should be called during application startup.
   */
  start(): void {
    if (this.isStreaming) {
      console.log('TUI Event Stream is already running')
      return
    }

    this.isStreaming = true
    console.log('TUI Event Stream Manager started')
    
    // Start cleanup interval for expired subscriptions
    this.startCleanupInterval()
  }

  /**
   * Stop the TUI event streaming service
   * 
   * Gracefully shuts down the event stream manager and cleans up resources.
   */
  stop(): void {
    if (!this.isStreaming) {
      return
    }

    this.isStreaming = false
    this.subscriptions.clear()
    this.eventBuffer = []
    
    console.log('TUI Event Stream Manager stopped')
  }

  /**
   * Stream an event to all active subscribers
   * 
   * @param payload - Event payload data
   * @param eventType - Type of event for routing
   */
  streamEvent(payload: any, eventType: string): void {
    if (!this.isStreaming) {
      console.warn('TUI Event Stream is not active - event dropped')
      return
    }

    const event: LinearStreamEvent = {
      id: this.generateEventId(),
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'linear-webhook',
        processedAt: new Date().toISOString()
      }
    }

    // Add to buffer
    this.addToBuffer(event)

    // Broadcast to subscribers
    this.broadcastEvent(event)
  }

  /**
   * Subscribe to specific event types
   * 
   * @param eventType - Event type to subscribe to
   * @param callback - Callback function for event handling
   * @returns Subscription ID for unsubscribing
   */
  subscribe(eventType: string, callback: (event: LinearStreamEvent) => void): string {
    const subscriptionId = this.generateSubscriptionId()
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      callback,
      active: true
    }

    this.subscriptions.set(subscriptionId, subscription)
    
    console.log(`TUI Event subscription created: ${subscriptionId} for ${eventType}`)
    
    return subscriptionId
  }

  /**
   * Unsubscribe from event notifications
   * 
   * @param subscriptionId - Subscription ID to remove
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      subscription.active = false
      this.subscriptions.delete(subscriptionId)
      console.log(`TUI Event subscription removed: ${subscriptionId}`)
    }
  }

  /**
   * Get recent events from buffer
   * 
   * @param limit - Maximum number of events to return
   * @param eventType - Optional event type filter
   * @returns Array of recent events
   */
  getRecentEvents(limit = 50, eventType?: string): LinearStreamEvent[] {
    let events = [...this.eventBuffer].reverse() // Most recent first
    
    if (eventType) {
      events = events.filter(event => event.type === eventType)
    }
    
    return events.slice(0, limit)
  }

  /**
   * Get current stream status and statistics
   * 
   * @returns Stream status information
   */
  getStatus(): {
    isStreaming: boolean
    subscriptionCount: number
    bufferSize: number
    activeEventTypes: string[]
  } {
    const activeEventTypes = Array.from(this.subscriptions.values())
      .map(sub => sub.eventType)
      .filter((type, index, arr) => arr.indexOf(type) === index)

    return {
      isStreaming: this.isStreaming,
      subscriptionCount: this.subscriptions.size,
      bufferSize: this.eventBuffer.length,
      activeEventTypes
    }
  }

  /**
   * Add event to circular buffer
   * 
   * @param event - Event to add to buffer
   */
  private addToBuffer(event: LinearStreamEvent): void {
    this.eventBuffer.push(event)
    
    // Maintain buffer size
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift()
    }
  }

  /**
   * Broadcast event to matching subscribers
   * 
   * @param event - Event to broadcast
   */
  private broadcastEvent(event: LinearStreamEvent): void {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.active && this.matchesEventType(subscription.eventType, event.type)) {
        try {
          subscription.callback(event)
        } catch (error) {
          console.error(`Error in TUI event subscription ${subscription.id}:`, error)
          // Deactivate problematic subscription
          subscription.active = false
        }
      }
    }
  }

  /**
   * Check if event type matches subscription pattern
   * 
   * @param subscriptionType - Subscription event type (can be wildcard)
   * @param eventType - Actual event type
   * @returns True if event matches subscription
   */
  private matchesEventType(subscriptionType: string, eventType: string): boolean {
    // Support wildcard subscriptions
    if (subscriptionType === '*') {
      return true
    }
    
    // Support prefix matching (e.g., 'comment:*' matches 'comment:created')
    if (subscriptionType.endsWith('*')) {
      const prefix = subscriptionType.slice(0, -1)
      return eventType.startsWith(prefix)
    }
    
    // Exact match
    return subscriptionType === eventType
  }

  /**
   * Generate unique event ID
   * 
   * @returns Unique event identifier
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique subscription ID
   * 
   * @returns Unique subscription identifier
   */
  private generateSubscriptionId(): string {
    return `sub_${++this.subscriptionCounter}_${Date.now()}`
  }

  /**
   * Start cleanup interval for expired subscriptions
   * 
   * Periodically cleans up inactive subscriptions and old events
   */
  private startCleanupInterval(): void {
    // Cleanup every 5 minutes
    setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Cleanup inactive subscriptions and old events
   */
  private cleanup(): void {
    // Remove inactive subscriptions
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (!subscription.active) {
        this.subscriptions.delete(id)
      }
    }

    // Trim buffer if needed
    if (this.eventBuffer.length > this.maxBufferSize / 2) {
      this.eventBuffer = this.eventBuffer.slice(-Math.floor(this.maxBufferSize / 2))
    }

    console.log(`TUI Event Stream cleanup completed. Active subscriptions: ${this.subscriptions.size}`)
  }
}

/**
 * Global TUI event stream manager instance
 * 
 * Singleton pattern ensures consistent event streaming across the application.
 */
export const tuiEventStreamManager = new TUIEventStreamManager()