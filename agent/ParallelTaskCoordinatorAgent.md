# ParallelTaskCoordinatorAgent - OpenCode Agent for Multi-Agent Coordination

## Overview

ParallelTaskCoordinatorAgent is a specialized OpenCode agent that manages multiple agents working on different files simultaneously. It implements file locking to prevent conflicts, manages resource allocation, and coordinates inter-agent communication to ensure safe and efficient parallel execution.

## Features

- **Multi-Agent Coordination**: Manages multiple agents working concurrently
- **File Locking**: Prevents conflicts through intelligent file locking
- **Resource Allocation**: Optimizes resource usage and scheduling
- **Progress Tracking**: Monitors progress across parallel workstreams
- **Deadlock Prevention**: Implements deadlock detection and resolution
- **Inter-Agent Communication**: Facilitates communication between agents
- **Load Balancing**: Distributes workload optimally across available resources

## Available Commands

### Coordination Management
- `coordinate_parallel_tasks` - Coordinate multiple parallel tasks
  - Required: `tasks` (array), `agents` (array)
  - Optional: `resources` (object), `constraints` (object)
  - Returns: Coordination plan and execution schedule

- `register_agent` - Register an agent for coordination
  - Required: `agentId` (string), `capabilities` (array)
  - Optional: `resourceRequirements` (object), `preferences` (object)
  - Returns: Registration confirmation and agent status

- `unregister_agent` - Unregister an agent from coordination
  - Required: `agentId` (string)
  - Optional: `gracefulShutdown` (boolean)
  - Returns: Unregistration confirmation

### File Locking
- `acquire_file_lock` - Acquire lock on specific files
  - Required: `agentId` (string), `filePaths` (array)
  - Optional: `lockType` (string), `timeout` (number)
  - Returns: Lock acquisition status and lock details

- `release_file_lock` - Release file locks
  - Required: `agentId` (string), `lockIds` (array)
  - Optional: `forceRelease` (boolean)
  - Returns: Release confirmation and affected files

- `check_file_locks` - Check lock status of files
  - Required: `filePaths` (array)
  - Optional: `includeDetails` (boolean)
  - Returns: Current lock status and lock owners

### Resource Management
- `allocate_resources` - Allocate resources to agents
  - Required: `agentId` (string), `resourceRequest` (object)
  - Optional: `priority` (string), `duration` (number)
  - Returns: Resource allocation status and details

- `release_resources` - Release allocated resources
  - Required: `agentId` (string), `resourceIds` (array)
  - Optional: `forceRelease` (boolean)
  - Returns: Resource release confirmation

- `monitor_resources` - Monitor resource usage
  - Required: `resourceTypes` (array)
  - Optional: `timeRange` (object), `granularity` (string)
  - Returns: Resource usage statistics and trends

### Progress Tracking
- `update_progress` - Update task progress
  - Required: `agentId` (string), `taskId` (string), `progress` (object)
  - Optional: `metadata` (object)
  - Returns: Progress update confirmation

- `get_overall_progress` - Get overall coordination progress
  - Required: `coordinationId` (string)
  - Optional: `includeDetails` (boolean), `groupBy` (string)
  - Returns: Overall progress and individual agent status

### Deadlock Management
- `detect_deadlocks` - Detect potential deadlocks
  - Required: `agents` (array), `resources` (array)
  - Optional: `analysisDepth` (number)
  - Returns: Deadlock detection results and recommendations

- `resolve_deadlock` - Resolve detected deadlocks
  - Required: `deadlockId` (string), `resolutionStrategy` (string)
  - Optional: `priorityAgents` (array)
  - Returns: Deadlock resolution status and actions taken

## Usage Examples

### Coordinate Parallel Tasks
```typescript
// Coordinate multiple agents working on different files
const coordination = await coordinate_parallel_tasks({
  tasks: [
    {
      id: "task-1",
      description: "Update user authentication module",
      files: ["src/auth/user-service.ts", "src/auth/auth-middleware.ts"],
      agent: "CodeWriterAgent",
      estimatedDuration: 30,
      priority: "high"
    },
    {
      id: "task-2", 
      description: "Create user interface components",
      files: ["src/components/LoginForm.tsx", "src/components/UserProfile.tsx"],
      agent: "UIAgent",
      estimatedDuration: 45,
      priority: "medium"
    },
    {
      id: "task-3",
      description: "Write authentication tests",
      files: ["tests/auth.test.ts", "tests/integration/auth.test.ts"],
      agent: "TestVerificationAgent",
      estimatedDuration: 20,
      priority: "medium"
    }
  ],
  agents: [
    {
      id: "CodeWriterAgent",
      capabilities: ["file-modification", "code-generation"],
      maxConcurrentTasks: 2,
      resourceRequirements: { cpu: 2, memory: "4GB" }
    },
    {
      id: "UIAgent", 
      capabilities: ["ui-generation", "component-creation"],
      maxConcurrentTasks: 1,
      resourceRequirements: { cpu: 1, memory: "2GB" }
    },
    {
      id: "TestVerificationAgent",
      capabilities: ["test-generation", "test-execution"],
      maxConcurrentTasks: 3,
      resourceRequirements: { cpu: 1, memory: "1GB" }
    }
  ],
  resources: {
    totalCPU: 8,
    totalMemory: "16GB",
    availableAgents: 3
  },
  constraints: {
    maxConcurrentTasks: 3,
    fileConflictPrevention: true,
    resourceLimits: { cpu: 8, memory: "16GB" }
  }
})

// Returns:
// {
//   coordinationId: "coord-123",
//   schedule: [
//     {
//       startTime: "2024-01-10T10:00:00Z",
//       agent: "CodeWriterAgent",
//       tasks: ["task-1"],
//       allocatedResources: { cpu: 2, memory: "4GB" },
//       fileLocks: ["src/auth/user-service.ts", "src/auth/auth-middleware.ts"]
//     },
//     {
//       startTime: "2024-01-10T10:00:00Z", 
//       agent: "TestVerificationAgent",
//       tasks: ["task-3"],
//       allocatedResources: { cpu: 1, memory: "1GB" },
//       fileLocks: ["tests/auth.test.ts", "tests/integration/auth.test.ts"]
//     },
//     {
//       startTime: "2024-01-10T10:30:00Z",
//       agent: "UIAgent", 
//       tasks: ["task-2"],
//       allocatedResources: { cpu: 1, memory: "2GB" },
//       fileLocks: ["src/components/LoginForm.tsx", "src/components/UserProfile.tsx"]
//     }
//   ],
//   estimatedCompletion: "2024-01-10T11:15:00Z",
//   resourceUtilization: { cpu: 50, memory: 43.75 }
// }
```

### Acquire File Locks
```typescript
// Acquire locks for files to prevent conflicts
const locks = await acquire_file_lock({
  agentId: "CodeWriterAgent",
  filePaths: [
    "src/auth/user-service.ts",
    "src/auth/auth-middleware.ts"
  ],
  lockType: "exclusive",
  timeout: 300000 // 5 minutes
})

// Returns:
// {
//   success: true,
//   lockIds: [
//     {
//       id: "lock-abc123",
//       filePath: "src/auth/user-service.ts",
//       type: "exclusive",
//       acquiredAt: "2024-01-10T10:00:00Z",
//       expiresAt: "2024-01-10T10:05:00Z",
//       agentId: "CodeWriterAgent"
//     },
//     {
//       id: "lock-def456",
//       filePath: "src/auth/auth-middleware.ts", 
//       type: "exclusive",
//       acquiredAt: "2024-01-10T10:00:00Z",
//       expiresAt: "2024-01-10T10:05:00Z",
//       agentId: "CodeWriterAgent"
//     }
//   ],
//   totalFiles: 2
// }
```

### Detect and Resolve Deadlocks
```typescript
// Detect potential deadlocks in agent coordination
const deadlockDetection = await detect_deadlocks({
  agents: [
    {
      id: "Agent-A",
      waitingFor: ["file-2"],
      holding: ["file-1"],
      state: "waiting"
    },
    {
      id: "Agent-B",
      waitingFor: ["file-3"], 
      holding: ["file-2"],
      state: "waiting"
    },
    {
      id: "Agent-C",
      waitingFor: ["file-1"],
      holding: ["file-3"], 
      state: "waiting"
    }
  ],
  resources: [
    { id: "file-1", lockedBy: "Agent-A" },
    { id: "file-2", lockedBy: "Agent-B" },
    { id: "file-3", lockedBy: "Agent-C" }
  ],
  analysisDepth: 3
})

// Returns:
// {
//   deadlockDetected: true,
//   deadlockId: "deadlock-789",
//   cycle: ["Agent-A", "Agent-B", "Agent-C", "Agent-A"],
//   involvedResources: ["file-1", "file-2", "file-3"],
//   severity: "high",
//   recommendations: [
//     "Force release locks for Agent-C (lowest priority)",
//     "Implement timeout-based lock release",
//     "Use priority-based resource allocation"
//   ]
// }

// Resolve the deadlock
const resolution = await resolve_deadlock({
  deadlockId: "deadlock-789",
  resolutionStrategy: "priority-based",
  priorityAgents: ["Agent-A", "Agent-B", "Agent-C"]
})

// Returns:
// {
//   success: true,
//   actions: [
//     {
//       action: "force-release",
//       agent: "Agent-C",
//       resources: ["file-3"],
//       reason: "Lowest priority in deadlock cycle"
//     },
//     {
//       action: "notify",
//       agent: "Agent-A", 
//       message: "Resource file-1 now available"
//     },
//     {
//       action: "notify",
//       agent: "Agent-B",
//       message: "Resource file-2 now available"
//     }
//   ],
//   deadlockResolved: true,
//   resolutionTime: "2024-01-10T10:02:30Z"
// }
```

## Agent Configuration

- **Name**: ParallelTaskCoordinatorAgent
- **Mode**: subagent (specialized for coordination)
- **Permissions**: Read/write for coordination and resource management
- **Temperature**: 0.1 (consistent and predictable)
- **Top-P**: 0.9

## Coordination Strategies

### Priority-Based Coordination
- High-priority tasks get resources first
- Preemption of low-priority tasks
- Dynamic priority adjustment

### Round-Robin Coordination
- Fair resource distribution
- Equal opportunity for all agents
- Predictable scheduling

### Load-Balanced Coordination
- Distribute workload evenly
- Consider agent capabilities
- Optimize resource utilization

### Dependency-Aware Coordination
- Respect task dependencies
- Schedule dependent tasks sequentially
- Parallelize independent tasks

## File Locking Mechanisms

### Lock Types
- **Exclusive Lock**: Single agent access
- **Shared Lock**: Multiple read-only access
- **Intent Lock**: Intention to acquire exclusive lock
- **Upgrade Lock**: Upgrade from shared to exclusive

### Lock Granularity
- **File-level**: Lock entire files
- **Region-level**: Lock specific file regions
- **Directory-level**: Lock entire directories
- **Project-level**: Lock entire projects

### Lock Timeout Strategies
- **Fixed Timeout**: Predetermined lock duration
- **Adaptive Timeout**: Dynamic timeout based on task complexity
- **Exponential Backoff**: Increasing timeout for retries
- **Priority-based Timeout**: Longer timeouts for high-priority tasks

## Deadlock Prevention

### Prevention Strategies
- **Resource Ordering**: Acquire resources in predefined order
- **Timeout Mechanisms**: Automatic lock release on timeout
- **Preemption**: Force release for higher priority tasks
- **Banker's Algorithm**: Safe resource allocation

### Detection Algorithms
- **Wait-for Graph**: Analyze resource waiting relationships
- **Cycle Detection**: Identify circular wait conditions
- **Resource Allocation Graph**: Track resource allocation state
- **Timeout-based Detection**: Detect long-running waits

## Resource Management

### Resource Types
- **CPU**: Processing power allocation
- **Memory**: RAM allocation and usage
- **Storage**: Disk space and I/O operations
- **Network**: Bandwidth and connection management
- **Licenses**: Software license management

### Allocation Strategies
- **Static Allocation**: Pre-allocated resources
- **Dynamic Allocation**: On-demand resource allocation
- **Shared Allocation**: Resources shared between agents
- **Dedicated Allocation**: Exclusive resource assignment

## Integration Points

- **Agent Registry**: Central agent registration and discovery
- **File System**: File locking and monitoring
- **Resource Monitor**: System resource tracking
- **Notification System**: Agent communication and alerts
- **Audit System**: Coordination event logging

## Error Handling

The agent provides comprehensive error handling:
- Lock acquisition failures with retry logic
- Resource allocation conflicts
- Agent communication failures
- Deadlock resolution failures
- System resource exhaustion

## Performance Optimization

- **Parallel Processing**: Maximize concurrent execution
- **Resource Pooling**: Efficient resource reuse
- **Caching**: Cache coordination state and decisions
- **Batch Operations**: Batch multiple coordination operations
- **Predictive Scheduling**: Predict resource needs

## Security Considerations

- **Access Control**: Verify agent permissions
- **Resource Isolation**: Prevent resource interference
- **Audit Logging**: Log all coordination activities
- **Secure Communication**: Encrypted agent communication
- **Privilege Escalation**: Controlled privilege elevation

## Monitoring and Analytics

### Coordination Metrics
- Task completion rates
- Average coordination time
- Resource utilization efficiency
- Deadlock frequency and resolution time

### Performance Metrics
- Agent throughput
- Lock contention rates
- Resource allocation efficiency
- Inter-agent communication latency

## Dependencies

- `@opencode-ai/plugin` - OpenCode plugin framework
- File system monitoring libraries
- Resource management and monitoring tools
- Inter-process communication libraries
- Lock management and deadlock detection algorithms

## Configuration Options

### Coordination Policies
- Default coordination strategy
- Resource allocation rules
- Lock timeout settings
- Deadlock resolution preferences

### Performance Tuning
- Maximum concurrent tasks
- Resource limits and thresholds
- Lock granularity settings
- Communication protocols

## Testing

The agent includes comprehensive test coverage:
- Unit tests for coordination logic
- Integration tests with multiple agents
- Deadlock detection and resolution tests
- Performance and load tests
- Security and permission tests

## Best Practices

### Coordination Guidelines
- Minimize lock holding time
- Use appropriate lock granularity
- Implement proper timeout handling
- Design for fault tolerance

### Resource Management
- Monitor resource usage continuously
- Implement resource quotas
- Plan for resource contention
- Optimize resource allocation

### Deadlock Prevention
- Follow consistent resource ordering
- Implement timeout mechanisms
- Design for lock-free operations when possible
- Monitor for deadlock indicators