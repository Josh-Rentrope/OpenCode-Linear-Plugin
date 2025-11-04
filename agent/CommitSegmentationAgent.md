# CommitSegmentationAgent - OpenCode Agent for Atomic Commit Management

## Overview

CommitSegmentationAgent is a specialized OpenCode agent that breaks down large code changes into distinct, reviewable commits. It analyzes code modifications, groups related changes logically, and ensures each commit is atomic, testable, and follows best practices.

## Features

- **Atomic Commits**: Creates small, focused commits with single logical changes
- **Logical Grouping**: Groups related file changes together intelligently
- **Dependency Analysis**: Manages commit sequencing and dependencies
- **Rollback Support**: Enables easy rollback of individual commits
- **Git Integration**: Seamlessly integrates with git workflow and hooks
- **Quality Assurance**: Ensures each commit is testable and reviewable
- **Conflict Prevention**: Minimizes merge conflicts through smart segmentation

## Available Commands

### Commit Analysis
- `analyze_changes` - Analyze code changes for segmentation
  - Required: `changedFiles` (array), `diffContent` (string)
  - Optional: `context` (object), `rules` (object)
  - Returns: Segmentation analysis and recommendations

- `group_related_changes` - Group related file changes
  - Required: `fileChanges` (array)
  - Optional: `groupingStrategy` (string), `customRules` (array)
  - Returns: Logical groupings with rationale

### Commit Creation
- `create_atomic_commits` - Create atomic commits from changes
  - Required: `segmentedChanges` (array), `baseBranch` (string)
  - Optional: `commitPrefix` (string), `authorInfo` (object)
  - Returns: Created commit information and status

- `generate_commit_message` - Generate standardized commit messages
  - Required: `changes` (object), `messageStyle` (string)
  - Optional: `template` (string), `metadata` (object)
  - Returns: Formatted commit message following conventions

### Dependency Management
- `analyze_dependencies` - Analyze commit dependencies
  - Required: `commits` (array), `codebase` (object)
  - Optional: `dependencyType` (string)
  - Returns: Dependency graph and sequencing requirements

- `validate_sequence` - Validate commit sequence correctness
  - Required: `commitSequence` (array), `expectedOrder` (array)
  - Returns: Validation result with issues and suggestions

### Rollback Management
- `create_rollback_plan` - Create rollback plan for commits
  - Required: `commits` (array), `targetState` (string)
  - Optional: `rollbackStrategy` (string)
  - Returns: Rollback steps and risk assessment

- `execute_rollback` - Execute rollback of specific commits
  - Required: `commitIds` (array), `reason` (string)
  - Optional: `dryRun` (boolean)
  - Returns: Rollback execution status and results

## Usage Examples

### Analyze Changes for Segmentation
```typescript
// Analyze code changes for optimal segmentation
const analysis = await analyze_changes({
  changedFiles: [
    {
      path: "src/auth/user-service.ts",
      changes: "Added user authentication logic",
      type: "modified"
    },
    {
      path: "src/auth/auth-middleware.ts", 
      changes: "Updated middleware for new auth flow",
      type: "modified"
    },
    {
      path: "tests/auth.test.ts",
      changes: "Added tests for authentication",
      type: "added"
    },
    {
      path: "docs/api.md",
      changes: "Updated API documentation",
      type: "modified"
    }
  ],
  diffContent: "--- a/src/auth/user-service.ts\n+++ b/src/auth/user-service.ts\n...",
  context: {
    feature: "User Authentication",
    branch: "feature/user-auth",
    targetBranch: "main"
  },
  rules: {
    maxFilesPerCommit: 3,
    maxChangesPerCommit: 100,
    requireTests: true
  }
})

// Returns:
// {
//   segments: [
//     {
//       id: "segment-1",
//       description: "Implement user authentication service",
//       files: ["src/auth/user-service.ts", "src/auth/auth-middleware.ts"],
//       changes: 45,
//       dependencies: [],
//       priority: "high",
//       testable: true
//     },
//     {
//       id: "segment-2", 
//       description: "Add authentication tests",
//       files: ["tests/auth.test.ts"],
//       changes: 25,
//       dependencies: ["segment-1"],
//       priority: "medium",
//       testable: true
//     },
//     {
//       id: "segment-3",
//       description: "Update API documentation",
//       files: ["docs/api.md"],
//       changes: 15,
//       dependencies: [],
//       priority: "low",
//       testable: false
//     }
//   ],
//   recommendations: [
//     "Consider splitting segment-1 into smaller commits",
//     "Add integration tests for segment-2"
//   ]
// }
```

### Create Atomic Commits
```typescript
// Create atomic commits from segmented changes
const commits = await create_atomic_commits({
  segmentedChanges: [
    {
      id: "segment-1",
      files: ["src/auth/user-service.ts"],
      changes: "Added user authentication logic",
      commitMessage: "feat: add user authentication service"
    },
    {
      id: "segment-2", 
      files: ["src/auth/auth-middleware.ts"],
      changes: "Updated auth middleware",
      commitMessage: "feat: update middleware for new auth flow"
    }
  ],
  baseBranch: "main",
  commitPrefix: "feature/auth",
  authorInfo: {
    name: "John Doe",
    email: "john.doe@company.com"
  }
})

// Returns:
// {
//   commits: [
//     {
//       id: "commit-abc123",
//       hash: "abc123def456",
//       message: "feat: add user authentication service",
//       files: ["src/auth/user-service.ts"],
//       timestamp: "2024-01-10T10:30:00Z",
//       status: "created"
//     },
//     {
//       id: "commit-def456",
//       hash: "def456ghi789", 
//       message: "feat: update middleware for new auth flow",
//       files: ["src/auth/auth-middleware.ts"],
//       timestamp: "2024-01-10T10:31:00Z",
//       status: "created"
//     }
//   ],
//   branch: "feature/auth",
//   totalCommits: 2
// }
```

### Generate Commit Messages
```typescript
// Generate standardized commit messages
const messages = await generate_commit_message({
  changes: {
    type: "feature",
    description: "Add user authentication with JWT tokens",
    files: ["src/auth/jwt-service.ts", "src/middleware/auth.ts"],
    breaking: false,
    scope: "auth"
  },
  messageStyle: "conventional",
  template: "{type}({scope}): {description}",
  metadata: {
    issue: "TICKET-123",
    author: "john.doe"
  }
})

// Returns:
// {
//   message: "feat(auth): add user authentication with JWT tokens",
//   body: "Implements JWT-based authentication service\n\n- Add JWT token generation\n- Implement token validation middleware\n- Add refresh token support\n\nCloses TICKET-123",
//   metadata: {
//     type: "feat",
//     scope: "auth",
//     breaking: false,
//     issue: "TICKET-123"
//   }
// }
```

### Create Rollback Plan
```typescript
// Create rollback plan for commits
const rollback = await create_rollback_plan({
  commits: [
    {
      id: "commit-abc123",
      hash: "abc123def456",
      message: "feat: add user authentication",
      files: ["src/auth/user-service.ts"]
    },
    {
      id: "commit-def456", 
      hash: "def456ghi789",
      message: "feat: update auth middleware",
      files: ["src/auth/auth-middleware.ts"]
    }
  ],
  targetState: "stable-release-v1.2",
  rollbackStrategy: "reverse-order"
})

// Returns:
// {
//   plan: [
//     {
//       step: 1,
//       action: "revert",
//       commit: "commit-def456",
//       reason: "Remove auth middleware changes",
//       risk: "low"
//     },
//     {
//       step: 2,
//       action: "revert", 
//       commit: "commit-abc123",
//       reason: "Remove user authentication service",
//       risk: "medium"
//     }
//   ],
//   riskAssessment: {
//     overall: "medium",
//     factors: ["Database schema changes", "API compatibility"],
//   recommendations: [
//     "Test rollback in staging environment",
//     "Notify users of potential downtime"
//   ]
// }
```

## Agent Configuration

- **Name**: CommitSegmentationAgent
- **Mode**: subagent (specialized for commit management)
- **Permissions**: Read/write for git operations
- **Temperature**: 0.1 (consistent and predictable)
- **Top-P**: 0.9

## Segmentation Strategies

### File-Based Segmentation
- Group changes by file type and location
- Separate frontend/backend changes
- Group related configuration files

### Feature-Based Segmentation
- Group changes by feature or functionality
- Maintain feature coherence
- Separate independent features

### Risk-Based Segmentation
- High-risk changes in separate commits
- Low-risk changes can be grouped
- Prioritize rollback capability

### Dependency-Based Segmentation
- Respect code dependencies
- Ensure buildable intermediate states
- Maintain test coverage

## Commit Message Conventions

### Conventional Commits
```
feat(scope): add new feature
fix(scope): bug fix description  
docs(scope): documentation update
style(scope): code formatting changes
refactor(scope): code refactoring
test(scope): add or update tests
chore(scope): maintenance tasks
```

### Custom Templates
- Company-specific formats
- Project-specific requirements
- Integration with issue trackers

## Quality Assurance

### Commit Validation
- Atomicity checks
- Buildability verification
- Test coverage requirements
- Code quality standards

### Automated Testing
- Unit test execution
- Integration test validation
- Performance impact assessment
- Security vulnerability scanning

## Integration Points

- **Git Operations**: Direct git command execution
- **CI/CD Pipeline**: Integration with build systems
- **Code Review**: Integration with review tools
- **Issue Tracking**: Link commits to issues/tickets
- **Notification Systems**: Commit status notifications

## Error Handling

The agent provides comprehensive error handling:
- Git operation failures with recovery suggestions
- Merge conflict detection and resolution
- Permission and access errors
- Network and system failures
- Data corruption prevention

## Performance Optimization

- **Parallel Processing**: Analyze multiple files concurrently
- **Incremental Analysis**: Only analyze changed files
- **Caching**: Cache analysis results
- **Batch Operations**: Batch git operations for efficiency

## Security Considerations

- **Access Control**: Verify git repository permissions
- **Code Scanning**: Scan for sensitive data in commits
- **Audit Trail**: Log all commit operations
- **Branch Protection**: Respect branch protection rules

## Monitoring and Analytics

### Commit Metrics
- Average commit size
- Commit frequency
- Rollback rates
- Merge conflict frequency

### Quality Metrics
- Test coverage per commit
- Code review turnaround time
- Build success rate
- Rollback success rate

## Dependencies

- `@opencode-ai/plugin` - OpenCode plugin framework
- Git client libraries for repository operations
- Code analysis tools for change detection
- Testing frameworks for validation
- CI/CD integration libraries

## Configuration Options

### Segmentation Rules
- Maximum files per commit
- Maximum lines of code per commit
- Required test coverage
- Custom grouping rules

### Git Configuration
- Commit author information
- Branch naming conventions
- Merge strategies
- Hook configurations

## Testing

The agent includes comprehensive test coverage:
- Unit tests for segmentation logic
- Integration tests with git operations
- Performance tests for large codebases
- Security and permission tests
- Rollback procedure tests

## Best Practices

### Commit Guidelines
- One logical change per commit
- Descriptive commit messages
- Include tests with functionality
- Document breaking changes

### Segmentation Guidelines
- Keep commits focused and small
- Maintain buildable intermediate states
- Consider rollback scenarios
- Respect code dependencies

### Rollback Guidelines
- Test rollback procedures
- Document rollback reasons
- Communicate rollback impact
- Verify system stability after rollback