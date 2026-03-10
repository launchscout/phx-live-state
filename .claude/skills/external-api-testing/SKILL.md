---
name: external-api-testing
description: Use this skill when writing tests for code that interacts with external APIs, third-party services, or LLMs. Covers the behaviour/fake module pattern with configurable implementations.
---

# Testing Code That Interacts with External APIs

When testing code that calls external APIs (HTTP services, LLMs, third-party integrations), use a configurable module pattern that allows swapping implementations between production and test environments.

## Pattern Overview

1. **Define a behaviour** that specifies the contract
2. **Create the real implementation** that calls the external API
3. **Create a fake/stub implementation** for testing
4. **Configure which implementation to use** via application config

## Step-by-Step Implementation

### 1. Define the Behaviour

Create a behaviour module that defines the callback(s) your API client must implement:

```elixir
defmodule MyApp.ExternalService.Behaviour do
  @moduledoc """
  Behaviour for interacting with ExternalService.
  """

  @callback fetch_data(id :: String.t()) :: {:ok, map()} | {:error, term()}
  @callback create_resource(params :: map()) :: {:ok, map()} | {:error, term()}
end
```

### 2. Create the Real Implementation

The production module that actually calls the external API:

```elixir
defmodule MyApp.ExternalService do
  @moduledoc """
  Real implementation that calls the external API.
  """
  @behaviour MyApp.ExternalService.Behaviour

  @impl true
  def fetch_data(id) do
    # Actual HTTP call or API interaction
    case Req.get("https://api.example.com/data/#{id}") do
      {:ok, %{status: 200, body: body}} -> {:ok, body}
      {:ok, %{status: status}} -> {:error, {:http_error, status}}
      {:error, reason} -> {:error, reason}
    end
  end

  @impl true
  def create_resource(params) do
    # Actual API call
  end
end
```

### 3. Create the Fake Implementation

A test double that returns predictable results without network calls. Use an Agent to allow tests to configure dynamic responses:

```elixir
defmodule MyApp.ExternalService.Fake do
  @moduledoc """
  Fake implementation for testing. Returns predictable results
  without making external API calls.

  Supports dynamic responses via an Agent for tests that need
  specific return values.
  """
  @behaviour MyApp.ExternalService.Behaviour

  use Agent

  def start_link(_opts \\ []) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  @doc """
  Sets a custom response for a specific function.
  Call this in your test setup to configure what the fake returns.

  ## Examples

      MyApp.ExternalService.Fake.set_response(:fetch_data, {:ok, %{"custom" => "data"}})
  """
  def set_response(function_name, response) do
    Agent.update(__MODULE__, &Map.put(&1, function_name, response))
  end

  @doc """
  Clears all custom responses, reverting to default behavior.
  """
  def reset do
    Agent.update(__MODULE__, fn _ -> %{} end)
  end

  @impl true
  def fetch_data(id) do
    case get_response(:fetch_data) do
      nil -> default_fetch_response(id)
      response -> response
    end
  end

  defp get_response(function_name) do
    Agent.get(__MODULE__, &Map.get(&1, function_name))
  end

  defp default_fetch_response(id) do
    case id do
      "valid_id" -> {:ok, %{"id" => id, "name" => "Test Data"}}
      "not_found" -> {:error, :not_found}
      "error" -> {:error, {:api_error, "Something went wrong"}}
      _ -> {:ok, %{"id" => id, "name" => "Default Test Data"}}
    end
  end

  @impl true
  def create_resource(params) do
    case get_response(:create_resource) do
      nil -> {:ok, Map.put(params, "id", "generated_id_123")}
      response -> response
    end
  end
end
```

### 4. Configure the Implementation

In `config/config.exs` (default/production):
```elixir
config :my_app, :external_service, MyApp.ExternalService
```

In `config/test.exs`:
```elixir
config :my_app, :external_service, MyApp.ExternalService.Fake
```

### 5. Use the Configured Module

In your application code, fetch the configured module:

```elixir
defmodule MyApp.BusinessLogic do
  def process_external_data(id) do
    external_service = Application.get_env(:my_app, :external_service, MyApp.ExternalService)

    with {:ok, data} <- external_service.fetch_data(id) do
      # Process the data
      {:ok, transform_data(data)}
    end
  end
end
```

### 6. Write Tests

Tests use the fake implementation automatically via config:

```elixir
defmodule MyApp.BusinessLogicTest do
  use MyApp.DataCase

  describe "process_external_data/1" do
    test "successfully processes valid data" do
      # The fake returns predictable data for "valid_id"
      assert {:ok, result} = MyApp.BusinessLogic.process_external_data("valid_id")
      assert result.name == "Test Data"
    end

    test "handles not found error" do
      assert {:error, :not_found} = MyApp.BusinessLogic.process_external_data("not_found")
    end

    test "handles API errors" do
      assert {:error, {:api_error, _}} = MyApp.BusinessLogic.process_external_data("error")
    end
  end
end
```

## Advanced: Dynamic Test Responses

For tests that need specific responses, use the fake's Agent-based API:

```elixir
defmodule MyApp.BusinessLogicTest do
  use MyApp.DataCase

  setup do
    # Reset fake state before each test
    MyApp.ExternalService.Fake.reset()
    :ok
  end

  test "handles specific edge case" do
    # Configure a custom response for this test
    MyApp.ExternalService.Fake.set_response(:fetch_data, {:ok, %{"special" => "response"}})

    assert {:ok, result} = MyApp.BusinessLogic.process_external_data("any_id")
    assert result.special == "response"
  end

  test "handles API timeout" do
    MyApp.ExternalService.Fake.set_response(:fetch_data, {:error, :timeout})

    assert {:error, :timeout} = MyApp.BusinessLogic.process_external_data("any_id")
  end
end
```

### Starting the Fake Agent

Add the fake to your test supervision tree in `test/test_helper.exs`:

```elixir
# Start fake agents for testing
{:ok, _} = MyApp.ExternalService.Fake.start_link()

ExUnit.start()
```

Or start it in a setup block if you prefer per-module control:

```elixir
setup_all do
  {:ok, _pid} = MyApp.ExternalService.Fake.start_link()
  :ok
end
```

## File Organization

```
lib/my_app/
  external_service/
    behaviour.ex          # The behaviour definition
    external_service.ex   # Real implementation (or just external_service.ex at parent level)
    fake.ex               # Fake implementation for tests
```

## Key Principles

1. **Behaviour defines the contract** - Both real and fake must implement the same callbacks
2. **Config determines implementation** - No code changes needed to switch between real/fake
3. **Fake is predictable** - Use known input values to get known outputs
4. **Default to real** - `Application.get_env(:app, :key, DefaultModule)` ensures production uses real implementation even if config is missing
5. **Keep fakes simple** - They should return canned responses, not simulate complex logic
