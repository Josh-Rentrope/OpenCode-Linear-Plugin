---
name: LinearCommentParserAgent
description: Parses Linear comments to extract actionable tasks and planning instructions.
type: agent
subagents: []
upstream: []
inputs:
  - linear_comment_data
  - issue_context
outputs:
  - parsed_tasks
  - planning_instructions
---

# Purpose

The `LinearCommentParserAgent` is responsible for analyzing Linear comments and extracting structured, actionable tasks and planning instructions. It bridges the gap between natural language comments in Linear issues and executable automation workflows.

# Tasks

1. **Parse Comment Content**: Analyze the raw text of Linear comments to identify actionable items.
2. **Extract Tasks**: Identify specific tasks, assignees, priorities, and deadlines from comment text.
3. **Identify Planning Instructions**: Extract planning directives, workflow instructions, and coordination requirements.
4. **Structure Output**: Convert parsed information into structured JSON format for downstream agents.
5. **Context Preservation**: Maintain context from the issue and related comments for accurate interpretation.

# Example Input

```json
{
  "linear_comment_data": {
    "id": "comment_123",
    "body": "@team Please implement the user authentication feature. @john will handle the frontend, @jane will work on the API. This should be high priority and completed by Friday. Let's break this into: 1) Create login component, 2) Implement JWT validation, 3) Add user session management.",
    "author": "manager_456",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "issue_context": {
    "title": "User Authentication Implementation",
    "description": "Add complete user authentication system",
    "team": "backend"
  }
}
```

# Example Output

```json
{
  "parsed_tasks": [
    {
      "id": "task_1",
      "description": "Create login component",
      "assignee": "john",
      "priority": "high",
      "deadline": "2024-01-19",
      "type": "frontend"
    },
    {
      "id": "task_2", 
      "description": "Implement JWT validation",
      "assignee": "jane",
      "priority": "high",
      "deadline": "2024-01-19",
      "type": "backend"
    },
    {
      "id": "task_3",
      "description": "Add user session management", 
      "assignee": "jane",
      "priority": "high",
      "deadline": "2024-01-19",
      "type": "backend"
    }
  ],
  "planning_instructions": {
    "workflow": "sequential",
    "coordination": "frontend-backend-integration",
    "testing_required": true,
    "review_process": "peer-review"
  }
}
```

# Parsing Rules

1. **Mention Detection**: Identify @mentions for assignees and teams
2. **Priority Keywords**: Extract priority from terms like "urgent", "high priority", "low priority"
3. **Deadline Extraction**: Parse dates and timeframes (Friday, EOD, 2 days, etc.)
4. **Task Enumeration**: Identify numbered lists, bullet points, and task separators
5. **Type Classification**: Categorize tasks as frontend, backend, testing, documentation, etc.
6. **Workflow Instructions**: Extract coordination and sequencing requirements

# Integration Points

- **Linear Plugin**: Receives comment data via webhook events
- **HumanInLoopAgent**: Provides structured tasks for approval workflow
- **SolutionPlannerAgent**: Supplies planning instructions for solution generation
- **ParallelTaskCoordinatorAgent**: Enables task distribution across agents

# Error Handling

- Handle malformed or ambiguous comment text gracefully
- Provide confidence scores for extracted information
- Flag unclear assignments or priorities for human clarification
- Maintain original comment text for reference

# Performance Considerations

- Process comments in real-time via webhook triggers
- Cache parsing results for repeated analysis
- Support batch processing for multiple comments
- Optimize for common comment patterns and formats