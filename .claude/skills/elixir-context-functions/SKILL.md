---
name: elixir-context-functions
description: Use this skill when writing Elixir context functions that involve multi-step operations, external API calls, or database operations. Covers using `with` statements, proper error handling, and organizing code in Phoenix contexts.
---

# Writing Clean Elixir Context Functions

When implementing business logic in Phoenix contexts, follow these patterns for clear, maintainable code.

## Use `with` Instead of Nested `case` or `cond`

When you have multiple operations that can fail, use `with` to chain them cleanly:

### Bad - Nested case statements
```elixir
def fulfill_order(order) do
  case get_customer_id(order.customer) do
    {:ok, customer_id} ->
      case get_product_id(order.product) do
        {:ok, product_id} ->
          case add_to_cart(customer_id, product_id) do
            {:ok, result} ->
              delete_order(order)
              {:ok, result}
            {:error, reason} -> {:error, reason}
          end
        {:error, reason} -> {:error, reason}
      end
    {:error, reason} -> {:error, reason}
  end
end
```

### Bad - cond with do_xxx helper pattern
```elixir
def fulfill_order(order) do
  cond do
    customer_id = get_customer_id(order.customer) ->
      do_fulfill_with_customer(order, customer_id)
    true ->
      {:error, :missing_customer_id}
  end
end

defp do_fulfill_with_customer(order, customer_id) do
  cond do
    product_id = get_product_id(order.product) ->
      do_fulfill_with_product(order, customer_id, product_id)
    true ->
      {:error, :missing_product_id}
  end
end
```

### Good - Using `with`
```elixir
def fulfill_order(order) do
  with {:ok, customer_id} <- get_customer_id(order.customer),
       {:ok, product_id} <- get_product_id(order.product),
       {:ok, result} <- add_to_cart(customer_id, product_id),
       {:ok, _deleted} <- delete_order(order) do
    {:ok, result}
  end
end
```

## Return Structured Errors

Return errors that include context for debugging and handling:

```elixir
defp get_opencart_id(external_ids, type, id) do
  case get_in(external_ids || %{}, ["opencart"]) do
    nil -> {:error, {:"missing_#{type}_opencart_id", id}}
    opencart_id -> {:ok, opencart_id}
  end
end
```

This allows callers to pattern match on specific error types:

```elixir
case fulfill_order(order) do
  {:ok, result} ->
    Logger.info("Success!")
  {:error, {:missing_customer_opencart_id, customer_id}} ->
    Logger.warning("Customer #{customer_id} has no OpenCart ID")
  {:error, {:missing_product_opencart_id, product_id}} ->
    Logger.warning("Product #{product_id} has no OpenCart ID")
  {:error, reason} ->
    Logger.error("Failed: #{inspect(reason)}")
end
```

## Keep Context Functions Focused

Context functions should be the public API for a domain. They should:

1. **Accept minimal parameters** - Prefer structs with preloaded associations over many separate parameters
2. **Return meaningful results** - Return what callers need for logging/debugging
3. **Handle one concern** - Break complex operations into composable functions

### Bad - Too many parameters
```elixir
def fulfill_backorder(customer_id, product_id, order_id, line_item_id, quantity, opts) do
  # ...
end
```

### Good - Accept a preloaded struct
```elixir
def fulfill_backorder_line_item(%LineItem{} = line_item, opts \\ []) do
  %{order: %{customer: customer} = order, product: product} = line_item

  with {:ok, opencart_product_id} <- get_opencart_id(product.external_ids, :product, product.id),
       {:ok, opencart_customer_id} <- get_opencart_id(customer.external_ids, :customer, customer.id),
       {:ok, _response} <- add_to_cart(opencart_customer_id, opencart_product_id, line_item.quantity, opts),
       {:ok, _deleted} <- delete_line_item_and_cleanup_order(line_item) do
    {:ok, %{line_item_id: line_item.id, order_id: order.id, product_id: product.id, customer_id: customer.id}}
  end
end
```

## Separate Query Functions from Action Functions

Keep database queries separate from business logic:

```elixir
# Query function - just finds data
def find_available_backordered_line_items(since) do
  Repo.all(
    from li in LineItem,
      join: o in Order, on: li.order_id == o.id,
      join: p in Product, on: li.product_id == p.id,
      join: c in assoc(o, :customer),
      where: o.status == "backordered",
      where: p.available_quantity > 0,
      where: p.updated_at > ^since,
      where: not is_nil(fragment("?->>'opencart'", p.external_ids)),
      preload: [order: {o, customer: c}, product: p]
  )
end

# Action function - does the work
def fulfill_backorder_line_item(%LineItem{} = line_item, opts \\ []) do
  # Business logic here
end
```

## Worker Functions Should Be Thin

Oban workers and other "orchestrator" modules should delegate to context functions:

### Bad - Business logic in worker
```elixir
defmodule MyApp.Workers.FulfillmentWorker do
  def perform(%Oban.Job{args: args}) do
    # 50 lines of business logic here
    # Database queries
    # API calls
    # Error handling
  end
end
```

### Good - Worker delegates to context
```elixir
defmodule MyApp.Workers.FulfillmentWorker do
  alias MyApp.Orders

  def perform(%Oban.Job{args: args}) do
    since = calculate_since(args)
    line_items = Orders.find_available_backordered_line_items(since)

    results = Enum.map(line_items, &fulfill_line_item(&1, get_client_opts()))

    if Enum.all?(results, &match?({:ok, _}, &1)) do
      :ok
    else
      {:error, "Some items failed"}
    end
  end

  defp fulfill_line_item(line_item, opts) do
    case Orders.fulfill_backorder_line_item(line_item, opts) do
      {:ok, result} -> {:ok, result}
      {:error, reason} ->
        Logger.error("Failed: #{inspect(reason)}")
        {:error, reason}
    end
  end
end
```

## Testing Context Functions

Test context functions directly with proper setup:

```elixir
describe "fulfill_backorder_line_item/1" do
  setup do
    # Create OpenCart settings if needed
    {:ok, _} = Settings.create_opencart_settings(%{...})
    :ok
  end

  test "fulfills line item and deletes it" do
    customer = insert(:customer, external_ids: %{"opencart" => "123"})
    product = insert(:product, external_ids: %{"opencart" => "456"})
    order = insert(:order, customer: customer, status: "backordered")
    line_item = insert(:line_item, order: order, product: product)
    line_item = Repo.preload(line_item, order: :customer, product: [])

    # Stub external API
    Req.Test.stub(MyApp.ApiClient, mock_success())

    assert {:ok, result} = Orders.fulfill_backorder_line_item(line_item)
    assert result.line_item_id == line_item.id

    # Verify side effects
    assert_raise Ecto.NoResultsError, fn -> Orders.get_line_item!(line_item.id) end
  end

  test "returns structured error when customer lacks external ID" do
    customer = insert(:customer, external_ids: %{})  # No opencart ID
    # ...

    assert {:error, {:missing_customer_opencart_id, customer_id}} =
             Orders.fulfill_backorder_line_item(line_item)
    assert customer_id == customer.id
  end
end
```

## Summary Checklist

When writing context functions:

- [ ] Use `with` for multi-step operations instead of nested `case` or `cond`
- [ ] Return structured errors with `{:error, {atom, data}}` pattern
- [ ] Accept preloaded structs rather than many individual parameters
- [ ] Separate query functions from action functions
- [ ] Keep workers thin - delegate to context functions
- [ ] Return useful data from success cases for logging/debugging
- [ ] Test both success paths and each error condition
