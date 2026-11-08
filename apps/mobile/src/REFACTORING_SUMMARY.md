# LIFEOS Mobile App Refactoring Summary

## Overview

This refactoring introduces design patterns and improved code organization to the LIFEOS mobile application's backend. The refactoring focuses on:

1. **Design Patterns Implementation**
2. **Code Reusability**
3. **Better Type Safety**
4. **Improved Testability**
5. **Enhanced Maintainability**

## Directory Structure

```
apps/mobile/src/
├── core/
│   ├── patterns/           # Design pattern implementations
│   │   ├── strategy.ts    # Strategy pattern for interchangeable algorithms
│   │   ├── factory.ts     # Factory pattern for object creation
│   │   ├── observer.ts    # Observer pattern for event-driven architecture
│   │   ├── singleton.ts   # Singleton pattern for single instances
│   │   ├── decorator.ts   # Decorator pattern for adding behavior
│   │   └── index.ts       # Export all patterns
│   ├── exceptions/         # Custom error types
│   │   └── base.ts        # Base error classes for the application
│   ├── utils/              # Utility functions
│   │   ├── types.ts       # Shared type definitions
│   │   ├── apiHelper.ts   # API client utilities
│   │   ├── validation.ts  # Data validation utilities
│   │   ├── normalizer.ts  # Data normalization utilities
│   │   ├── formatter.ts   # Data formatting utilities
│   │   ├── errorHandler.ts # Error handling utilities
│   │   └── index.ts       # Export all utilities
│   └── index.ts           # Export all core functionality
├── api/
│   ├── types.ts           # API type definitions
│   ├── client.ts          # API client implementation with design patterns
│   └── index.ts           # Export API functionality
├── engines/               # Engine implementations
│   ├── engine.ts          # Base engine interface and abstract class
│   ├── registry.ts        # Engine registry with Factory and Observer patterns
│   ├── implementations.ts # Concrete engine implementations
│   └── index.ts           # Export engine functionality
└── hooks/
    ├── useLifeOs.ts       # React hooks for LIFEOS state management
    └── index.ts           # Export all hooks
```

## Design Patterns Implemented

### 1. Strategy Pattern (`core/patterns/strategy.ts`)

The Strategy pattern enables selecting an algorithm's behavior at runtime. It defines a family of algorithms, encapsulates each one, and makes them interchangeable.

**Key Classes:**
- `StrategyContext<T, R>` - Context that uses a strategy
- `FetchStrategy` - Strategy for making HTTP requests
- `RetryStrategy` - Strategy with retry logic
- `TimeoutStrategy` - Strategy with timeout handling
- `RetryWithTimeoutStrategy` - Combined retry and timeout strategy

**Usage:**
```typescript
const context = new StrategyContext(new FetchStrategy());
const response = await context.execute(new Request('https://api.test.com'));
```

### 2. Factory Pattern (`core/patterns/factory.ts`)

The Factory pattern provides an interface for creating objects in a superclass, but allows subclasses to alter the type of objects that will be created.

**Key Classes:**
- `Factory<T, Args>` - Generic factory interface
- `SingletonFactory<T>` - Factory that ensures only one instance
- `ObjectFactory<T, K>` - Factory for creating different types based on a key
- `HeadersFactory` - Factory for creating HTTP headers
- `UrlFactory` - Factory for creating URLs with query parameters
- `TimeoutFactory` - Factory for creating timeout promises

**Usage:**
```typescript
const factory = new ObjectFactory<Engine, EngineId>();
factory.register('memory', () => new MemoryEngine());
const engine = factory.create('memory');
```

### 3. Observer Pattern (`core/patterns/observer.ts`)

The Observer pattern defines a one-to-many dependency between objects so that when one object changes state, all its dependents are notified and updated automatically.

**Key Classes:**
- `Observer<T>` - Interface for observers
- `Subject<T>` - Subject (Observable) class
- `EventEmitter<T>` - Event emitter implementation
- `BaseObserver<T>` - Base class for observers
- `CallbackObserver<T>` - Observer that wraps a callback function
- `DebouncedObserver<T>` - Observer with debounce logic

**Usage:**
```typescript
const subject = new Subject<string>();
const observer = { update: (data) => console.log(data) };
subject.subscribe(observer);
subject.notify('Hello, World!');
```

### 4. Singleton Pattern (`core/patterns/singleton.ts`)

The Singleton pattern ensures a class has only one instance and provides a global point of access to it.

**Key Classes:**
- `BaseSingleton` - Base singleton class
- `AsyncSingleton` - Thread-safe singleton with async support
- `SingletonContainer` - Container for managing multiple singletons
- `createSingleton<T>(creator)` - Factory function for creating singletons
- `createAsyncSingleton<T>(creator)` - Factory function for creating async singletons

**Usage:**
```typescript
class MySingleton extends BaseSingleton {
  // Implementation
}
const instance = MySingleton.getInstance();
```

### 5. Decorator Pattern (`core/patterns/decorator.ts`)

The Decorator pattern attaches additional responsibilities to an object dynamically. It provides a flexible alternative to subclassing for extending functionality.

**Key Classes:**
- `Component<T, R>` - Component interface
- `Decorator<T, R>` - Base decorator class
- `LoggingDecorator<T, R>` - Decorator that adds logging
- `RetryDecorator<T, R>` - Decorator that adds retry logic
- `CacheDecorator<T, R>` - Decorator that caches results
- `TimeoutDecorator<T, R>` - Decorator that adds timeout
- `ValidationDecorator<T, R>` - Decorator that validates input/output

**Utility Functions:**
- `composeDecorators()` - Compose multiple decorators
- `decorate()` - Decorate a function
- `memoize()` - Memoize a function

**Usage:**
```typescript
const component = { execute: (data) => 'result' };
const decorated = new LoggingDecorator(new CacheDecorator(component));
const result = await decorated.execute('test');
```

## Core Utilities

### Exception Handling (`core/exceptions/base.ts`)

Custom error classes for better error handling:

- `MobileAppError` - Base error class
- `NetworkError` - Network-related errors
- `ApiError` - API-related errors
- `ValidationError` - Validation errors
- `AuthError` - Authentication errors
- `StorageError` - Storage-related errors
- `StateError` - State management errors

**Helper Functions:**
- `isLIFEOSError()` - Check if error is a LIFEOS error
- `extractErrorDetails()` - Extract error details for logging

### API Utilities (`core/utils/apiHelper.ts`)

- `normalizeUrl()` - Normalize URL with protocol
- `joinUrl()` - Join URL paths
- `buildQueryString()` - Build query string from params
- `buildUrl()` - Build complete URL
- `request()` - Make HTTP requests with error handling
- `api` - Convenience methods for HTTP verbs
- `checkApiHealth()` - Check API health

### Validation Utilities (`core/utils/validation.ts`)

- Built-in validators (required, string, number, email, url, uuid, etc.)
- `validateValue()` - Validate a single value
- `validate()` - Validate an object against a schema
- `validateOrThrow()` - Validate and throw on error
- `isEmpty()` - Check if value is empty
- `isPlainObject()` - Check if value is a plain object

### Normalization Utilities (`core/utils/normalizer.ts`)

- `normalizeString()` - Normalize to lowercase and trim
- `toCamelCase()`, `toSnakeCase()`, `toKebabCase()`, `toPascalCase()` - Case conversion
- `normalizeKeysToCamelCase()`, `normalizeKeysToSnakeCase()` - Normalize object keys
- `flattenObject()`, `unflattenObject()` - Convert between nested and flat objects
- `normalizeTypes()` - Convert values to specific types
- `removeEmptyValues()` - Remove null, undefined, and empty values
- `deepClone()` - Deep clone an object
- `deepEqual()` - Deep compare objects

### Formatter Utilities (`core/utils/formatter.ts`)

- Date formatting: `formatDate()`, `formatRelativeTime()`
- Number formatting: `formatNumber()`, `formatCurrency()`, `formatPercentage()`
- Byte formatting: `formatBytes()`
- Duration formatting: `formatDuration()`
- List formatting: `formatList()`
- Phone number formatting: `formatPhoneNumber()`
- String formatting: `formatTitleCase()`, `formatSentenceCase()`, `formatSlug()`
- File size formatting: `formatFileSize()`
- Markdown formatting: `formatMarkdownBasic()`

### Error Handler (`core/utils/errorHandler.ts`)

- `createErrorHandler()` - Create error handler with configuration
- `errorHandler` - Default error handler instance
- `logError()` - Log errors with context
- `normalizeError()` - Normalize errors to MobileAppError
- `getErrorMessage()` - Get error message
- `getErrorCode()` - Get error code
- `isNetworkError()` - Check if error is network-related
- `isTimeoutError()` - Check if error is timeout
- `isRetryableError()` - Check if error should be retried
- `retry()` - Retry a function with exponential backoff
- `sleep()` - Sleep for specified duration
- `debounce()` - Debounce a function
- `throttle()` - Throttle a function

## API Client (`api/client.ts`)

The API client uses design patterns for better organization:

- **Strategy Pattern** - Different request strategies (fetch, retry, timeout)
- **Singleton Pattern** - Single instance for default client
- **Factory Pattern** - Factory for creating clients

**Key Features:**
- Configurable base URL, timeout, retries
- Authentication support with token management
- Request/response interceptors
- Error handling with custom error types
- Convenience methods for each HTTP verb
- Engine-specific methods

**Usage:**
```typescript
import { apiClient, createApiClient } from './api';

// Use default client
const response = await apiClient.get<{ data: string }>('/api/data');

// Create custom client
const customClient = createApiClient({ baseUrl: 'https://custom.api' });

// Set auth token
apiClient.setAuthToken('your-token');

// Run engine
const result = await apiClient.runEngine({ engineId: 'memory', input: { goals: [] } });
```

## Engine System (`engines/`)

The engine system uses design patterns for extensibility:

- **Strategy Pattern** - Each engine implements a strategy for processing input
- **Factory Pattern** - Engine registry creates engines on demand
- **Singleton Pattern** - Global engine registry
- **Observer Pattern** - Lifecycle events for engines

**Key Components:**

### Engine Interface (`engines/engine.ts`)

- `EnginePlugin` - Interface for engine plugins
- `BaseEngine` - Abstract base class for engines
- `NullEngine` - Fallback engine
- Engine descriptor types

### Engine Registry (`engines/registry.ts`)

- `EngineRegistry` - Main registry class
- `EngineLifecycleEvent` - Types for engine lifecycle events
- `engines` - Default registry instance
- `CachedEngineRegistry` - Registry with caching

### Engine Implementations (`engines/implementations.ts`)

- `ActivitySummaryEngine` - Summarizes user activities
- `GoalProgressEngine` - Analyzes goal completion
- `TimeAnalysisEngine` - Analyzes temporal patterns
- `PriorityAnalysisEngine` - Analyzes goal priorities
- `SessionDensityEngine` - Analyzes session frequency
- `NeuroSymbolicEngine` - Neuro-symbolic AI (mock implementation)
- `MultiAgentEngine` - Multi-agent analysis (mock implementation)

**Usage:**
```typescript
import { engines, ActivitySummaryEngine } from './engines';

// Register engine
engines.register(new ActivitySummaryEngine());

// Run engine
const result = await engines.run('memory', { goals: [] });

// List all engines
const allEngines = engines.list();
```

## React Hooks (`hooks/useLifeOs.ts`)

React hooks for state management using design patterns:

- **Observer Pattern** - State changes notify observers
- **Singleton Pattern** - Global store instance
- **Strategy Pattern** - Different update strategies

**Hooks:**

### `useLifeOs()`
Returns the complete LIFEOS state.

### `useLifeOsSelector<T>(selector, equalityFn?)`
Selects a specific part of the state with optional memoization.

### `useLifeOsDispatch()`
Returns dispatch function and action creators.

### `useGoals()`
Manages goals with CRUD operations.

### `useEngines()`
Manages engine execution and results.

### `useAuth()`
Manages authentication state.

### `useLifeOsInit()`
Manages initialization state.

**State Management:**
- `LifeOsStore` - Store class with observer pattern
- `actions` - Action creators
- `reducer` - State reducer function
- `store` - Default store instance

**Usage:**
```typescript
import { useGoals, useAuth } from './hooks';

function GoalList() {
  const { goals, loading, error, selectGoal, addGoal } = useGoals();
  const { user, isAuthenticated, login, logout } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {goals.map((goal) => (
        <div key={goal.id} onClick={() => selectGoal(goal.id)}>
          {goal.title}
        </div>
      ))}
    </div>
  );
}
```

## Testing

Each module includes comprehensive test files (in `__tests__` directories):

- Strategy pattern tests
- Factory pattern tests
- Observer pattern tests
- Singleton pattern tests
- Decorator pattern tests
- Pattern exports tests

## Benefits

1. **Separation of Concerns** - Each pattern handles a specific responsibility
2. **Extensibility** - New functionality can be added without modifying existing code
3. **Reusability** - Common functionality is extracted into reusable utilities
4. **Maintainability** - Clear structure and organization
5. **Testability** - Design patterns make code easier to test
6. **Type Safety** - Strong typing throughout the codebase
7. **Documentation** - Comprehensive JSDoc comments

## Migration Guide

To migrate existing code to use the new patterns:

1. **Replace direct API calls** with `apiClient` methods:
   ```typescript
   // Old
   fetch('/api/goals')
   
   // New
   apiClient.get('/api/goals')
   ```

2. **Replace error handling** with custom error types:
   ```typescript
   // Old
   try { /* ... */ } catch (error) { console.error(error); }
   
   // New
   try { /* ... */ } catch (error) {
     if (isLIFEOSError(error)) {
       console.error('Code:', error.code, 'Message:', error.message);
     }
   }
   ```

3. **Use engines** instead of direct logic:
   ```typescript
   // Old
   const summary = `You have ${goals.length} goals`;
   
   // New
   const result = await engines.run('memory', { goals });
   const summary = result.summary;
   ```

4. **Use hooks** for state management:
   ```typescript
   // Old
   const [goals, setGoals] = useState([]);
   
   // New
   const { goals, loading, error } = useGoals();
   ```

## Future Enhancements

1. Add more design patterns (Command, Mediator, State, etc.)
2. Add more utility functions
3. Add comprehensive documentation
4. Add integration tests
5. Add performance benchmarks
6. Add more engine implementations
7. Add support for Web Workers
8. Add offline capabilities
