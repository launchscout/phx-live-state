---
name: tdd
description: Use this skill when working on any new feature. It enforces a strict test-driven development workflow where tests are written before implementation code.
autoInvoke: true
---

# Test-Driven Development (TDD)

When building any new feature, follow the Red-Green-Refactor cycle strictly. Do NOT write implementation code before writing a failing test.

## The Workflow

### 1. Red: Write a Failing Test First
- Before writing implementation code, write a test that describes the expected behavior
- Run the test and confirm it **fails** for the right reason (not a syntax error or missing module, but a genuine assertion failure or missing function). Pick a test case that will genuinely fail — typically the case that contradicts the current default or existing behavior.
- If the test fails for the wrong reason (e.g. compilation error from missing module), create just enough skeleton code (empty module, function head returning nil) to get a proper assertion failure

### 2. Green: Write the Minimum Code to Pass
- Write only the code necessary to make the failing test pass
- Do not add extra functionality, handle edge cases, or refactor yet
- Run the test and confirm it **passes**

### 3. Refactor: Clean Up
- Now improve the code: rename, extract, simplify
- Run the tests after each refactoring step to make sure they still pass
- This is also the time to consider if additional test cases are needed for edge cases or error paths

### 4. Repeat
- Pick the next piece of behavior and start a new Red-Green-Refactor cycle

## Practical Guidelines

- **One test at a time**: Write exactly ONE failing test, watch it fail, make it pass, then move on to the next test. Do NOT write multiple tests before implementing. The rhythm is: write test → run test (red) → write code → run test (green) → repeat.
- **Small steps**: Each cycle should cover one small, well-defined behavior. A single cycle should not try to implement an entire feature at once.
- **Run tests frequently**: Run `mix test` (or the relevant subset) after every change, both test and implementation.
- **Test naming**: Test descriptions should read like specifications of behavior, e.g. `"returns only items with nil received_date"` not `"test filter function"`.
- **One assertion focus**: Each test should ideally verify one logical behavior. Multiple asserts are fine if they verify aspects of the same behavior.
- **Use factories**: Always use ExMachina factories (`insert/2`, `build/2`) for test data.

## When Working on a Feature

1. Start by understanding the requirement
2. Break it into small, testable behaviors
3. Use the TodoWrite tool to list the behaviors as individual TDD cycles
4. Work through each cycle one test at a time: Red -> Green -> Refactor
5. After all cycles, run the full test suite (`mix test` and `npm run test --prefix assets`)
6. Invoke the `code-review` skill when done
