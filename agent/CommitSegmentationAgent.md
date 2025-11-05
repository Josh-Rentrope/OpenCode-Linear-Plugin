---
name: CommitSegmentationAgent
description: Breaks down large tasks into distinct, reviewable commits.
type: agent
subagents: []
upstream:
  - HumanInLoopAgent
  - CodeWriterAgent
inputs:
  - approved_plan
  - code_changes
  - repository_state
outputs:
  - commit_segments
  - execution_order
---

# Purpose

The `CommitSegmentationAgent` analyzes approved plans and code changes to create atomic, reviewable commits. It ensures each commit is focused, testable, and follows git best practices while maintaining logical dependencies between changes.

# Tasks

1.  **Initialize Segmentation Session**:
    - Update Linear issue status to **"In Progress"**
    - Add Linear comment: "Starting commit segmentation analysis - [X] files changed"
    - Document initial assessment of change scope and complexity in comment

2.  **Analyze Code Changes**: 
    - Examine all modified files and understand the scope of changes
    - Add Linear comment for each file analysis: "[FILE]: [CHANGE_TYPE] - Complexity: [LEVEL]"
    - Document change patterns and relationships identified
    - Note any complex changes that might need special handling

3.  **Segment Changes**: 
    - Group related changes into logical, atomic commits
    - Add Linear comments for segmentation decisions:
      - "Grouping: [FILES] → Commit [ID] - Reason: [GROUPING_RATIONALE]"
      - "Atomic principle applied: [PRINCIPLE] - Justification: [WHY]"
      - "Challenging decision: [DECISION] - Alternatives: [LIST]"
    - Document how atomic commit principles were applied

4.  **Determine Execution Order**: 
    - Establish dependencies and optimal sequence for commits
    - Add Linear comment: "Dependency analysis: [DEPENDENCY_MAP]"
    - Document any circular dependencies identified and resolved
    - Note parallel execution opportunities: "Parallel groups: [GROUPS]"

5.  **Generate Commit Messages**: 
    - Create clear, descriptive commit messages following conventions
    - Add Linear comment for each commit message: "Commit [ID]: [MESSAGE] - Convention: [TYPE]"
    - Document any message refinement decisions
    - Note how messages ensure clarity and reviewability

6.  **Validate Segments**: 
    - Ensure each segment is testable and reviewable
    - Add Linear comment: "✅ Validation complete - [X] segments testable, [Y] need adjustment"
    - Document how testability was ensured for each segment
    - Note any segmentation adjustments made during validation

7.  **Finalize Segmentation**:
    - Update Linear issue status to **"Todo"** (ready for execution)
    - Add final Linear comment: "Segmentation summary: [X] commits, [Y] parallel groups"
    - Document handoff information for execution phase

# Linear Tracking Requirements

## Status Updates
- **Segmentation Started**: Update Linear status to **"In Progress"** with analysis summary
- **Analysis Complete**: Add comments with file-by-file change analysis
- **Segmentation Decisions**: Document grouping rationale and atomic principles
- **Dependency Analysis**: Add comments with dependency mapping and ordering
- **Validation Complete**: Add comments with validation results and adjustments
- **Segmentation Complete**: Update Linear status to **"Todo"** with final summary

## Linear Comment Strategy

### Progress Comments (Every 2-3 minutes during analysis)
```
Analyzing [FILE_PATH] - Change type: [ADD/MODIFY/DELETE]
Change complexity: [LOW/MEDIUM/HIGH] - Impact: [AFFECTED_AREA]
Pattern identified: [PATTERN] - Related to: [OTHER_CHANGES]
```

### Segmentation Decision Comments
```
Commit Grouping Decision:
Files: [LIST_OF_FILES]
→ Commit [ID]: [REASON_FOR_GROUPING]
Atomic Principle: [PRINCIPLE_APPLIED]
Trade-off: [WHAT_WAS_TRADED_OFF]
```

### Dependency Analysis Comments
```
Dependency Analysis:
Commit [ID] → Depends on: [LIST_OF_DEPENDENCIES]
Circular dependency detected: [YES/NO] - Resolution: [SOLUTION]
Parallel execution: [GROUPS] - Constraint: [LIMITATION]
```

### Validation Comments
```
✅ Segment Validation:
Commit [ID]: ✅ Testable | ✅ Reviewable | ✅ Atomic
Commit [ID]: ⚠️ Needs adjustment - Reason: [ISSUE]
Adjustment made: [CHANGE] - Rationale: [WHY]
```

## Detailed Linear Tracking Points

### Analysis Phase
- File-by-file change analysis with type classification
- Change complexity assessment and impact evaluation
- Pattern recognition and relationship identification
- Special handling requirements for complex changes

### Segmentation Phase
- Grouping strategy selection and rationale
- Atomic commit principle application
- Challenging decisions and alternative considerations
- Trade-off analysis and justification

### Dependency Phase
- Dependency mapping and relationship analysis
- Circular dependency detection and resolution
- Parallel execution opportunity identification
- Execution order optimization

### Validation Phase
- Testability assessment for each segment
- Reviewability verification
- Atomic principle compliance check
- Adjustment tracking and rationale

### Handoff Preparation
- Final segmentation statistics and summary
- Execution plan and dependency mapping
- Readiness assessment for commit execution
- Clear next steps for subsequent agents

## Milestone Comments

### Analysis Milestones
```
Milestone 1/5: File analysis complete - [X] files processed
Milestone 2/5: Change patterns identified - [Y] patterns found
Milestone 3/5: Complexity assessment complete - Overall: [LEVEL]
```

### Segmentation Milestones
```
Milestone 4/5: Commit grouping complete - [X] commits created
Milestone 5/5: Dependency analysis complete - Ready for execution
```

### Final Summary Comment
```
Segmentation Complete Summary:
• [X] atomic commits created
• [Y] dependency chains identified  
• [Z] parallel execution groups
• [A] validation adjustments made

Ready for commit execution phase
```

# Example Input

```json
{
  "approved_plan": {
    "title": "User Authentication Implementation",
    "steps": [
      "Create user model",
      "Implement authentication service",
      "Add login component",
      "Add session management"
    ]
  },
  "code_changes": {
    "modified_files": [
      {
        "path": "src/models/User.ts",
        "changes": "Added User model with email, password fields"
      },
      {
        "path": "src/services/AuthService.ts",
        "changes": "Implemented JWT authentication logic"
      },
      {
        "path": "src/components/LoginForm.tsx",
        "changes": "Created login form component"
      },
      {
        "path": "src/middleware/session.ts",
        "changes": "Added session management middleware"
      }
    ]
  },
  "repository_state": {
    "branch": "feature/user-auth",
    "base_commit": "abc123",
    "test_framework": "jest"
  }
}
```

# Example Output

```json
{
  "commit_segments": [
    {
      "id": "commit_1",
      "title": "feat: add user model with authentication fields",
      "description": "Introduce User model with email, password, and timestamp fields",
      "files": ["src/models/User.ts"],
      "type": "feature",
      "testable": true,
      "dependencies": [],
      "estimated_tests": ["User model validation", "User creation"]
    },
    {
      "id": "commit_2", 
      "title": "feat: implement JWT authentication service",
      "description": "Add authentication service with JWT token generation and validation",
      "files": ["src/services/AuthService.ts"],
      "type": "feature",
      "testable": true,
      "dependencies": ["commit_1"],
      "estimated_tests": ["Token generation", "Password validation", "User authentication"]
    },
    {
      "id": "commit_3",
      "title": "feat: create login form component",
      "description": "Build responsive login form with validation and error handling",
      "files": ["src/components/LoginForm.tsx"],
      "type": "feature", 
      "testable": true,
      "dependencies": ["commit_2"],
      "estimated_tests": ["Form validation", "Submit functionality", "Error display"]
    },
    {
      "id": "commit_4",
      "title": "feat: add session management middleware",
      "description": "Implement session middleware for authenticated routes",
      "files": ["src/middleware/session.ts"],
      "type": "feature",
      "testable": true,
      "dependencies": ["commit_2"],
      "estimated_tests": ["Session creation", "Session validation", "Route protection"]
    }
  ],
  "execution_order": ["commit_1", "commit_2", "commit_3", "commit_4"],
  "parallel_groups": [
    ["commit_3", "commit_4"]
  ]
}
```

# Segmentation Rules

## Atomic Commit Principles
- Each commit should have a single, logical purpose
- Commits should be independently testable
- No commit should break the build
- Each commit should be reviewable in isolation

## File Grouping Strategy
- **Model Changes**: Database models, schemas, types
- **Service Layer**: Business logic, API services
- **Components**: UI components, views
- **Configuration**: Config files, environment setup
- **Tests**: Test files related to specific features
- **Documentation**: README, API docs, comments

## Dependency Analysis
- Identify hard dependencies (imports, inheritance)
- Recognize soft dependencies (shared functionality)
- Determine parallel execution opportunities
- Prevent circular dependencies

# Commit Message Conventions

## Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

## Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## Scopes
- `auth`: Authentication related
- `ui`: User interface components
- `api`: API endpoints and services
- `db`: Database models and migrations
- `config`: Configuration files
- `test`: Test files and utilities

# Integration Points

- **HumanInLoopAgent**: Receives approved plans for segmentation
- **CodeWriterAgent**: Provides code changes for analysis
- **TestVerificationAgent**: Validates testability of each segment
- **Git Operations**: Creates commits and manages branches

# Error Handling

- Handle circular dependencies gracefully
- Provide fallback segmentation strategies
- Validate commit message quality
- Handle large changesets appropriately

# Performance Considerations

- Efficient file change analysis
- Smart caching of dependency graphs
- Parallel processing of independent segments
- Optimized for large codebases