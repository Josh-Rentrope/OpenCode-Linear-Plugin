---
name: AgentLoggingStandards
description: Standardized logging format and status management for all OpenCode agents
type: standards
subagents: []
upstream: []
inputs: []
outputs: []
---

# Agent Logging Standards

This document defines the standardized logging format and status management requirements that all OpenCode agents must follow to ensure consistent observability, debugging capabilities, and user transparency.

# Core Principles

## 1. Informative Logging
- Agents must log frequently enough to provide insight into their thought process
- Logs should explain what the agent is doing, why, and what decisions were made
- Include architectural decisions, implementation choices, and challenges encountered
- Make logs valuable for users reviewing the agent's work later

## 2. Status Management
- Agents must update their status to `in_progress` before starting work
- Status must be set to `completed` when work is finished
- Status updates should happen at key transition points

## 3. Structured Information
- Log entries should be structured and machine-readable where possible
- Include context, decisions, rationale, and outcomes
- Use consistent formatting across all agents

# Standard Log Format

## Basic Log Entry Structure
```
[TIMESTAMP] [AGENT_NAME] [STATUS] [CATEGORY]: MESSAGE
  Context: Additional context information
  Decision: Rationale for decisions made
  Challenge: Any challenges encountered and solutions
  Outcome: Result of the action or decision
```

## Status Categories
- **INFO**: General information about progress
- **DECISION**: Important decisions with rationale
- **CHALLENGE**: Problems encountered and how they were resolved
- **IMPLEMENTATION**: Specific implementation details
- **VALIDATION**: Validation and testing activities
- **COMPLETION**: Task completion summaries

# Required Status Updates

## Session Lifecycle
1. **Session Start**: Set status to `in_progress` with initial context
2. **Progress Updates**: Log key milestones and decisions
3. **Session End**: Set status to `completed` with summary

## Key Transition Points
- Before starting any major work phase
- After completing significant milestones
- When making important architectural decisions
- When encountering and resolving challenges
- Before handing off to other agents

# Logging Content Requirements

## Decision Logging
All agents must log:
- **What decision was made**: Clear statement of the decision
- **Why it was made**: Rationale and context
- **Alternatives considered**: Other options and why they were rejected
- **Impact assessment**: How the decision affects the overall work

## Implementation Logging
For implementation agents (CodeWriterAgent, etc.):
- **File operations**: Which files are being modified and why
- **Code changes**: Specific changes being made with purpose
- **Pattern adherence**: How existing patterns are being followed
- **Challenges**: Any implementation difficulties and solutions

## Architectural Logging
For planning agents (SolutionPlannerAgent, etc.):
- **Approach selection**: Why specific approaches were chosen
- **Trade-offs**: What trade-offs were made and why
- **Dependencies**: How dependencies were identified and managed
- **Risk assessment**: Potential risks and mitigation strategies

# Log Frequency Guidelines

## High-Frequency Logging (Every 1-2 minutes)
- During active implementation work
- When processing multiple items in sequence
- During complex decision-making processes

## Medium-Frequency Logging (Every 5-10 minutes)
- During analysis and planning phases
- When working on longer-running tasks
- During validation and testing

## Event-Driven Logging
- Immediately after important decisions
- When challenges are encountered and resolved
- At major milestone completions
- When status changes occur

# Standard Log Messages

## Starting Work
```
[TIMESTAMP] [AGENT_NAME] [INFO] [SESSION]: Starting [TASK_NAME] execution
  Context: [Brief description of task and inputs]
  Plan: [High-level approach or plan]
  Estimated Complexity: [Low/Medium/High]
```

## Making Decisions
```
[TIMESTAMP] [AGENT_NAME] [DECISION] [APPROACH]: Chose [APPROACH_NAME] for [TASK]
  Rationale: [Why this approach was selected]
  Alternatives: [Other options considered and rejected]
  Impact: [How this affects the work]
```

## Encountering Challenges
```
[TIMESTAMP] [AGENT_NAME] [CHALLENGE] [ISSUE]: [DESCRIPTION_OF_CHALLENGE]
  Problem: [Specific problem encountered]
  Solution: [How the problem was resolved]
  Learning: [What was learned from this challenge]
```

## Implementation Details
```
[TIMESTAMP] [AGENT_NAME] [IMPLEMENTATION] [ACTION]: [DESCRIPTION_OF_ACTION]
  File: [File being modified]
  Change: [Specific change being made]
  Purpose: [Why this change is necessary]
  Pattern: [How existing patterns are followed]
```

## Completing Work
```
[TIMESTAMP] [AGENT_NAME] [COMPLETION] [TASK]: [TASK_NAME] completed successfully
  Summary: [Brief summary of what was accomplished]
  Output: [Description of outputs created]
  Next Steps: [What happens next or handoff information]
```

# Integration with Status Management

## Status Update Format
When updating status, agents should log:
```
[TIMESTAMP] [AGENT_NAME] [STATUS] [TRANSITION]: Status changed from [OLD_STATUS] to [NEW_STATUS]
  Reason: [Why the status changed]
  Progress: [Current progress percentage or state]
  Next: [What will happen next]
```

## Required Status Transitions
1. **pending → in_progress**: When starting actual work
2. **in_progress → completed**: When work is finished
3. **in_progress → pending**: If work is paused or interrupted
4. **completed → pending**: If work needs to be redone

# Quality Assurance

## Log Review Checklist
- [ ] Logs provide sufficient detail for debugging
- [ ] Decision rationale is clearly explained
- [ ] Implementation challenges are documented
- [ ] Status updates occur at appropriate times
- [ ] Log frequency is adequate without being excessive
- [ ] Format follows the standard structure
- [ ] Technical details are preserved for future reference

## Audit Trail Requirements
- All major decisions must be logged with rationale
- Implementation approaches must be documented
- Challenges and solutions must be recorded
- Status transitions must be tracked
- Handoffs between agents must be logged

# Examples

## Good Logging Example
```
[2024-01-15T10:30:00Z] [SolutionPlannerAgent] [DECISION] [APPROACH]: Chose component-based architecture for login system
  Rationale: Existing codebase uses React components, this maintains consistency
  Alternatives: Monolithic approach (rejected for maintainability), micro-frontends (rejected for complexity)
  Impact: Requires creating 3 new components, affects existing auth service
  Risk: Medium - requires careful state management

[2024-01-15T10:32:15Z] [SolutionPlannerAgent] [CHALLENGE] [DEPENDENCY]: Auth service lacks user profile endpoint
  Problem: Login component needs user profile data but endpoint doesn't exist
  Solution: Added auth service extension to plan before component implementation
  Learning: Always verify API availability before planning UI components
```

## Poor Logging Example
```
[2024-01-15T10:30:00Z] [SolutionPlannerAgent]: Starting work
[2024-01-15T10:35:00Z] [SolutionPlannerAgent]: Made decision
[2024-01-15T10:40:00Z] [SolutionPlannerAgent]: Done
```

# Implementation Notes

## Tool Integration
Agents should integrate logging with their execution tools:
- Use structured logging libraries where available
- Ensure logs are captured in execution environments
- Make logs accessible through standard output and files
- Support log filtering and searching capabilities

## Performance Considerations
- Logging should not significantly impact performance
- Use appropriate log levels to manage verbosity
- Consider log rotation and storage management
- Ensure sensitive information is not logged

## User Experience
- Logs should be readable by both technical and non-technical users
- Provide summaries alongside detailed technical information
- Use clear, consistent terminology
- Make it easy to trace the complete workflow