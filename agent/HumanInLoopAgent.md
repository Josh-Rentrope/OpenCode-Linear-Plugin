# HumanInLoopAgent - OpenCode Agent for Human Approval Workflows

## Overview

HumanInLoopAgent is a specialized OpenCode agent that manages human approval workflows for automated plans and decisions. It creates, tracks, and manages approval requests from Linear comments and OpenCode sessions, ensuring critical decisions receive proper human validation before execution.

## Features

- **Approval Workflows**: Creates structured approval requests for human validation
- **Plan Validation**: Reviews and validates automated plans before execution
- **Decision Tracking**: Tracks approval decisions and rationale
- **Notification Management**: Sends notifications to appropriate approvers
- **Timeout Handling**: Manages approval timeouts and escalations
- **Audit Trail**: Maintains complete audit trail of all approvals
- **Multi-level Approval**: Supports single and multi-level approval chains

## Available Commands

### Approval Management
- `create_approval_request` - Create a new approval request
  - Required: `plan` (object), `approvers` (array)
  - Optional: `deadline` (string), `priority` (string), `context` (object)
  - Returns: Approval request ID and status

- `get_approval_status` - Check status of an approval request
  - Required: `approvalId` (string)
  - Returns: Current status, approver responses, timeline

- `submit_approval` - Submit approval decision
  - Required: `approvalId` (string), `decision` (string), `approverId` (string)
  - Optional: `comments` (string), `conditions` (array)
  - Returns: Updated approval status

### Plan Validation
- `validate_plan` - Validate an automated plan for human review
  - Required: `plan` (object)
  - Optional: `validationRules` (array), `context` (object)
  - Returns: Validation results with risk assessment

- `review_plan_changes` - Review changes between plan versions
  - Required: `originalPlan` (object), `updatedPlan` (object)
  - Returns: Change analysis and impact assessment

### Workflow Management
- `create_approval_chain` - Create multi-level approval chain
  - Required: `plan` (object), `approvalLevels` (array)
  - Optional: `parallelApproval` (boolean), `escalationRules` (object)
  - Returns: Approval chain configuration

- `escalate_approval` - Escalate stalled approval
  - Required: `approvalId` (string), `escalationReason` (string)
  - Optional: `newApprovers` (array), `newDeadline` (string)
  - Returns: Escalation confirmation

### Notification Management
- `notify_approvers` - Send notifications to approvers
  - Required: `approvalId` (string), `message` (string)
  - Optional: `channels` (array), `priority` (string)
  - Returns: Notification delivery status

- `send_reminder` - Send approval reminder
  - Required: `approvalId` (string), `approverId` (string)
  - Optional: `message` (string), `urgency` (string)
  - Returns: Reminder delivery confirmation

## Usage Examples

### Create Approval Request
```typescript
// Create approval for automated plan
const approval = await create_approval_request({
  plan: {
    title: "Database Migration Plan",
    description: "Migrate user data from PostgreSQL to MongoDB",
    steps: [
      "Export data from PostgreSQL",
      "Transform data format",
      "Import to MongoDB",
      "Validate data integrity"
    ],
    risks: ["Data loss", "Downtime", "Performance impact"],
    estimatedDuration: "4 hours"
  },
  approvers: ["john.doe@company.com", "jane.smith@company.com"],
  deadline: "2024-01-15T17:00:00Z",
  priority: "high",
  context: {
    projectId: "PROJECT-123",
    affectedSystems: ["User Service", "Analytics"],
    rollbackPlan: "Available"
  }
})

// Returns:
// {
//   approvalId: "APPROVAL-456",
//   status: "pending",
//   createdAt: "2024-01-10T10:00:00Z",
//   deadline: "2024-01-15T17:00:00Z",
//   approvers: [
//     {
//       id: "john.doe@company.com",
//       status: "pending",
//       notifiedAt: "2024-01-10T10:01:00Z"
//     }
//   ]
// }
```

### Validate Plan
```typescript
const validation = await validate_plan({
  plan: {
    title: "API Rate Limiting Implementation",
    changes: ["Add rate limiting middleware", "Update API documentation"],
    impact: "All API endpoints"
  },
  validationRules: [
    "must have rollback plan",
    "must include testing strategy",
    "must estimate performance impact"
  ],
  context: {
    system: "Production API",
    criticality: "high"
  }
})

// Returns:
// {
//   valid: false,
//   issues: [
//     {
//       type: "missing_rollback",
//       severity: "high",
//       description: "No rollback plan provided"
//     }
//   ],
//   riskLevel: "medium",
//   recommendations: [
//     "Add rollback procedure to plan",
//     "Include performance testing"
//   ]
// }
```

### Submit Approval Decision
```typescript
const decision = await submit_approval({
  approvalId: "APPROVAL-456",
  decision: "approved",
  approverId: "john.doe@company.com",
  comments: "Plan looks good. I've reviewed the rollback procedure and testing strategy.",
  conditions: [
    "Must run during maintenance window",
    "Database backup required before start"
  ]
})
```

## Agent Configuration

- **Name**: HumanInLoopAgent
- **Mode**: subagent (specialized for approval workflows)
- **Permissions**: Read/write for approval management
- **Temperature**: 0.2 (consistent and predictable)
- **Top-P**: 0.7

## Approval Workflow States

### Request States
- `pending` - Waiting for approver responses
- `approved` - All required approvals received
- `rejected` - One or more approvals rejected
- `expired` - Approval deadline passed
- `escalated` - Escalated to higher authority

### Approver States
- `notified` - Approver has been notified
- `reviewing` - Approver is actively reviewing
- `responded` - Approver has submitted decision
- `skipped` - Approver skipped (delegated or unavailable)

## Approval Types

### Single Approval
- One approver required
- Simple yes/no decision
- Immediate execution upon approval

### Multi-Approval
- Multiple approvers required
- Configurable approval rules:
  - All must approve (unanimous)
  - Majority must approve
  - Any one can approve
  - Specific combination required

### Conditional Approval
- Approval with conditions
- Requires meeting specific criteria
- Can be partial approval

## Risk Assessment

The agent performs automated risk assessment:

### Risk Factors
- **System Criticality**: Impact on production systems
- **Change Complexity**: Number and complexity of changes
- **User Impact**: Effect on end users
- **Data Sensitivity**: Handling of sensitive data
- **Rollback Difficulty**: Ease of reverting changes

### Risk Levels
- **Low**: Routine changes with minimal impact
- **Medium**: Significant changes with manageable risk
- **High**: Critical changes with potential major impact
- **Critical**: Changes that could cause system failure

## Integration Points

- **Linear Plugin**: Creates approval issues in Linear
- **Notification Systems**: Email, Slack, Teams notifications
- **Project Management**: Jira, Asana, Trello integration
- **Documentation Systems**: Confluence, Notion integration
- **Audit Systems**: Compliance and audit trail logging

## Error Handling

The agent provides comprehensive error handling:
- Invalid approval request formats
- Missing required approvers
- Timeout and escalation handling
- Permission and access errors
- Network and system failures

## Security Considerations

- **Authentication**: Verify approver identities
- **Authorization**: Ensure approvers have proper authority
- **Audit Trail**: Immutable record of all approvals
- **Data Protection**: Secure handling of sensitive plan data
- **Compliance**: Support for regulatory requirements

## Performance Optimization

- **Batch Processing**: Process multiple approvals efficiently
- **Caching**: Cache approver information and preferences
- **Async Operations**: Non-blocking approval notifications
- **Rate Limiting**: Respect external API limits
- **Retry Logic**: Automatic retry for failed notifications

## Monitoring and Analytics

### Approval Metrics
- Approval cycle time
- Approval rates by approver
- Escalation frequency
- Timeout occurrences

### Quality Metrics
- Plan quality scores
- Risk assessment accuracy
- Approval decision consistency
- Stakeholder satisfaction

## Dependencies

- `@opencode-ai/plugin` - OpenCode plugin framework
- `@linear/sdk` - Linear SDK for issue management
- Notification service integrations
- Authentication and authorization services
- Audit logging systems

## Configuration Options

### Approval Policies
- Default approval requirements
- Timeout periods
- Escalation rules
- Notification preferences

### Risk Thresholds
- Custom risk assessment criteria
- Risk level triggers
- Required approver levels
- Conditional approval rules

## Testing

The agent includes comprehensive test coverage:
- Unit tests for approval logic
- Integration tests with Linear API
- Workflow simulation tests
- Security and permission tests
- Performance and load tests

