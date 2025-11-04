# LinearCommentParserAgent - OpenCode Agent for Comment Analysis

## Overview

LinearCommentParserAgent is a specialized OpenCode agent that extracts actionable tasks and requirements from Linear comments. It analyzes comment content to identify specific tasks, assignees, priorities, and dependencies that can be processed by other agents in the OpenCode ecosystem.

## Features

- **Comment Analysis**: Parses Linear comments for actionable items
- **Task Extraction**: Identifies specific tasks with requirements
- **Priority Detection**: Extracts priority levels from comment content
- **Assignee Recognition**: Identifies mentioned users and assignees
- **Dependency Mapping**: Finds task dependencies and relationships
- **Format Support**: Handles various comment formats (Markdown, plain text)
- **Context Awareness**: Maintains context across multiple comments

## Available Commands

### Comment Analysis
- `parse_comment` - Parse a single Linear comment for tasks
  - Required: `commentBody` (string)
  - Optional: `issueContext` (object) - Issue metadata for context
  - Returns: Extracted tasks, assignees, priorities, dependencies

- `parse_issue_comments` - Parse all comments on a Linear issue
  - Required: `issueId` (string)
  - Optional: `includeResolved` (boolean) - Include resolved comments
  - Returns: Consolidated task list from all comments

### Task Management
- `extract_tasks` - Extract actionable tasks from comment text
  - Required: `text` (string)
  - Optional: `format` (string) - Output format (json, markdown, plain)
  - Returns: Structured task list with metadata

- `validate_task` - Validate extracted task for completeness
  - Required: `task` (object)
  - Returns: Validation result with missing elements

### Context Analysis
- `analyze_dependencies` - Find task dependencies in comments
  - Required: `comments` (array)
  - Returns: Dependency graph and relationships

- `get_assignee_suggestions` - Suggest assignees based on comment content
  - Required: `commentBody` (string)
  - Optional: `teamMembers` (array) - Available team members
  - Returns: Suggested assignees with confidence scores

## Usage Examples

### Parse a Single Comment
```typescript
// Parse comment for tasks
const result = await parse_comment({
  commentBody: "@john please implement the auth module by Friday. High priority. Depends on API design.",
  issueContext: {
    id: "ISSUE-123",
    title: "User Authentication System"
  }
})

// Returns:
// {
//   tasks: [
//     {
//       description: "implement the auth module",
//       assignee: "john",
//       priority: "high",
//       deadline: "Friday",
//       dependencies: ["API design"]
//     }
//   ],
//   metadata: {
//     taskCount: 1,
//     hasAssignees: true,
//     hasPriorities: true,
//     hasDependencies: true
//   }
// }
```

### Extract Tasks from Text
```typescript
const tasks = await extract_tasks({
  text: `
  TODO: Add user login form
  - Email field validation
  - Password strength checker
  - Remember me checkbox
  
  @sarah to review by next week
  Priority: Medium
  `,
  format: "json"
})
```

### Analyze Dependencies
```typescript
const dependencies = await analyze_dependencies({
  comments: [
    "Need to finish database schema before API endpoints",
    "API endpoints depend on auth service completion",
    "Frontend integration needs API documentation"
  ]
})
```

## Agent Configuration

- **Name**: LinearCommentParserAgent
- **Mode**: subagent (specialized for comment analysis)
- **Permissions**: Read-only for Linear comments
- **Temperature**: 0.3 (balanced creativity and accuracy)
- **Top-P**: 0.8

## Task Recognition Patterns

The agent recognizes various task indicators:

### Task Keywords
- TODO, FIXME, HACK, NOTE
- "need to", "should", "must"
- "implement", "create", "add", "fix"
- "review", "test", "document"

### Priority Indicators
- High: "urgent", "asap", "critical", "high priority"
- Medium: "medium priority", "normal", "standard"
- Low: "low priority", "nice to have", "when possible"

### Deadline Patterns
- "by Friday", "this week", "next sprint"
- "EOD", "EOB", "COB"
- Specific dates: "2024-01-15", "Jan 15"

### Assignee Patterns
- @mentions: @username, @team
- Direct assignment: "John will handle", "assigned to Sarah"
- Team references: "frontend team", "backend squad"

## Integration Points

- **Linear Plugin**: Uses Linear API to fetch comments
- **Task Management**: Integrates with task tracking systems
- **Team Management**: Connects with user/team directories
- **Notification Systems**: Triggers notifications for assigned tasks

## Error Handling

The agent provides comprehensive error handling:
- Invalid comment formats with helpful suggestions
- Missing context with required field indicators
- Network errors with retry logic
- Permission errors with clear guidance

## Performance Considerations

- **Batch Processing**: Processes multiple comments efficiently
- **Caching**: Caches parsed results for repeated analysis
- **Rate Limiting**: Respects Linear API rate limits
- **Incremental Parsing**: Only processes new/changed comments

## Dependencies

- `@opencode-ai/plugin` - OpenCode plugin framework
- `@linear/sdk` - Linear SDK for API operations
- Natural language processing libraries for text analysis
- Pattern matching libraries for task extraction

## Output Formats

The agent supports multiple output formats:

### JSON Format
```json
{
  "tasks": [...],
  "metadata": {...},
  "confidence": 0.95
}
```

### Markdown Format
```markdown
## Extracted Tasks

### Task 1: Implement auth module
- **Assignee**: @john
- **Priority**: High
- **Deadline**: Friday
- **Dependencies**: API design
```

### Plain Text Format
```
Task: Implement auth module
Assignee: john
Priority: High
Deadline: Friday
Dependencies: API design
```

## Testing

The agent includes comprehensive test coverage:
- Unit tests for task extraction patterns
- Integration tests with Linear API
- Performance tests for large comment sets
- Edge case handling tests

## Monitoring

- Parse success/failure rates
- Task extraction accuracy metrics
- Performance benchmarks
- Error pattern analysis