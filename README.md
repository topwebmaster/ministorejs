# MiniStore

A minimalistic JavaScript state management library inspired by Zustand, designed for browser use.

## Features

- 🤏 Tiny size, minimal API
- 🧠 Simple and intuitive state management
- 🔄 Subscribe to state changes
- 🔧 No dependencies
- 📦 Works directly in the browser
- ⚡ Automatic action binding for cleaner code
- 🔍 Shallow equality checks for better performance
- 🌐 Built-in AJAX support with XMLHttpRequest

## Installation

Simply include the `ministore.js` file in your HTML:

```html
<script src="ministore.js"></script>
```

## Usage

### Creating a store

```javascript
// Create a store with initial state and actions
const useStore = MiniStore.create((set) => ({
  // Initial state
  count: 0,

  // Actions that update state
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),

  // You can also set a specific value
  setCount: (value) => set({ count: value })
}));
```

### Using the store

```javascript
// Get the current state
const state = useStore.getState();
console.log(state.count); // 0

// Update the state using actions (directly from the store)
useStore.increment();
console.log(useStore.getState().count); // 1

// Subscribe to state changes
const unsubscribe = useStore.subscribe((state, previousState) => {
  console.log('Previous count:', previousState.count);
  console.log('Current count:', state.count);
});

// Later, when you don't need the subscription anymore
unsubscribe();

// You can also update state directly
useStore.setState({ count: 10 });

// Or use a function to update based on current state
useStore.setState((state) => ({ count: state.count * 2 }));

// Replace the entire state (instead of merging)
useStore.setState({ newValue: 123 }, true);

// Clean up when done
useStore.destroy();
```

## Advanced Usage

### Combining Multiple Stores

You can create multiple independent stores for different parts of your application:

```javascript
const useUserStore = MiniStore.create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null })
}));

const useCartStore = MiniStore.create((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ 
    items: [...state.items, item] 
  })),
  clearCart: () => set({ items: [] })
}));
```

### Integrating with DOM

```javascript
// Create a store
const useCounterStore = MiniStore.create((set) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
  decrement: () => set(state => ({ count: state.count - 1 }))
}));

// Update UI when state changes
function updateUI() {
  document.getElementById('counter').textContent = useCounterStore.getState().count;
}

// Subscribe to state changes
useCounterStore.subscribe(updateUI);

// Initial UI update
updateUI();

// Connect buttons
document.getElementById('increment').addEventListener('click', () => {
  useCounterStore.increment();
});

document.getElementById('decrement').addEventListener('click', () => {
  useCounterStore.decrement();
});
```

### Making AJAX Requests

MiniStore includes built-in support for AJAX requests using XMLHttpRequest. You can use these methods to fetch data from APIs and update your store:

```javascript
// Basic GET request
MiniStore.get('https://api.example.com/data')
  .then(data => console.log(data))
  .catch(error => console.error(error));

// POST request with data
MiniStore.post('https://api.example.com/users', { name: 'John', email: 'john@example.com' })
  .then(response => console.log(response))
  .catch(error => console.error(error));

// PUT request
MiniStore.put('https://api.example.com/users/1', { name: 'Updated Name' })
  .then(response => console.log(response))
  .catch(error => console.error(error));

// DELETE request
MiniStore.delete('https://api.example.com/users/1')
  .then(response => console.log(response))
  .catch(error => console.error(error));

// PATCH request
MiniStore.patch('https://api.example.com/users/1', { status: 'active' })
  .then(response => console.log(response))
  .catch(error => console.error(error));

// Advanced request with custom options
MiniStore.request({
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer token123',
    'Content-Type': 'application/json'
  },
  timeout: 5000,
  withCredentials: true
})
  .then(data => console.log(data))
  .catch(error => console.error(error));
```

#### Integrating AJAX with Stores

You can combine AJAX requests with stores to create powerful data-fetching patterns:

```javascript
// Create a store with data fetching capabilities
const useUserStore = MiniStore.create((set) => ({
  users: [],
  loading: false,
  error: null,

  // Fetch users from API
  fetchUsers: () => {
    set({ loading: true, error: null });

    MiniStore.get('https://api.example.com/users')
      .then(users => {
        set({ users, loading: false });
      })
      .catch(error => {
        set({ error: error.message, loading: false });
      });
  },

  // Add a new user
  addUser: (userData) => {
    set({ loading: true, error: null });

    MiniStore.post('https://api.example.com/users', userData)
      .then(newUser => {
        set(state => ({ 
          users: [...state.users, newUser],
          loading: false 
        }));
      })
      .catch(error => {
        set({ error: error.message, loading: false });
      });
  }
}));

// Usage
useUserStore.fetchUsers();

// Later, add a new user
useUserStore.addUser({ name: 'Alice', email: 'alice@example.com' });
```

## How It Works

MiniStore automatically binds all functions in your state to the store API, so you can call them directly:

```javascript
// This:
useStore.increment();

// Instead of this:
useStore.getState().increment();
```

The library also uses shallow equality checks to avoid unnecessary updates when the state hasn't actually changed.

## License

MIT
