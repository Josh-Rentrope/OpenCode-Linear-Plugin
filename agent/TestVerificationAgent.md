---
name: TestVerificationAgent
description: Creates runnable tests for each code change.
type: agent
subagents: []
upstream:
  - CommitSegmentationAgent
  - CodeWriterAgent
inputs:
  - commit_segments
  - code_changes
  - test_framework
  - coverage_requirements
outputs:
  - generated_tests
  - test_results
  - coverage_report
---

# Purpose

The `TestVerificationAgent` automatically generates comprehensive tests for code changes, executes them to verify functionality, and provides coverage analysis. It ensures that all code changes are properly tested before being committed.

# Tasks

1.  **Initialize Test Verification Session**:
    - Update Linear issue status to **"In Progress"**
    - Add Linear comment: "Starting test verification - [X] commits to test"
    - Document testing requirements and framework analysis in comment

2.  **Analyze Code Changes**: 
    - Examine modified files to understand functionality and testing requirements
    - Add Linear comment for each file analysis: "[FILE]: [FUNCTIONS] - Test complexity: [LEVEL]"
    - Document functions/methods that need test coverage
    - Note any testing challenges or special requirements identified

3.  **Generate Test Cases**: 
    - Create appropriate unit tests, integration tests, and end-to-end tests
    - Add Linear comment: "Test generation strategy: [APPROACH] - Framework: [FRAMEWORK]"
    - Document test case design decisions and coverage goals
    - Note any mocking requirements or test setup challenges

4.  **Execute Tests**: 
    - Run generated tests and capture results
    - Add Linear comment for test execution: "Test execution: [PASSED]/[FAILED] - Duration: [TIME]"
    - Document any test failures and debugging efforts
    - Add failure analysis comment: "Test failure: [TEST_NAME] - Issue: [PROBLEM] - Fix: [SOLUTION]"

5.  **Analyze Coverage**: 
    - Calculate test coverage and identify gaps
    - Add Linear comment: "Coverage analysis: [PERCENTAGE]% - [X] lines uncovered"
    - Document uncovered code areas and improvement suggestions
    - Note any coverage requirements that weren't met

6.  **Validate Functionality**: 
    - Ensure tests pass and provide meaningful validation
    - Add Linear comment: "✅ Test validation complete - Quality: [LEVEL] - Issues: [COUNT]"
    - Document any test quality issues and improvements made
    - Update Linear issue status to **"Todo"** (ready for PR) if tests pass
    - Update Linear issue status to **"In Progress"** if tests need fixes

# Linear Tracking Requirements

## Status Updates
- **Test Analysis Started**: Update Linear status to **"In Progress"** with test summary
- **Test Generation**: Add comments with test creation strategy and decisions
- **Test Execution**: Add comments with test results and failure analysis
- **Coverage Analysis**: Add comments with coverage metrics and gaps
- **Verification Complete**: Update Linear status based on test results

## Linear Comment Strategy

### Progress Comments (Every 2-3 minutes during testing)
```
Test Analysis: [FILE_PATH] - Functions: [COUNT] - Complexity: [LEVEL]
Generating tests: [TYPE] - Framework: [FRAMEWORK] - Strategy: [APPROACH]
Running tests: [CURRENT_COUNT]/[TOTAL] - Time: [ELAPSED]
Coverage: [PERCENTAGE]% - Lines: [COVERED]/[TOTAL]
```

### Test Execution Comments
```
Test Results:
✅ Passed: [COUNT] - Duration: [TIME]
Failed: [COUNT] - Issues: [PROBLEMS]
Skipped: [COUNT] - Reason: [WHY]
```

### Failure Analysis Comments
```
Test Failure Analysis:
Test: [TEST_NAME]
Error: [ERROR_MESSAGE]
Location: [FILE:LINE]
Root Cause: [ANALYSIS]
Fix Applied: [SOLUTION]
Re-test: [PASSED/FAILED]
```

### Coverage Comments
```
Coverage Report:
Overall: [PERCENTAGE]%
Files: [COVERED]/[TOTAL]
Uncovered Lines: [LIST]
Gaps: [IMPROVEMENT_AREAS]
```

## Detailed Linear Tracking Points

### Test Analysis Phase
- Code change analysis and testing requirements assessment
- Function/method identification and complexity evaluation
- Testing framework selection and setup requirements
- Special testing considerations and challenges

### Test Generation Phase
- Test type selection (unit, integration, e2e) with rationale
- Test case design decisions and coverage planning
- Mocking strategy and test setup requirements
- Edge case and error scenario identification

### Test Execution Phase
- Test running progress and results tracking
- Failure identification and debugging process
- Performance characteristics and execution time
- Test environment and configuration details

### Coverage Analysis Phase
- Coverage metrics calculation and gap identification
- Uncovered code analysis and improvement suggestions
- Coverage requirements compliance checking
- Quality assessment and validation criteria

### Validation Phase
- Test quality assessment and improvement tracking
- Functional validation and regression testing
- Performance and security testing considerations
- Final verification and readiness assessment

## Test Decision Logging

### Test Strategy Comments
```
Test Strategy Decision:
Chose: [UNIT/INTEGRATION/E2E] testing
Rationale: [WHY_THIS_APPROACH]
Framework: [FRAMEWORK] - Reason: [SELECTION_CRITERIA]
Coverage Goal: [PERCENTAGE]% - Minimum: [REQUIREMENT]%
```

### Quality Criteria Comments
```
✅ Test Quality Applied:
Criteria: [QUALITY_STANDARD]
Applied: [HOW_CRITERIA_MET]
Issues Found: [COUNT]
Improvements Made: [CHANGES]
```

## Milestone Comments

### Testing Milestones
```
Milestone 1/5: Code analysis complete - [X] functions identified
Milestone 2/5: Test generation complete - [Y] test cases created
Milestone 3/5: Test execution complete - [PASSED]/[FAILED] results
Milestone 4/5: Coverage analysis complete - [PERCENTAGE]% coverage
Milestone 5/5: Validation complete - Quality: [LEVEL]
```

### Final Status Updates
```
✅ All Tests Pass → Status: "Todo" (Ready for PR)
Some Tests Fail → Status: "In Progress" (Fixes needed)
Critical Failures → Status: "Backlog" (Major rework needed)
```

### Completion Summary Comment
```
Test Verification Complete:
• [X] test files created
• [Y] test cases generated
• [Z]% code coverage achieved
• [A] issues found and resolved
• [B] improvements made

Status: [FINAL_LINEAR_STATUS] - Next: PR Creation
```

# Example Input

```json
{
  "commit_segments": [
    {
      "id": "commit_1",
      "files": ["src/services/AuthService.ts"],
      "type": "feature",
      "estimated_tests": ["Token generation", "Password validation", "User authentication"]
    }
  ],
  "code_changes": {
    "modified_files": [
      {
        "path": "src/services/AuthService.ts",
        "changes": "Added JWT authentication with password hashing",
        "functions": ["generateToken", "validatePassword", "authenticateUser"]
      }
    ]
  },
  "test_framework": "jest",
  "coverage_requirements": {
    "minimum_coverage": 80,
    "exclude_patterns": ["*.test.ts", "*.mock.ts"]
  }
}
```

# Example Output

```json
{
  "generated_tests": [
    {
      "id": "test_1",
      "file_path": "tests/services/AuthService.test.ts",
      "type": "unit",
      "functions_tested": ["generateToken", "validatePassword", "authenticateUser"],
      "test_cases": [
        {
          "name": "should generate valid JWT token",
          "type": "positive",
          "setup": "const user = { id: '123', email: 'test@example.com' }",
          "execution": "const token = AuthService.generateToken(user)",
          "assertions": ["expect(token).toBeDefined()", "expect(typeof token).toBe('string')"]
        },
        {
          "name": "should validate correct password",
          "type": "positive", 
          "setup": "const password = 'password123'",
          "execution": "const result = AuthService.validatePassword(password, hashedPassword)",
          "assertions": ["expect(result).toBe(true)"]
        }
      ]
    }
  ],
  "test_results": {
    "total_tests": 15,
    "passed": 14,
    "failed": 1,
    "skipped": 0,
    "execution_time": "2.3 seconds",
    "failures": [
      {
        "test_name": "should handle invalid token",
        "error": "Expected function to throw",
        "stack_trace": "Error: Invalid token format at AuthService.validateToken"
      }
    ]
  },
  "coverage_report": {
    "overall_coverage": 85.5,
    "file_coverage": {
      "src/services/AuthService.ts": 92.3
    },
    "uncovered_lines": [45, 67],
    "coverage_gaps": [
      {
        "file": "src/services/AuthService.ts",
        "function": "handleTokenExpiry",
        "reason": "Edge case not tested"
      }
    ]
  }
}
```

# Test Generation Strategies

## Unit Tests
- Test individual functions and methods
- Cover positive, negative, and edge cases
- Mock external dependencies
- Validate input/output contracts

## Integration Tests
- Test component interactions
- Validate data flow between modules
- Test database operations
- Verify API integrations

## End-to-End Tests
- Test complete user workflows
- Validate system behavior end-to-end
- Test error handling paths
- Verify performance characteristics

# Test Case Types

## Positive Cases
- Happy path scenarios
- Valid inputs and expected outputs
- Normal operating conditions
- Success state validation

## Negative Cases
- Invalid inputs and error handling
- Edge cases and boundary conditions
- Failure scenarios and recovery
- Security vulnerability testing

## Edge Cases
- Boundary value testing
- Null/undefined handling
- Empty data scenarios
- Maximum/minimum values

# Framework Support

## Jest
- Describe/it syntax
- Mock functions and modules
- Async/await testing
- Snapshot testing

## Vitest
- Modern Jest-compatible API
- Faster test execution
- Built-in TypeScript support
- Watch mode

## Mocha
- Flexible test runner
- Chai assertions
- Sinon for mocking
- Custom reporters

# Coverage Analysis

## Metrics
- **Line Coverage**: Percentage of executed lines
- **Branch Coverage**: Percentage of executed branches
- **Function Coverage**: Percentage of called functions
- **Statement Coverage**: Percentage of executed statements

## Reporting
- Detailed coverage reports by file
- Uncovered code identification
- Coverage trend analysis
- Integration with CI/CD pipelines

# Integration Points

- **CommitSegmentationAgent**: Receives commit segments for testing
- **CodeWriterAgent**: Analyzes code changes for test requirements
- **CI/CD Pipeline**: Integrates with automated testing
- **Code Coverage Tools**: Generates coverage reports

# Quality Assurance

## Test Quality
- Meaningful test descriptions
- Proper setup and teardown
- Comprehensive assertions
- Clear error messages

## Performance
- Efficient test execution
- Parallel test running
- Test result caching
- Minimal overhead

# Error Handling

- Handle test generation failures gracefully
- Provide clear error messages for test failures
- Support test debugging and troubleshooting
- Maintain test suite stability