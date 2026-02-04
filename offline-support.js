// =====================
// OFFLINE SUPPORT & SYNC QUEUE
// =====================

/**
 * Offline manager - handles localStorage caching and sync queue
 */
const OfflineManager = {
  /**
   * Cache key generator
   */
  getCacheKey: (url) => `cache_${url}`,
  getQueueKey: () => `sync_queue`,

  /**
   * Save data to cache
   * @param {string} url - API URL
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in minutes (default: 60)
   */
  cacheData: function (url, data, ttl = 60) {
    try {
      const cacheEntry = {
        data: data,
        timestamp: Date.now(),
        ttl: ttl * 60 * 1000, // Convert to milliseconds
      };
      localStorage.setItem(this.getCacheKey(url), JSON.stringify(cacheEntry));
    } catch (e) {
      console.error("Failed to cache data:", e);
    }
  },

  /**
   * Get data from cache if available and not expired
   * @param {string} url - API URL
   * @returns {any|null} Cached data or null
   */
  getCachedData: function (url) {
    try {
      const cached = localStorage.getItem(this.getCacheKey(url));
      if (!cached) return null;

      const cacheEntry = JSON.parse(cached);
      const now = Date.now();

      // Check if cache expired
      if (now - cacheEntry.timestamp > cacheEntry.ttl) {
        localStorage.removeItem(this.getCacheKey(url));
        return null;
      }

      return cacheEntry.data;
    } catch (e) {
      console.error("Failed to retrieve cached data:", e);
      return null;
    }
  },

  /**
   * Clear specific cache
   * @param {string} url - API URL
   */
  clearCache: function (url) {
    try {
      localStorage.removeItem(this.getCacheKey(url));
    } catch (e) {
      console.error("Failed to clear cache:", e);
    }
  },

  /**
   * Add request to sync queue
   * @param {object} request - {url, method, body, timestamp}
   */
  queueRequest: function (request) {
    try {
      const queue = this.getSyncQueue();
      queue.push({
        ...request,
        timestamp: Date.now(),
        retryCount: 0,
      });
      localStorage.setItem(this.getQueueKey(), JSON.stringify(queue));
      console.log("📋 Request queued for sync:", request.url);
    } catch (e) {
      console.error("Failed to queue request:", e);
    }
  },

  /**
   * Get all queued requests
   * @returns {array} Array of queued requests
   */
  getSyncQueue: function () {
    try {
      const queue = localStorage.getItem(this.getQueueKey());
      return queue ? JSON.parse(queue) : [];
    } catch (e) {
      console.error("Failed to get sync queue:", e);
      return [];
    }
  },

  /**
   * Remove request from queue
   * @param {number} index - Queue index
   */
  removeFromQueue: function (index) {
    try {
      const queue = this.getSyncQueue();
      queue.splice(index, 1);
      localStorage.setItem(this.getQueueKey(), JSON.stringify(queue));
    } catch (e) {
      console.error("Failed to remove from queue:", e);
    }
  },

  /**
   * Clear entire sync queue
   */
  clearQueue: function () {
    try {
      localStorage.removeItem(this.getQueueKey());
    } catch (e) {
      console.error("Failed to clear queue:", e);
    }
  },

  /**
   * Sync all queued requests
   */
  syncQueue: async function () {
    const queue = this.getSyncQueue();

    if (queue.length === 0) {
      console.log("✅ Sync queue is empty");
      return;
    }

    console.log(`🔄 Syncing ${queue.length} request(s)...`);
    let synced = 0;

    for (let i = 0; i < queue.length; i++) {
      const request = queue[i];

      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers || {},
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        this.removeFromQueue(i);
        synced++;
        i--; // Adjust index after removal
        console.log(`✅ Synced: ${request.url}`);
      } catch (error) {
        console.error(`❌ Sync failed for ${request.url}:`, error);

        // Increment retry count
        request.retryCount = (request.retryCount || 0) + 1;

        // Remove if too many retries
        if (request.retryCount > 3) {
          showErrorMessage(
            `Failed to sync: ${request.url} after 3 attempts. Please try manually.`,
          );
          this.removeFromQueue(i);
          i--;
        }
      }
    }

    if (synced > 0) {
      showSuccessMessage(`✅ Synced ${synced} request(s) successfully`);
    }
  },

  /**
   * Get queue status
   * @returns {object} {size, oldestRequest}
   */
  getQueueStatus: function () {
    const queue = this.getSyncQueue();
    return {
      size: queue.length,
      oldestRequest: queue[0]?.timestamp ? new Date(queue[0].timestamp) : null,
    };
  },
};

/**
 * Enhanced fetch with offline support
 * Falls back to cache if offline, queues requests for later
 * @param {string} url - API URL
 * @param {object} options - Fetch options
 * @returns {Promise} Response data
 */
async function offlineAwareFetch(url, options = {}) {
  try {
    // Check if online
    if (!navigator.onLine) {
      console.log("📴 Offline mode - checking cache");

      // For GET requests, return cached data
      if (!options.method || options.method === "GET") {
        const cached = OfflineManager.getCachedData(url);
        if (cached) {
          console.log("✅ Returning cached data");
          return cached;
        } else {
          throw new Error("No cached data available and offline");
        }
      }

      // For POST/PUT/DELETE, queue the request
      OfflineManager.queueRequest({
        url,
        method: options.method,
        headers: options.headers,
        body: options.body ? JSON.parse(options.body) : null,
      });

      throw new Error(
        "Offline: Request queued for sync when connection restored",
      );
    }

    // Make the actual request
    const response = await fetch(url, {
      timeout: 10000,
      ...options,
    });

    if (!response.ok) {
      throw new Error(
        `Server error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Cache successful GET responses
    if (!options.method || options.method === "GET") {
      OfflineManager.cacheData(url, data, 60); // Cache for 60 minutes
    }

    return data;
  } catch (error) {
    // Check if it's an offline error
    if (error.message.includes("Failed to fetch")) {
      throw new Error("Connection lost. Data will sync when online.");
    }

    throw error;
  }
}

/**
 * Setup offline/online event listeners
 */
function setupOfflineHandling() {
  window.addEventListener("online", () => {
    console.log("🌐 Back online!");
    showSuccessMessage("🌐 Back online - syncing data...");

    // Auto-sync queued requests
    setTimeout(() => {
      OfflineManager.syncQueue();
    }, 1000);
  });

  window.addEventListener("offline", () => {
    console.log("📴 Offline!");
    showErrorMessage(
      "📴 You are offline. Changes will sync automatically when online.",
      10000,
    );
  });

  // Check initial status
  if (!navigator.onLine) {
    showErrorMessage("📴 You appear to be offline. Using cached data.", 10000);
  }
}

// Initialize offline handling
setupOfflineHandling();
