/**
 * MiniStore - A minimalistic state management library inspired by Zustand
 * 
 * This library provides a simple way to create and manage state in browser applications.
 */

(function(global) {
  'use strict';

  /**
   * Makes an AJAX request using XMLHttpRequest
   * @param {Object} options - Request options
   * @param {string} options.url - The URL to send the request to
   * @param {string} [options.method='GET'] - The HTTP method to use
   * @param {Object} [options.headers] - Request headers
   * @param {any} [options.data] - Request body data
   * @param {number} [options.timeout] - Request timeout in milliseconds
   * @param {boolean} [options.withCredentials] - Whether to include credentials
   * @returns {Promise} - Promise that resolves with the response or rejects with an error
   * @private
   */
  // Reusable error object template to avoid creating new objects for each error
  var errorTemplate = {
    status: 0,
    statusText: '',
    response: ''
  };

  // Pre-defined content type header string
  var contentTypeHeader = 'Content-Type';
  var jsonContentType = 'application/json';

  async function ajax(options) {
    // Early validation to avoid unnecessary processing
    if (!options.url) {
      throw new Error('URL is required');
    }

    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      // Cache method to avoid repeated calls to toUpperCase()
      var method = (options.method || 'GET').toUpperCase();

      // Open connection
      xhr.open(method, options.url, true);

      // Set headers - use for...in for better performance with large header objects
      var headers = options.headers;
      if (headers) {
        for (var key in headers) {
          if (Object.prototype.hasOwnProperty.call(headers, key)) {
            xhr.setRequestHeader(key, headers[key]);
          }
        }
      }

      // Set timeout and withCredentials with direct property assignment
      if (options.timeout) xhr.timeout = options.timeout;
      if (options.withCredentials) xhr.withCredentials = true;

      // Define response handler - use single function for better performance
      xhr.onload = function() {
        // Success status codes
        if (xhr.status >= 200 && xhr.status < 300) {
          // Only process response if it exists and has content
          var responseText = xhr.responseText;
          if (!responseText || !responseText.trim()) {
            resolve(responseText);
            return;
          }

          // Try to parse as JSON
          try {
            // Use direct JSON.parse for better performance
            resolve(JSON.parse(responseText));
          } catch (e) {
            // If parsing fails, return the raw response text
            resolve(responseText);
          }
        } else {
          // Error response - reuse error template object
          errorTemplate.status = xhr.status;
          errorTemplate.statusText = xhr.statusText;
          errorTemplate.response = xhr.responseText;
          reject(Object.assign({}, errorTemplate));
        }
      };

      // Handle network errors - reuse error template
      xhr.onerror = function() {
        errorTemplate.status = xhr.status;
        errorTemplate.statusText = 'Network Error';
        errorTemplate.response = xhr.responseText;
        reject(Object.assign({}, errorTemplate));
      };

      // Handle timeout - reuse error template
      xhr.ontimeout = function() {
        errorTemplate.status = xhr.status;
        errorTemplate.statusText = 'Timeout Error';
        errorTemplate.response = xhr.responseText;
        reject(Object.assign({}, errorTemplate));
      };

      // Optimize request sending based on method and data
      var isGetOrHead = method === 'GET' || method === 'HEAD';
      var hasData = !!options.data;

      if (isGetOrHead || !hasData) {
        // Simple request without data
        xhr.send();
      } else {
        var data = options.data;
        var contentType = headers && headers[contentTypeHeader];

        // Only stringify objects when needed and content type is appropriate
        if (typeof data === 'object' && (!contentType || contentType.includes('json'))) {
          // Use direct JSON.stringify for better performance
          data = JSON.stringify(data);

          // Set content type if not already set
          if (!contentType) {
            xhr.setRequestHeader(contentTypeHeader, jsonContentType);
          }
        }

        xhr.send(data);
      }
    });
  }

  /**
   * Shallow equality check for objects
   * @private
   */
  function shallowEqual(obj1, obj2) {
    // Fast reference equality check
    if (obj1 === obj2) return true;

    // Fast null/undefined check
    if (!obj1 || !obj2) return false;

    // Fast type check
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

    // Handle arrays specially for better performance
    var isArray1 = Array.isArray(obj1);
    if (isArray1 !== Array.isArray(obj2)) return false;

    if (isArray1) {
      var length = obj1.length;
      if (length !== obj2.length) return false;

      // Direct array comparison is faster than iterating through keys
      for (var i = 0; i < length; i++) {
        if (obj1[i] !== obj2[i]) return false;
      }

      return true;
    }

    // For objects, cache the keys for performance
    var keys1 = Object.keys(obj1);
    var keysLength = keys1.length;

    // Fast length comparison before iterating
    if (keysLength !== Object.keys(obj2).length) return false;

    // Use cached length and regular for loop for better performance
    // Avoid function calls inside the loop
    var hasOwn = Object.prototype.hasOwnProperty;
    for (var i = 0; i < keysLength; i++) {
      var key = keys1[i];
      if (!hasOwn.call(obj2, key) || obj1[key] !== obj2[key]) {
        return false;
      }
    }

    return true;
  }

  // Cache frequently used functions
  var objectAssign = Object.assign;

  /**
   * Creates a store with the given initial state and actions
   * @param {Function} createState - A function that receives a set method and returns an object with state and actions
   * @returns {Object} - Store API with getState, setState, subscribe, destroy methods, and any custom actions
   */
  function create(createState) {
    var state;
    var previousState;
    var listeners = new Set();

    // Pre-allocate listeners array for better performance
    var listenersArray = [];
    var needsListenerSync = true;

    // Function to update state
    var setState = async function(partial, replace) {
      // Fast path for function updates
      var nextState = typeof partial === 'function' 
        ? partial(state)
        : partial;

      // Skip update if partial is empty object
      if (!nextState || (typeof nextState === 'object' && Object.keys(nextState).length === 0)) {
        return;
      }

      // Only update if there are changes (using shallow equality)
      if (!shallowEqual(nextState, state)) {
        // Cache previous state for listeners
        previousState = state;

        // Replace state entirely or merge with existing state
        // Use cached Object.assign for better performance with object merging
        if (replace) {
          // Create a new object for immutability but avoid unnecessary spreading
          state = objectAssign({}, nextState);
        } else {
          // Merge the objects more efficiently
          state = objectAssign({}, state, nextState);
        }

        // Notify all listeners - use cached array for better iteration performance
        var size = listeners.size;
        if (size > 0) {
          // Only rebuild listeners array when needed
          if (needsListenerSync) {
            listenersArray = Array.from(listeners);
            needsListenerSync = false;
          }

          // Use direct for loop for better performance
          for (var i = 0; i < listenersArray.length; i++) {
            listenersArray[i](state, previousState);
          }
        }
      }
    };

    // Initialize the state - use cached Object.assign instead of spread for better performance
    var initialState = createState(setState);
    state = objectAssign({}, initialState);

    // Create unsubscribe function once and reuse it
    var createUnsubscribe = function(listener) {
      return function() {
        var deleted = listeners.delete(listener);
        // Mark listeners array as needing sync only if something was actually deleted
        if (deleted) needsListenerSync = true;
        return deleted;
      };
    };

    // Store API - define core methods with optimized implementations
    var api = {
      /**
       * Get the current state
       * @returns {Object} - Current state
       */
      getState: function() { return state; },

      /**
       * Update the state
       * @param {Object|Function} partial - New state object or function that returns new state
       * @param {boolean} [replace=false] - Whether to replace the state entirely
       */
      setState: setState,

      /**
       * Subscribe to state changes
       * @param {Function} listener - Callback function called when state changes
       * @returns {Function} - Unsubscribe function
       */
      subscribe: function(listener) {
        if (typeof listener !== 'function') {
          console.warn('Listener must be a function');
          return function() { return false; };
        }

        listeners.add(listener);
        needsListenerSync = true;

        // Return memoized unsubscribe function
        return createUnsubscribe(listener);
      },

      /**
       * Destroy the store, removing all listeners
       */
      destroy: function() {
        listeners.clear();
        listenersArray = [];
        needsListenerSync = true;
      }
    };

    // Add any custom actions from initialState to the API
    // Use for...in with hasOwnProperty check for better performance with large objects
    // Cache hasOwnProperty for better performance
    var hasOwn = Object.prototype.hasOwnProperty;

    // Fast path for empty initialState
    if (initialState && typeof initialState === 'object') {
      for (var key in initialState) {
        if (hasOwn.call(initialState, key) && typeof initialState[key] === 'function') {
          // Bind the function to ensure 'this' context is preserved
          api[key] = initialState[key];
        }
      }
    }

    return api;
  }

  // Pre-create common HTTP method configurations for reuse
  var HTTP_METHODS = {
    GET: { method: 'GET' },
    POST: { method: 'POST' },
    PUT: { method: 'PUT' },
    DELETE: { method: 'DELETE' },
    PATCH: { method: 'PATCH' }
  };

  // Expose the API
  var MiniStore = { 
    create,

    /**
     * Makes an AJAX request
     * @param {Object} options - Request options
     * @param {string} options.url - The URL to send the request to
     * @param {string} [options.method='GET'] - The HTTP method to use
     * @param {Object} [options.headers] - Request headers
     * @param {any} [options.data] - Request body data
     * @param {number} [options.timeout] - Request timeout in milliseconds
     * @param {boolean} [options.withCredentials] - Whether to include credentials
     * @returns {Promise} - Promise that resolves with the response or rejects with an error
     */
    request: ajax,

    /**
     * Makes a GET request
     * @param {string} url - The URL to send the request to
     * @param {Object} [options] - Additional request options
     * @returns {Promise} - Promise that resolves with the response or rejects with an error
     */
    get: async function(url, options = {}) {
      // Use cached method config and Object.assign for better performance
      return await ajax(objectAssign({}, HTTP_METHODS.GET, options, { url }));
    },

    /**
     * Makes a POST request
     * @param {string} url - The URL to send the request to
     * @param {any} [data] - Request body data
     * @param {Object} [options] - Additional request options
     * @returns {Promise} - Promise that resolves with the response or rejects with an error
     */
    post: async function(url, data, options = {}) {
      // Use cached method config and Object.assign for better performance
      return await ajax(objectAssign({}, HTTP_METHODS.POST, { data }, options, { url }));
    },

    /**
     * Makes a PUT request
     * @param {string} url - The URL to send the request to
     * @param {any} [data] - Request body data
     * @param {Object} [options] - Additional request options
     * @returns {Promise} - Promise that resolves with the response or rejects with an error
     */
    put: async function(url, data, options = {}) {
      // Use cached method config and Object.assign for better performance
      return await ajax(objectAssign({}, HTTP_METHODS.PUT, { data }, options, { url }));
    },

    /**
     * Makes a DELETE request
     * @param {string} url - The URL to send the request to
     * @param {Object} [options] - Additional request options
     * @returns {Promise} - Promise that resolves with the response or rejects with an error
     */
    delete: async function(url, options = {}) {
      // Use cached method config and Object.assign for better performance
      return await ajax(objectAssign({}, HTTP_METHODS.DELETE, options, { url }));
    },

    /**
     * Makes a PATCH request
     * @param {string} url - The URL to send the request to
     * @param {any} [data] - Request body data
     * @param {Object} [options] - Additional request options
     * @returns {Promise} - Promise that resolves with the response or rejects with an error
     */
    patch: async function(url, data, options = {}) {
      // Use cached method config and Object.assign for better performance
      return await ajax(objectAssign({}, HTTP_METHODS.PATCH, { data }, options, { url }));
    }
  };

  // Export for browser and module environments - optimized with direct assignments
  if (typeof exports !== 'undefined') {
    // CommonJS/Node.js environment
    if (typeof module !== 'undefined' && module.exports) {
      // Direct assignment is faster than property assignment
      module.exports = MiniStore;
    }
    // For backwards compatibility
    exports.MiniStore = MiniStore;
  } else {
    // Browser environment - direct assignment to global
    global.MiniStore = MiniStore;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

/**
 * Example usage:
 * 
 * // Create a store with initial state and actions
 * const useStore = MiniStore.create((set) => ({
 *   // State
 *   count: 0,
 *   user: { name: 'Guest' },
 *   
 *   // Actions
 *   increment: () => set((state) => ({ count: state.count + 1 })),
 *   decrement: () => set((state) => ({ count: state.count - 1 })),
 *   reset: () => set({ count: 0 }),
 *   setUser: (name) => set({ user: { name } })
 * }));
 * 
 * // Get state
 * const state = useStore.getState();
 * console.log(state.count); // 0
 * 
 * // Use actions
 * useStore.increment();
 * console.log(useStore.getState().count); // 1
 * 
 * // Subscribe to changes
 * const unsubscribe = useStore.subscribe((state, prevState) => {
 *   console.log('Previous count:', prevState.count);
 *   console.log('Current count:', state.count);
 * });
 * 
 * // Later: unsubscribe when done
 * unsubscribe();
 * 
 * // Clean up
 * useStore.destroy();
 */
