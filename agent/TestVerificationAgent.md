# TestVerificationAgent - OpenCode Agent for Automated Test Generation and Validation

## Overview

TestVerificationAgent is a specialized OpenCode agent that creates runnable tests for code changes, verifies functionality before commit creation, and ensures tests pass before allowing commits. It supports multiple test frameworks and provides comprehensive coverage reporting and analysis.

## Features

- **Automated Test Generation**: Creates tests based on code changes and requirements
- **Multi-Framework Support**: Supports Jest, Vitest, Mocha, Jasmine, and custom frameworks
- **Test Execution**: Runs tests and validates results before commits
- **Coverage Analysis**: Provides detailed coverage reporting and analysis
- **Test Quality Assurance**: Ensures generated tests are meaningful and effective
- **CI/CD Integration**: Integrates with continuous integration pipelines
- **Regression Detection**: Identifies potential regressions in existing functionality

## Available Commands

### Test Generation
- `generate_tests` - Generate tests for code changes
  - Required: `codeChanges` (array), `testFramework` (string)
  - Optional: `coverageTarget` (number), `testType` (string), `customRules` (array)
  - Returns: Generated test files and metadata

- `generate_unit_tests` - Generate unit tests for specific functions/classes
  - Required: `targetCode` (object), `functions` (array)
  - Optional: `mockStrategy` (string), `assertionStyle` (string)
  - Returns: Unit test code and test cases

- `generate_integration_tests` - Generate integration tests
  - Required: `components` (array), `interactions` (array)
  - Optional: `testEnvironment` (string), `dataSetup` (object)
  - Returns: Integration test scenarios and setup code

### Test Execution
- `run_tests` - Execute test suite
  - Required: `testFiles` (array), `testFramework` (string)
  - Optional: `testEnvironment` (object), `timeout` (number)
  - Returns: Test execution results and coverage report

- `validate_tests` - Validate test quality and effectiveness
  - Required: `testCode` (array), `sourceCode` (array)
  - Optional: `validationRules` (array), `qualityThresholds` (object)
  - Returns: Test quality assessment and recommendations

- `run_coverage_analysis` - Analyze test coverage
  - Required: `testFiles` (array), `sourceFiles` (array)
  - Optional: `coverageFormat` (string), `excludePatterns` (array)
  - Returns: Coverage report and uncovered areas

### Test Management
- `update_test_suite` - Update existing test suite for code changes
  - Required: `existingTests` (array), `codeChanges` (array)
  - Optional: `updateStrategy` (string), `preserveTests` (array)
  - Returns: Updated test suite and change summary

- `optimize_test_suite` - Optimize test suite for performance
  - Required: `testFiles` (array), `performanceGoals` (object)
  - Optional: `parallelization` (boolean), `prioritization` (string)
  - Returns: Optimized test configuration and improvements

### Regression Testing
- `detect_regressions` - Detect potential regressions
  - Required: `newCode` (array), `baselineTests` (array)
  - Optional: `regressionRules` (array), `severity` (string)
  - Returns: Regression detection results and risk assessment

- `create_regression_tests` - Create regression tests for known issues
  - Required: `bugReports` (array), `fixCode` (array)
  - Optional: `testScenarios` (array), `edgeCases` (array)
  - Returns: Regression test cases and coverage plan

## Usage Examples

### Generate Tests for Code Changes
```typescript
// Generate comprehensive tests for code changes
const tests = await generate_tests({
  codeChanges: [
    {
      filePath: "src/auth/user-service.ts",
      changes: {
        type: "function_added",
        functionName: "authenticateUser",
        parameters: ["email", "password"],
        returnType: "Promise<User>",
        implementation: `
          async authenticateUser(email: string, password: string): Promise<User> {
            const user = await this.userRepository.findByEmail(email);
            if (!user || !await bcrypt.compare(password, user.passwordHash)) {
              throw new AuthenticationError('Invalid credentials');
            }
            return user;
          }
        `
      }
    },
    {
      filePath: "src/auth/user-service.ts",
      changes: {
        type: "function_modified",
        functionName: "createUser",
        parameters: ["userData"],
        returnType: "Promise<User>",
        implementation: `
          async createUser(userData: CreateUserRequest): Promise<User> {
            const existingUser = await this.userRepository.findByEmail(userData.email);
            if (existingUser) {
              throw new ValidationError('User already exists');
            }
            
            const passwordHash = await bcrypt.hash(userData.password, 12);
            return this.userRepository.create({
              ...userData,
              passwordHash
            });
          }
        `
      }
    }
  ],
  testFramework: "jest",
  coverageTarget: 90,
  testType: "unit",
  customRules: [
    "test all error paths",
    "include edge cases",
    "mock external dependencies"
  ]
})

// Returns:
// {
//   testFiles: [
//     {
//       path: "tests/auth/user-service.test.ts",
//       content: `
// import { UserService } from '../../src/auth/user-service';
// import { UserRepository } from '../../src/repositories/user-repository';
// import { AuthenticationError, ValidationError } from '../../src/errors/auth-errors';

// describe('UserService', () => {
//   let userService: UserService;
//   let mockUserRepository: jest.Mocked<UserRepository>;

//   beforeEach(() => {
//     mockUserRepository = {
//       findByEmail: jest.fn(),
//       create: jest.fn()
//     } as any;
//     userService = new UserService(mockUserRepository);
//   });

//   describe('authenticateUser', () => {
//     it('should authenticate user with valid credentials', async () => {
//       const mockUser = { id: '1', email: 'test@example.com', passwordHash: 'hashed_password' };
//       mockUserRepository.findByEmail.mockResolvedValue(mockUser);
//       jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

//       const result = await userService.authenticateUser('test@example.com', 'password');

//       expect(result).toEqual(mockUser);
//       expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
//     });

//     it('should throw AuthenticationError for invalid credentials', async () => {
//       const mockUser = { id: '1', email: 'test@example.com', passwordHash: 'hashed_password' };
//       mockUserRepository.findByEmail.mockResolvedValue(mockUser);
//       jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

//       await expect(userService.authenticateUser('test@example.com', 'wrong_password'))
//         .rejects.toThrow(AuthenticationError);
//     });

//     it('should throw AuthenticationError for non-existent user', async () => {
//       mockUserRepository.findByEmail.mockResolvedValue(null);

//       await expect(userService.authenticateUser('nonexistent@example.com', 'password'))
//         .rejects.toThrow(AuthenticationError);
//     });
//   });

//   describe('createUser', () => {
//     it('should create user with valid data', async () => {
//       const userData = { email: 'new@example.com', password: 'password123' };
//       const expectedUser = { id: '2', email: 'new@example.com', passwordHash: 'hashed_new_password' };
      
//       mockUserRepository.findByEmail.mockResolvedValue(null);
//       jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_new_password');
//       mockUserRepository.create.mockResolvedValue(expectedUser);

//       const result = await userService.createUser(userData);

//       expect(result).toEqual(expectedUser);
//       expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('new@example.com');
//     });

//     it('should throw ValidationError for existing email', async () => {
//       const userData = { email: 'existing@example.com', password: 'password123' };
//       const existingUser = { id: '1', email: 'existing@example.com' };
      
//       mockUserRepository.findByEmail.mockResolvedValue(existingUser);

//       await expect(userService.createUser(userData))
//         .rejects.toThrow(ValidationError);
//     });
//   });
// });
//       `,
//       framework: "jest",
//       testCount: 5,
//       coverageEstimate: 85
//     }
//   ],
//   metadata: {
//     totalTests: 5,
//     estimatedCoverage: 85,
//     frameworks: ["jest"],
//     testTypes: ["unit"],
//     generatedAt: "2024-01-10T10:30:00Z"
//   }
// }
```

### Run Tests and Validate
```typescript
// Execute test suite and validate results
const testResults = await run_tests({
  testFiles: [
    "tests/auth/user-service.test.ts",
    "tests/auth/auth-middleware.test.ts"
  ],
  testFramework: "jest",
  testEnvironment: {
    node: true,
    setupFiles: ["tests/setup.ts"],
    coverageDirectory: "coverage",
    collectCoverage: true,
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  },
  timeout: 30000
})

// Returns:
// {
//   success: true,
//   results: {
//     totalTests: 12,
//     passed: 11,
//     failed: 1,
//     skipped: 0,
//     duration: 2340,
//     coverage: {
//       lines: 87.5,
//       functions: 85.2,
//       branches: 82.1,
//       statements: 89.3
//     }
//   },
//   failedTests: [
//     {
//       testName: "createUser should throw ValidationError for existing email",
//       error: "Expected ValidationError to be thrown",
//       stack: "Error: Expected ValidationError to be thrown...",
//       file: "tests/auth/user-service.test.ts",
//       line: 45
//     }
//   ],
//   recommendations: [
//     "Fix failing test in user creation validation",
//     "Consider adding more edge case tests for password validation"
//   ]
// }
```

### Detect Regressions
```typescript
// Detect potential regressions in code changes
const regressionAnalysis = await detect_regressions({
  newCode: [
    {
      filePath: "src/auth/user-service.ts",
      changes: "Modified authentication logic to use new token format"
    }
  ],
  baselineTests: [
    {
      testName: "authenticateUser should accept valid tokens",
      expectedResult: "User object",
      criticality: "high"
    },
    {
      testName: "authenticateUser should reject expired tokens",
      expectedResult: "AuthenticationError",
      criticality: "high"
    }
  ],
  regressionRules: [
    "check for breaking API changes",
    "validate return type consistency",
    "ensure error handling preserved"
  ],
  severity: "high"
})

// Returns:
// {
//   regressionsDetected: true,
//   regressions: [
//     {
//       type: "api_breaking_change",
//       severity: "high",
//       description: "Token format change may break existing clients",
//       affectedTests: ["authenticateUser should accept valid tokens"],
//       recommendation: "Maintain backward compatibility or create migration path"
//     }
//   ],
//   riskAssessment: {
//     overall: "high",
//     impact: "Existing authentication flows",
//   mitigation: [
//     "Add backward compatibility layer",
//     "Update client libraries",
//     "Communicate breaking changes"
//   ]
//   }
// }
```

## Agent Configuration

- **Name**: TestVerificationAgent
- **Mode**: subagent (specialized for test generation and validation)
- **Permissions**: Read/write for test files and execution
- **Temperature**: 0.2 (consistent and reliable test generation)
- **Top-P**: 0.8

## Supported Test Frameworks

### JavaScript/TypeScript
- **Jest**: Popular testing framework with built-in mocking
- **Vitest**: Fast unit test framework with Vite integration
- **Mocha**: Flexible testing framework with assertion libraries
- **Jasmine**: Behavior-driven development framework

### Python
- **pytest**: Powerful testing framework with fixtures
- **unittest**: Python's built-in testing framework
- **nose2**: Extension of unittest with plugins

### Other Languages
- **JUnit**: Java testing framework
- **GoTest**: Go language testing
- **RSpec**: Ruby testing framework

## Test Generation Strategies

### Code Analysis-Based Generation
- Static code analysis for function signatures
- Control flow analysis for test paths
- Dependency analysis for mocking requirements
- Type analysis for input validation

### Behavior-Based Generation
- Analyze function behavior and side effects
- Generate tests based on expected outcomes
- Create boundary condition tests
- Generate error handling tests

### Coverage-Driven Generation
- Identify uncovered code paths
- Generate tests to increase coverage
- Focus on critical code sections
- Prioritize high-risk areas

## Test Quality Metrics

### Code Coverage
- **Line Coverage**: Percentage of code lines executed
- **Branch Coverage**: Percentage of conditional branches tested
- **Function Coverage**: Percentage of functions called
- **Statement Coverage**: Percentage of statements executed

### Test Effectiveness
- **Mutation Score**: Resistance to code mutations
- **Fault Detection**: Ability to find real bugs
- **Regression Detection**: Ability to catch regressions
- **Maintainability**: Ease of test maintenance

## Integration Points

- **CI/CD Pipelines**: GitHub Actions, GitLab CI, Jenkins
- **Code Review Tools**: GitHub PR checks, Gerrit reviews
- **Coverage Services**: Codecov, Coveralls, SonarQube
- **Notification Systems**: Slack, Teams, Email alerts
- **Project Management**: Jira, Linear, Asana integration

## Error Handling

The agent provides comprehensive error handling:
- Test generation failures with detailed error messages
- Test execution errors with stack traces
- Framework compatibility issues
- File system and permission errors
- Network and dependency resolution failures

## Performance Optimization

- **Parallel Test Execution**: Run tests concurrently
- **Smart Test Selection**: Run only relevant tests
- **Test Caching**: Cache test results and dependencies
- **Incremental Testing**: Test only changed components
- **Resource Management**: Optimize memory and CPU usage

## Security Considerations

- **Test Data Security**: Sanitize test data and credentials
- **Dependency Scanning**: Check test dependencies for vulnerabilities
- **Access Control**: Restrict test execution permissions
- **Audit Logging**: Log all test activities
- **Secure Test Environments**: Isolated test execution

## Monitoring and Analytics

### Test Metrics
- Test execution time trends
- Pass/fail rates over time
- Coverage improvement tracking
- Test flakiness detection

### Quality Metrics
- Bug detection rates
- Regression prevention effectiveness
- Test maintenance overhead
- Developer satisfaction scores

## Dependencies

- `@opencode-ai/plugin` - OpenCode plugin framework
- Test framework adapters and parsers
- Code analysis and AST parsing libraries
- Coverage analysis tools
- Static analysis and security scanning tools

## Configuration Options

### Test Generation
- Default test framework selection
- Coverage targets and thresholds
- Test style and formatting preferences
- Mock and stub generation rules

### Execution Settings
- Timeout configurations
- Parallel execution limits
- Environment setup requirements
- Reporting and output formats

## Testing

The agent includes comprehensive test coverage:
- Unit tests for test generation logic
- Integration tests with multiple frameworks
- Performance tests for large codebases
- Security tests for test execution
- End-to-end workflow tests

## Best Practices

### Test Generation
- Generate meaningful and maintainable tests
- Focus on critical functionality
- Include edge cases and error conditions
- Use appropriate assertion styles

### Test Execution
- Run tests in isolated environments
- Use consistent test data
- Implement proper cleanup procedures
- Monitor test performance

### Coverage Management
- Aim for high but meaningful coverage
- Focus on critical code paths
- Address uncovered code systematically
- Balance coverage with test quality