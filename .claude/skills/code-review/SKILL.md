---
name: code-review
description: Use this skill to perform a code review. This should be done every time a task involving new feature development is completed
---

When you finish writing the code and running *all* the tests, here are some things to consider:

## Code Quality: THE MOST IMPORTANT THING

Above all else, the code should, in the words of Kent Beck, clearly communicate it's intent. When you read it, it should as easy as possible to understand what it does.

- Functions should well named
- overly complex code (excessive branching, etc) should be simplified
- Code should be idiomatic to the language/technology used
- Is the code duplicated more than once? A single duplication can sometimes be acceptable, but a third time is not
- Are there other opportunities for refactoring?

## Test Coverage

**For every new or modified public function in the diff:**
- Find the corresponding test file
- Verify there is at least one test that calls that function directly (not just as a side-effect of testing something else)
- If a context module gained new public functions, those functions need their own describe block with direct tests

- How are the tests? Too many? Not enough? Do the tests actually test the feature or is there so much mocking the tests are meaningless

### End-to-End Tests (IMPORTANT)
**Always evaluate whether acceptance/e2e tests are needed.** Ask:
- Does this change affect the UI or user interactions?
- Does it involve custom elements (waylo-*, lit elements)?
- Does it add/modify channel or LiveState events?
- Does it involve file uploads?
- Does it add error messages displayed to users?

If ANY of these are true, **invoke the `acceptance-testing` skill** to write Playwright browser tests.

Existing browser tests are in `test/waylo_web/features/*_browser_test.exs`. Review these to see patterns and ensure the new feature has appropriate coverage.

## Final Checklist
- [ ] Code is clear and concise
- [ ] Unit tests cover the core logic
- [ ] Integration tests verify component interactions
- [ ] E2E tests verify user-facing behavior (if applicable)
- [ ] All tests pass (`mix test` and `npm run test --prefix assets`)
