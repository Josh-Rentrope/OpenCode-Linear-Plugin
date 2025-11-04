---
name: ParallelTaskCoordinatorAgent
description: Manages multiple agents working on different files simultaneously.
type: agent
subagents: []
upstream:
  - CommitSegmentationAgent
  - HumanInLoopAgent
inputs:
  - commit_segments
  - available_agents
  - resource_constraints
outputs:
  - execution_plan
  - resource_allocation
---

# Purpose

The `ParallelTaskCoordinatorAgent` orchestrates multiple agents working concurrently on different files while preventing conflicts and optimizing resource utilization. It manages file locking, resource allocation, and inter-agent communication to ensure safe parallel execution.

# Tasks

1. **Analyze Execution Requirements**: Examine commit segments and determine parallel execution possibilities.
2. **Manage File Locking**: Implement file locking to prevent concurrent modifications.
3. **Allocate Resources**: Distribute agents and system resources optimally.
4. **Coordinate Communication**: Handle inter-agent messaging and synchronization.
5. **Monitor Progress**: Track execution status and handle conflicts or failures.

# Example Input

```json
{
  "commit_segments": [
    {
      "id": "commit_1",
      "files": ["src/models/User.ts"],
      "dependencies": [],
      "estimated_time": "15 minutes"
    },
    {
      "id": "commit_2", 
      "files": ["src/services/AuthService.ts"],
      "dependencies": ["commit_1"],
      "estimated_time": "30 minutes"
    },
    {
      "id": "commit_3",
      "files": ["src/components/LoginForm.tsx"],
      "dependencies": ["commit_1"],
      "estimated_time": "25 minutes"
    }
  ],
  "available_agents": [
    {
      "id": "agent_1",
      "type": "CodeWriterAgent",
      "status": "available",
      "capabilities": ["typescript", "react", "node"]
    },
    {
      "id": "agent_2", 
      "type": "TestWriterAgent",
      "status": "available",
      "capabilities": ["jest", "testing"]
    }
  ],
  "resource_constraints": {
    "max_concurrent_agents": 3,
    "memory_limit": "4GB",
    "cpu_limit": "80%"
  }
}
```

# Example Output

```json
{
  "execution_plan": {
    "phases": [
      {
        "id": "phase_1",
        "parallel_tasks": [
          {
            "task_id": "commit_1",
            "agent_id": "agent_1",
            "files": ["src/models/User.ts"],
            "estimated_duration": "15 minutes",
            "priority": "high"
          }
        ],
        "duration": "15 minutes"
      },
      {
        "id": "phase_2", 
        "parallel_tasks": [
          {
            "task_id": "commit_2",
            "agent_id": "agent_1",
            "files": ["src/services/AuthService.ts"],
            "estimated_duration": "30 minutes",
            "priority": "high"
          },
          {
            "task_id": "commit_3",
            "agent_id": "agent_2",
            "files": ["src/components/LoginForm.tsx"],
            "estimated_duration": "25 minutes",
            "priority": "medium"
          }
        ],
        "duration": "30 minutes"
      }
    ],
    "total_duration": "45 minutes",
    "parallel_efficiency": "67%"
  },
  "resource_allocation": {
    "file_locks": {
      "src/models/User.ts": { "locked_by": "agent_1", "expires_at": "2024-01-15T10:15:00Z" },
      "src/services/AuthService.ts": { "locked_by": "agent_1", "expires_at": "2024-01-15T10:45:00Z" },
      "src/components/LoginForm.tsx": { "locked_by": "agent_2", "expires_at": "2024-01-15T10:40:00Z" }
    },
    "agent_assignments": {
      "agent_1": ["commit_1", "commit_2"],
      "agent_2": ["commit_3"]
    }
  }
}
```

# Coordination Strategies

## File Locking
- **Exclusive Locks**: Prevent concurrent modifications to same file
- **Read Locks**: Allow multiple readers but block writers
- **Lock Timeouts**: Automatic release after reasonable time
- **Deadlock Detection**: Identify and resolve circular dependencies

## Resource Allocation
- **Agent Matching**: Assign tasks based on agent capabilities
- **Load Balancing**: Distribute work evenly across available agents
- **Priority Scheduling**: Prioritize critical path tasks
- **Resource Monitoring**: Track CPU, memory, and I/O usage

## Communication Protocols
- **Event Broadcasting**: Notify agents of relevant events
- **Status Updates**: Regular progress reporting
- **Conflict Resolution**: Handle competing resource requests
- **Failure Recovery**: Manage agent failures and retries

# Conflict Resolution

## File Conflicts
- Detect concurrent file access attempts
- Queue conflicting operations
- Implement priority-based resolution
- Provide conflict notifications

## Resource Contention
- Monitor resource utilization
- Implement fair scheduling algorithms
- Handle resource exhaustion gracefully
- Scale operations based on availability

# Performance Optimization

## Parallel Execution
- Identify independent tasks
- Maximize concurrent operations
- Minimize synchronization overhead
- Optimize task granularity

## Caching Strategy
- Cache file states and dependencies
- Share computation results between agents
- Invalidate cache on file changes
- Optimize memory usage

# Integration Points

- **CommitSegmentationAgent**: Receives segmented commits for coordination
- **HumanInLoopAgent**: Reports progress and requests approval for conflicts
- **File System**: Manages file locks and access control
- **Agent Manager**: Coordinates agent lifecycle and capabilities

# Error Handling

- Handle agent failures gracefully
- Implement retry mechanisms with exponential backoff
- Maintain system consistency during errors
- Provide detailed error reporting and recovery options

# Monitoring and Metrics

- Track execution progress and performance
- Monitor resource utilization
- Measure parallel efficiency
- Generate execution reports and analytics