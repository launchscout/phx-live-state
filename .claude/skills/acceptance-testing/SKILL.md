---
name: acceptance-testing
description: Use this skill when writing tests that need to exercise the system as whole. Also known as end to end tests.
---

# Acceptance Testing Guidelines

## IMPORTANT: When to Invoke This Skill

**You MUST consult this skill when:**
- Completing a code review - always check if e2e tests are needed
- Implementing any feature involving custom elements (waylo-*, lit elements)
- Adding or modifying channel/LiveState event handlers
- Implementing upload functionality
- Adding error handling that displays messages to users
- Making changes to UI state management
- Fixing bugs that involve user-facing behavior

**Ask yourself:** "Does this change affect what users see or how they interact with the app?" If yes, an acceptance test is likely needed.

For bugs or features that involve the UI, we need an acceptance test. Choose the right approach:

## When to Use Playwright Browser Tests

Use Playwright tests when testing:
- Custom elements (waylo-upload, waylo-assistant, waylo-order, etc.)
- JavaScript/TypeScript functionality
- WebSocket/LiveState channel interactions
- File uploads
- Any feature that involves client-side state management

**Location**: `test/waylo_web/features/*test.exs`

## When to Use LiveView Tests

Use LiveView tests when:
- Testing pure server-rendered LiveView pages
- No custom elements or JavaScript required
- Faster execution is preferred

## Playwright Test Structure

```elixir
defmodule WayloWeb.FeatureNameBrowserTest do
  use PhoenixTest.Playwright.Case, async: false, slow_mo: 50

  alias Waylo.Products.Search.Fake, as: FakeSearch
  import Waylo.Factory
  import PhoenixTest.Playwright, only: [click: 2, click: 3, type: 3]

  describe "feature name" do
    setup do
      FakeSearch.reset()
      :ok
    end

    test "description of behavior", %{conn: conn} do
      # 1. Setup: Create test data using factories
      user = insert(:user_with_password, email: "unique@example.com")
      customer = insert(:customer, user: user, name: "Test Customer", external_ids: %{"opencart" => "unique_id"})
      product = insert(:product, name: "Test Product", user_id: user.id, available_quantity: 50)

      # 2. Setup fakes for external services
      FakeSearch.set_responses(%{
        ~r/test product/i => product
      })

      # 3. Authentication flow
      conn
      |> visit("/users/log-in")
      |> fill_in("#login_form_password_email", "Email", with: "unique@example.com")
      |> fill_in("Password", with: "hello world!")
      |> click_button("Log in and stay logged in")

      # 4. Navigation to the feature
      |> click_link("Customers")
      |> click("tr", "Test Customer")

      # 5. Interact with the feature
      |> assert_has("waylo-upload")
      |> click_button("Make an Order")

      # 6. Assert on outcomes
      |> assert_has(".dialog-header", text: "Upload Order File")
    end
  end
end
```

## Key Playwright Helpers

```elixir
# Navigation
visit(conn, "/path")
click_link("Link Text")
click_button("Button Text")

# Clicking elements
click("selector", "description")          # Click by CSS selector
click("[data-testid='my-element']", "My Element")

# Forms
fill_in("Label", with: "value")
fill_in("#css-selector", "Label", with: "value")
type("[data-testid='input']", "text to type")

# File uploads
upload("input[type='file']", "Label", "test/support/filename.csv", [])

# Assertions
assert_has("selector")
assert_has("selector", text: "expected text")
assert_has(".class", text: "text")
refute_has("selector")
refute_has("selector", text: "text")
assert_path("/expected/path")

# Chaining with verification
|> then(fn conn ->
  # Database assertions
  orders = Waylo.Orders.list_orders(scope)
  assert length(orders) == 1
  conn
end)
```

## Common Patterns

### Testing Error States

```elixir
test "displays error message when upload fails", %{conn: conn} do
  user = insert(:user_with_password, email: "error_test@example.com")
  _customer = insert(:customer, user: user, name: "Test Customer", external_ids: %{"opencart" => "err1"})

  conn
  |> visit("/users/log-in")
  |> fill_in("#login_form_password_email", "Email", with: "error_test@example.com")
  |> fill_in("Password", with: "hello world!")
  |> click_button("Log in and stay logged in")
  |> click_link("Customers")
  |> click("tr", "Test Customer")
  |> click_button("Make an Order")
  |> upload("input[type='file']", "Select File", "test/support/invalid_format.csv", [])
  |> click("[data-testid='upload-button']", "Upload")
  |> assert_has("[data-testid='upload-error']")
  |> assert_has(".error-title", text: "Unrecognized File Format")
end
```

### Testing State Changes

```elixir
test "updates UI when state changes", %{conn: conn} do
  # ... setup ...

  conn
  |> click_button("Action")
  |> assert_has(".loading-state")  # Verify loading state
  |> assert_has(".success-state")  # Wait for success state
  |> refute_has(".loading-state")  # Verify loading is gone
end
```

### Testing with Database Verification

```elixir
test "creates record in database", %{conn: conn} do
  # ... setup and actions ...

  |> assert_path("/success/path")
  |> then(fn conn ->
    # Verify database state
    scope = Waylo.Accounts.Scope.for_user(user)
    orders = Waylo.Orders.list_orders(scope)

    assert length(orders) == 1
    [order] = orders
    assert order.status == "submitted"

    conn
  end)
end
```

## Test File Organization

Create test support files in `test/support/`:
- `test_order.csv` - Valid CSV for successful uploads
- `test_order_alternate.csv` - Alternative valid CSV
- `invalid_format.csv` - CSV with unrecognized columns for error testing

## Important Notes

1. **Unique emails**: Each test needs a unique email address to avoid conflicts
2. **Unique external IDs**: Each customer needs a unique opencart ID
3. **Reset fakes in setup**: Always call `FakeSearch.reset()` and other fake resets
4. **async: false**: Browser tests must run synchronously
5. **slow_mo: 50**: Helps with timing issues in complex interactions
6. **Wait for elements**: Use `assert_has` to wait for elements before interacting
7. **Test data-testid attributes**: Add these to components for reliable selection

## When Writing Tests for New Features

1. **First, identify what needs testing**:
   - Happy path (successful scenario)
   - Error states (validation failures, server errors)
   - Edge cases (empty inputs, boundary conditions)

2. **Create necessary test fixtures** in `test/support/` if needed

3. **Write tests that exercise the full stack**:
   - User authentication
   - Navigation to the feature
   - Interaction with the feature
   - Verification of outcomes (UI state and database state)
