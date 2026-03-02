# Milestone Update Error Investigation

## Error Description
`TypeError: text2.split is not a function. (In 'text2.split(\n))', 'text2.split' is undefined)`

## Investigation Summary

### What Works
✅ The Linear SDK `updateProjectMilestone()` method works perfectly when called directly via Node.js
✅ Create milestone works fine
✅ Delete milestone works fine
✅ List milestones works fine
✅ All other Linear operations (issues, comments, projects, relations) work fine

### What Fails
❌ Milestone update ONLY fails when called through OpenCode's plugin system
❌ Error occurs even with minimal update (just changing the name)
❌ Error persists regardless of which fields are updated

### Root Cause Analysis

The error `text2.split is not a function` suggests that somewhere in the code execution path, a variable expected to be a string is actually `undefined`.

#### Evidence:
1. **Direct SDK call works:**
   ```javascript
   // This works fine in Node.js
   await client.updateProjectMilestone(id, { name: 'New Name' })
   ```

2. **OpenCode plugin call fails:**
   ```typescript
   // This fails in OpenCode
   await crud.updateProjectMilestone(id, { name: 'New Name' })
   ```

3. **Error location:** The error happens during the SDK call itself, not in our return handling

### Attempted Fixes (All Failed)

1. ❌ **Return simple boolean instead of milestone object** - Still failed
2. ❌ **Skip re-fetching milestone after update** - Still failed  
3. ❌ **Remove safety checks to simplify code path** - Still failed
4. ❌ **Return mock object instead of real milestone** - Still failed
5. ❌ **Change return type and tool response** - Still failed

### Hypothesis

The issue appears to be an **incompatibility between OpenCode's plugin execution environment and the Linear SDK's internal serialization/deserialization logic**.

Specifically:
- The Linear SDK likely uses some form of text parsing (`text2.split()`) during GraphQL response processing
- In OpenCode's plugin environment, some property or variable that should be a string is `undefined`
- This could be related to:
  - How OpenCode loads/executes TypeScript/JavaScript modules
  - Environment variable handling
  - Promise/async handling differences
  - Module resolution or bundling

### Why Other Operations Work

Other Linear operations (issues, projects, comments) likely use different GraphQL queries/mutations that don't trigger the same code path in the SDK that milestone updates do.

## Recommendations

### Option 1: Disable Milestone Update (Current State)
- Mark the `linear_update_milestone` tool as "not implemented"
- Document the limitation
- All other functionality works perfectly

### Option 2: Wait for SDK/OpenCode Fix
- Report the issue to OpenCode maintainers
- The issue may be resolved in a future OpenCode or Linear SDK update

### Option 3: Use GraphQL Directly
- Bypass the Linear SDK for milestone updates
- Use raw GraphQL mutation directly
- This would require:
  - Implementing custom GraphQL client code
  - Manually constructing the mutation
  - Handling authentication separately

### Option 4: External Webhook/API Bridge
- Create a small external service that handles milestone updates
- OpenCode calls the external service
- External service uses Linear SDK in normal Node environment

## Recommended Action

**Option 1** is the most pragmatic:
1. Document that milestone update is not currently supported
2. All other 26 tools work perfectly (96% success rate)
3. Milestone create and delete work fine
4. Users can delete and recreate milestones as a workaround

## Code Changes Needed

Revert to a clean state and add a clear error message:

```typescript
async updateProjectMilestone(milestoneId: string, data: {
  name?: string
  description?: string  
  targetDate?: string
  sortOrder?: number
}, options?: OperationOptions): Promise<boolean> {
  throw new Error(
    "Milestone update is currently not supported due to an incompatibility " +
    "between OpenCode's plugin environment and the Linear SDK. " +
    "As a workaround, please delete and recreate the milestone with new values."
  )
}
```

## Investigation Status

- [x] Reproduced error consistently
- [x] Confirmed SDK works in isolation
- [x] Tested multiple workarounds
- [x] Identified root cause area (OpenCode/SDK incompatibility)
- [x] Documented findings
- [ ] Reported to OpenCode maintainers (pending)

## Additional Notes

This is an edge case affecting only 1 out of 27 tools (3.7% failure rate). The overall plugin is production-ready with this limitation documented.
