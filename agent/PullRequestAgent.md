---
name: PullRequestAgent
description: If tests pass, drafts a pull request with all relevant info.
type: agent
subagents: []
upstream:
  - TestRunnerAgent
inputs:
  - solution_plan_md
  - test_report_json
  - issue_number
outputs:
  - pr_draft_md
---

# Purpose

The final step. After a solution has been coded and has passed all tests, this agent drafts the text for the pull request, ready for human review.

# Tasks

1.  **Initialize PR Draft Session**:
    - Update Linear issue status to **"In Progress"**
    - Add Linear comment: "Starting PR draft creation - Test verification: [STATUS]"
    - Document PR requirements and review criteria in comment

2.  **Verify Success**: 
    - Check that `test_report_json.passed` is `true`. If not, abort.
    - Add Linear comment: "✅ Test verification passed - [X] tests, [Y]% coverage" OR "Tests failed - aborting PR"
    - Document abort scenarios and reasoning if tests failed
    - Note any test warnings or coverage concerns

3.  **Read Plan**: 
    - Read the `solution_plan_md` to use as the body of the PR.
    - Add Linear comment: "Solution plan analyzed - [X] steps, [Y] files affected"
    - Document how the solution plan will be presented
    - Note any additional context needed for reviewers

4.  **Format Draft**: 
    - Assemble a markdown file (`pr_draft_md`) that includes:
        *   A title (e.g., "Fixes #123: Submit button not working").
        *   A link to the issue (e.g., "Closes #123").
        *   The `solution_plan_md` as the description of changes.
        *   A summary of the test results.
    - Add Linear comment: "PR draft formatted - Title: [TITLE], Sections: [LIST]"
    - Document how test results are presented and summarized
    - Note any additional sections added for clarity (screenshots, etc.)

5.  **Output Draft**: 
    - Return the path to the `pr_draft_md`.
    - Add Linear comment: "PR draft complete - File: [PATH], Size: [CHARS]"
    - Document any final review or improvements made
    - Update Linear issue status to **"Done"** (PR ready for submission)
    - Add final comment: "✅ PR workflow complete - Ready for manual submission"

# Linear Tracking Requirements

## Status Updates
- **PR Draft Started**: Update Linear status to **"In Progress"** with test verification status
- **Test Verification**: Add comment with test results and any issues found
- **Plan Analysis**: Add comment with solution plan analysis and structure
- **PR Formatting**: Add comment with formatting decisions and sections
- **PR Draft Complete**: Update Linear status to **"Done"** with completion summary

## Linear Comment Strategy

### Progress Comments (Every 2-3 minutes during PR creation)
```
PR Draft Creation: [CURRENT_STAGE]
Analyzing solution plan: [X] steps, [Y] files
Formatting PR structure: [SECTIONS] - Style: [FORMAT]
Incorporating test results: [PASSED]/[FAILED] - Coverage: [PERCENTAGE]%
```

### Test Verification Comments
```
✅ Test Verification Passed:
Tests: [COUNT] passed
Coverage: [PERCENTAGE]%
Duration: [TIME]
Quality: [LEVEL]

Test Verification Failed:
Issues: [COUNT] critical
Coverage: [PERCENTAGE]% (below [REQUIREMENT]%)
Action: Aborting PR - Fixes needed
```

### PR Formatting Comments
```
PR Structure Decisions:
Title: "Fixes #[ISSUE]: [BRIEF_DESCRIPTION]"
Body: [STRUCTURE] sections
Test Summary: [FORMAT]
Additional Context: [INCLUDED_ELEMENTS]
```

## Detailed Linear Tracking Points

### Test Verification Phase
- Test report analysis and pass/fail determination
- Coverage metrics evaluation against requirements
- Test quality assessment and issue identification
- Abort scenario handling and reasoning documentation

### Plan Analysis Phase
- Solution plan structure analysis and content extraction
- Step-by-step breakdown for PR description
- File and component identification for reviewer context
- Additional context requirements identification

### PR Formatting Phase
- Title generation following project conventions
- Issue linking and reference formatting
- Description structure and section organization
- Test result summarization and presentation
- Additional context inclusion (screenshots, diagrams, etc.)

### Quality Validation Phase
- PR draft completeness and clarity assessment
- Reviewer guidance and instruction inclusion
- Format compliance and style checking
- Final review and improvement identification

### Handoff Preparation
- PR draft file creation and validation
- Submission readiness assessment
- Manual submission instructions and guidance
- Final status update and workflow completion

## PR Decision Logging

### Title Generation Comments
```
PR Title Decision:
Format: "Fixes #[ISSUE]: [BRIEF_DESCRIPTION]"
Convention: [PROJECT_STANDARD]
Clarity: [ASSESSMENT]
SEO: [KEYWORDS_INCLUDED]
```

### Content Structure Comments
```
Content Structure Decisions:
Sections: [LIST_OF_SECTIONS]
Order: [SEQUENCE_RATIONALE]
Test Integration: [METHOD]
Context Addition: [INCLUDED_ELEMENTS]
```

### Quality Criteria Comments
```
✅ PR Quality Applied:
Clarity: [ASSESSMENT]
Completeness: [ASSESSMENT]
Reviewer Guidance: [INCLUDED]
Format Compliance: [STANDARD_FOLLOWED]
```

## Milestone Comments

### PR Creation Milestones
```
Milestone 1/4: Test verification complete
Milestone 2/4: Solution plan analyzed
Milestone 3/4: PR draft formatted
Milestone 4/4: Quality validation complete
```

### Final Status Updates
```
✅ PR Ready → Status: "Done" (Ready for manual submission)
Tests Failed → Status: "In Progress" (Return to testing)
Quality Issues → Status: "Todo" (Improvements needed)
```

### Completion Summary Comment
```
PR Draft Complete Summary:
• Title: "[PR_TITLE]"
• File: "[DRAFT_PATH]"
• Sections: [COUNT]
• Test Results: [SUMMARY]
• Quality Score: [LEVEL]

Status: "Done" - Ready for manual PR submission
Manual Steps: [SUBMISSION_INSTRUCTIONS]
```

# Example Input

```json
{
  "solution_plan_md": "solution_plan_for_123.md",
  "test_report_json": { "passed": true, "..." },
  "issue_number": 123
}
```