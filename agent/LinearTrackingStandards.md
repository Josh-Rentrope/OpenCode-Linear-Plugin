---
name: LinearTrackingStandards
description: Standardized Linear status management and comment tracking for all OpenCode agents
type: standards
subagents: []
upstream: []
inputs: []
outputs: []
---

# Linear Tracking Standards

This document defines standardized Linear status management and comment tracking requirements that all OpenCode agents must follow to ensure consistent workflow tracking, transparency, and user visibility through Linear's native interface.

# Linear Status Workflow

## Status Definitions

### 🟡 Backlog
- **Usage**: Issues that are not yet ready to work on
- **When to use**: Initial state, when rejected, when major rework needed
- **Agent Actions**: Set when rejecting work or identifying major issues

### 🟠 Todo  
- **Usage**: Issues ready for work but not yet started
- **When to use**: After planning complete, after approval, ready for next phase
- **Agent Actions**: Set when planning complete, when ready for human review

### 🟢 In Progress
- **Usage**: Issues currently being worked on
- **When to use**: When starting any active work phase
- **Agent Actions**: Set when beginning implementation, analysis, testing, etc.

### ✅ Done
- **Usage**: Issues completed and ready for next workflow step
- **When to use**: When work phase is complete and ready for handoff
- **Agent Actions**: Set when implementation complete, tests pass, PR ready

# Standard Status Transitions

## Typical Workflow
```
Backlog → In Progress → Todo → In Progress → Done
   ↑           ↓          ↑          ↓
   └─── Rejection/Issues ──────┘
```

## Agent-Specific Transitions

### SolutionPlannerAgent
```
Backlog → In Progress (starting analysis)
In Progress → Todo (plan ready for review)
Todo → In Progress (human review in progress)
In Progress → Done (review complete, ready for implementation)
```

### CodeWriterAgent
```
Todo → In Progress (starting implementation)
In Progress → Todo (implementation complete, ready for segmentation)
```

### CommitSegmentationAgent
```
Todo → In Progress (starting segmentation)
In Progress → Todo (segmentation complete, ready for execution)
```

### TestVerificationAgent
```
Todo → In Progress (starting testing)
In Progress → Todo (tests pass, ready for PR)
In Progress → Backlog (critical failures, major rework needed)
```

### HumanInLoopAgent
```
Todo → In Progress (approval workflow started)
In Progress → Todo (approved with modifications)
In Progress → Backlog (rejected)
In Progress → Done (fully approved)
```

### PullRequestAgent
```
Todo → In Progress (starting PR draft)
In Progress → Done (PR ready for submission)
```

# Linear Comment Standards

## Comment Frequency Guidelines

### High-Frequency Updates (Every 1-2 minutes)
- During active implementation work
- When processing multiple items in sequence
- During complex decision-making processes
- During test execution and debugging

### Medium-Frequency Updates (Every 3-5 minutes)
- During analysis and planning phases
- When working on longer-running tasks
- During validation and review processes
- During approval workflows

### Event-Driven Updates (Immediately)
- When starting new work phases
- When making important decisions
- When encountering challenges or solutions
- When completing milestones
- When status changes occur

## Comment Structure Standards

### Progress Update Format
```
🔥 [AGENT_PHASE]: [BRIEF_DESCRIPTION]
Details: [ADDITIONAL_CONTEXT]
Impact: [AFFECTED_AREA]
Next: [IMMEDIATE_NEXT_STEP]
```

### Decision Format
```
🧠 [DECISION_TYPE]: [DECISION_DESCRIPTION]
Rationale: [DETAILED_REASONING]
Alternatives: [REJECTED_OPTIONS]
Trade-offs: [CONSIDERATIONS]
Impact: [EFFECT_ON_WORK]
```

### Challenge Resolution Format
```
⚠️ [CHALLENGE_TYPE]: [CHALLENGE_DESCRIPTION]
Problem: [SPECIFIC_ISSUE]
Attempted: [SOLUTION_ATTEMPTS]
✅ Resolved: [FINAL_SOLUTION]
Learning: [INSIGHT_GAINED]
```

### Milestone Format
```
🎯 [MILESTONE_NAME]: [COMPLETION_STATUS]
Progress: [CURRENT]/[TOTAL] phases
Duration: [TIME_ELAPSED]
Quality: [ASSESSMENT_LEVEL]
Next: [NEXT_PHASE]
```

## Emoji Usage Guidelines

### Phase Indicators
- 🚀 Starting new phase/workflow
- 🔍 Analysis and investigation
- 🏗️ Planning and architecture
- 💻 Implementation and coding
- 🧪 Testing and verification
- 📦 Segmentation and organization
- 👤 Human review and approval
- 📝 Documentation and drafting
- ✅ Completion and success

### Status Indicators
- 🟡 Backlog (not ready)
- 🟠 Todo (ready but not started)
- 🟢 In Progress (actively working)
- ✅ Done (complete)

### Decision Types
- 🧠 Architectural decisions
- 🔧 Implementation decisions
- 📊 Strategy decisions
- ⚖️ Trade-off decisions
- 🔄 Process decisions

### Information Types
- 📁 File operations
- 📊 Metrics and analysis
- 🔗 Dependencies and relationships
- ⚡ Performance and optimization
- 🔒 Security and compliance

## Comment Content Requirements

### Always Include
- **What**: Clear description of what's happening
- **Why**: Rationale for decisions or actions
- **Impact**: How it affects the overall work
- **Next**: What happens immediately after

### Decision Comments Must Include
- **Options considered**: List alternatives evaluated
- **Selection criteria**: How the choice was made
- **Trade-offs**: What was gained vs. what was lost
- **Confidence level**: How certain the agent is about the decision

### Challenge Comments Must Include
- **Problem description**: Clear statement of the issue
- **Impact assessment**: How it affects the work
- **Solution attempts**: What was tried before success
- **Final resolution**: How it was ultimately resolved
- **Prevention**: How similar issues can be avoided

### Progress Comments Must Include
- **Current phase**: What part of the workflow is active
- **Completion percentage**: How far along in current phase
- **Blockers**: Anything preventing progress
- **ETA**: When current phase is expected to complete

## Quality Standards

### Comment Quality Checklist
- [ ] Clear and concise language
- [ ] Appropriate emoji usage
- [ ] Sufficient technical detail
- [ ] Decision rationale included
- [ ] Next steps clearly stated
- [ ] Impact on overall work explained
- [ ] Timestamp considerations (implicit in Linear)

### Status Update Validation
- [ ] Status reflects actual work state
- [ ] Transition follows defined workflow
- [ ] Status change is justified by work completed
- [ ] Next agent can understand current state
- [ ] User can track progress effectively

## Integration Requirements

### Linear API Usage
All agents must:
- Use Linear's official API for status updates
- Use Linear's comment API for progress tracking
- Handle API errors gracefully with fallback logging
- Respect Linear's rate limits and quotas
- Authenticate properly with required permissions

### Error Handling
- API failures should not stop agent work
- Provide clear error messages in comments
- Implement retry logic for transient failures
- Log all API interactions for debugging
- Have fallback strategies for critical failures

### Permissions Required
- **Issue Status Updates**: Ability to change issue states
- **Comment Creation**: Ability to add comments to issues
- **Issue Reading**: Ability to read issue details and history
- **Team Access**: Access to relevant team and project data

## Workflow Examples

### Successful Implementation Flow
```
1. 🚀 SolutionPlannerAgent: "Starting analysis" → Status: In Progress
2. 🔍 SolutionPlannerAgent: "Analysis complete - 3 files affected" → Status: Todo
3. 👤 HumanInLoopAgent: "Plan approved" → Status: In Progress
4. 💻 CodeWriterAgent: "Starting implementation" → Status: In Progress
5. 🔧 CodeWriterAgent: "Implementation complete" → Status: Todo
6. 📦 CommitSegmentationAgent: "Segmentation complete" → Status: Todo
7. 🧪 TestVerificationAgent: "Tests passing" → Status: Todo
8. 📝 PullRequestAgent: "PR ready" → Status: Done
```

### Error Recovery Flow
```
1. 🧪 TestVerificationAgent: "Tests failing" → Status: In Progress
2. ⚠️ TestVerificationAgent: "Critical issues found" → Status: Backlog
3. 🚀 SolutionPlannerAgent: "Re-planning needed" → Status: In Progress
4. 💻 CodeWriterAgent: "Implementing fixes" → Status: In Progress
```

## Monitoring and Analytics

### Progress Tracking
- Track time spent in each status
- Monitor frequency of status changes
- Identify bottlenecks in workflow
- Measure agent efficiency and success rates

### Quality Metrics
- Comment clarity and completeness scores
- Status transition accuracy
- User satisfaction with progress visibility
- Error recovery success rates

### Compliance Monitoring
- Adherence to comment standards
- Proper status transition usage
- API usage compliance
- Permission and security compliance

## Best Practices

### For Agent Developers
1. **Always update status before starting work**
2. **Provide frequent, informative comments**
3. **Include decision rationale in all major choices**
4. **Document challenges and solutions thoroughly**
5. **Use consistent emoji and formatting**
6. **Handle Linear API errors gracefully**
7. **Consider the next agent in the workflow**

### For System Integrators
1. **Monitor Linear API usage and quotas**
2. **Provide backup logging for API failures**
3. **Implement proper authentication and permissions**
4. **Create dashboards for progress tracking**
5. **Set up alerts for workflow bottlenecks**

### For Users
1. **Monitor Linear issue status for progress**
2. **Read agent comments for detailed context**
3. **Provide feedback through Linear comments**
4. **Understand the workflow and status meanings**
5. **Use agent insights for learning and improvement**

## Implementation Checklist

### Before Agent Execution
- [ ] Linear API credentials configured
- [ ] Required permissions verified
- [ ] Issue ID and context validated
- [ ] Previous agent status confirmed
- [ ] Comment templates prepared

### During Agent Execution
- [ ] Status updated at phase transitions
- [ ] Comments added at key milestones
- [ ] Decisions documented with rationale
- [ ] Challenges and solutions logged
- [ ] API errors handled gracefully

### After Agent Execution
- [ ] Final status set correctly
- [ ] Completion summary added
- [ ] Handoff information provided
- [ ] Next agent notified
- [ ] Quality validation complete

These standards ensure that all OpenCode agents provide consistent, informative, and valuable tracking through Linear's native interface, giving users complete visibility into automated development workflows.