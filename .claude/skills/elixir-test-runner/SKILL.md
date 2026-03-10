---
name: Elixir Test Runner
description: This skill describes how to use the Elixir test runner
---

To run all of the tests in the project, use:

```
mix test
```

To include tagged test:

```
mix test --include tag
```

To run a single test specify a line number:

```
mix tests test/waylo/customers_test.exs:34
```

Do not add extra flags or redirect standard error or output when using mix test.
