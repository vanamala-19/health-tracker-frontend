// =====================
// OFFLINE SUPPORT & SYNC QUEUE
// =====================

const OfflineManager = {
  getCacheKey: (url) => `cache_${url}`,
  getQueueKey: () => `sync_queue`,

  cacheData(url, data, ttl = 60) {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl: ttl * 60 * 1000,
      };
      localStorage.setItem(this.getCacheKey(url), JSON.stringify(cacheEntry));
    } catch (e) {
      console.error("Failed to cache data:", e);
    }
  },

  getCachedData(url) {
    try {
      const cached = localStorage.getItem(this.getCacheKey(url));
      if (!cached) return null;

      const cacheEntry = JSON.parse(cached);
      if (Date.now() - cacheEntry.timestamp > cacheEntry.ttl) {
        localStorage.removeItem(this.getCacheKey(url));
        return null;
      }
      return cacheEntry.data;
    } catch (e) {
      console.error("Failed to retrieve cached data:", e);
      return null;
    }
  },

  clearCache(url) {
    try {
      localStorage.removeItem(this.getCacheKey(url));
    } catch (e) {
      console.error("Failed to clear cache:", e);
    }
  },

  queueRequest(request) {
    try {
      const queue = this.getSyncQueue();
      queue.push({
        ...request,
        timestamp: Date.now(),
        retryCount: 0,
      });
      localStorage.setItem(this.getQueueKey(), JSON.stringify(queue));
      console.log("Request queued for sync:", request.url);
      if (typeof AppQueueUI !== "undefined") AppQueueUI.update();
    } catch (e) {
      console.error("Failed to queue request:", e);
    }
  },

  getSyncQueue() {
    try {
      const queue = localStorage.getItem(this.getQueueKey());
      return queue ? JSON.parse(queue) : [];
    } catch (e) {
      console.error("Failed to get sync queue:", e);
      return [];
    }
  },

  removeFromQueue(index) {
    try {
      const queue = this.getSyncQueue();
      queue.splice(index, 1);
      localStorage.setItem(this.getQueueKey(), JSON.stringify(queue));
      if (typeof AppQueueUI !== "undefined") AppQueueUI.update();
    } catch (e) {
      console.error("Failed to remove from queue:", e);
    }
  },

  clearQueue() {
    try {
      localStorage.removeItem(this.getQueueKey());
      if (typeof AppQueueUI !== "undefined") AppQueueUI.update();
    } catch (e) {
      console.error("Failed to clear queue:", e);
    }
  },

  async syncQueue() {
    const queue = this.getSyncQueue();

    if (queue.length === 0) {
      console.log("Sync queue is empty");
      return;
    }

    console.log(`Syncing ${queue.length} request(s)...`);
    let synced = 0;

    for (let i = 0; i < queue.length; i++) {
      const request = queue[i];
      try {
        const baseOptions = {
          method: request.method,
          headers: request.headers || {},
          body: request.body ? JSON.stringify(request.body) : undefined,
        };
        const requestOptions =
          typeof withApiAuth === "function"
            ? withApiAuth(request.url, baseOptions)
            : baseOptions;
        const response = await fetch(request.url, requestOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        this.removeFromQueue(i);
        synced++;
        i--;
        console.log(`Synced: ${request.url}`);
      } catch (error) {
        console.error(`Sync failed for ${request.url}:`, error);

        request.retryCount = (request.retryCount || 0) + 1;
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
      showSuccessMessage(`Synced ${synced} request(s) successfully`);
    }
    if (typeof AppQueueUI !== "undefined") AppQueueUI.update();
  },

  getQueueStatus() {
    const queue = this.getSyncQueue();
    return {
      size: queue.length,
      oldestRequest: queue[0]?.timestamp ? new Date(queue[0].timestamp) : null,
    };
  },
};

async function offlineAwareFetch(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 10000;
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const maxAttempts = isGet ? 3 : 1;

  try {
    if (!navigator.onLine) {
      console.log("Offline mode - checking cache");

      if (!options.method || options.method === "GET") {
        const cached = OfflineManager.getCachedData(url);
        if (cached) {
          console.log("Returning cached data");
          return cached;
        }
        throw new Error("No cached data available and offline");
      }

      OfflineManager.queueRequest({
        url,
        method: options.method,
        headers:
          typeof withApiAuth === "function"
            ? Object.fromEntries(withApiAuth(url, options).headers.entries())
            : options.headers,
        body: options.body ? JSON.parse(options.body) : null,
      });

      throw new Error(
        "Offline: Request queued for sync when connection restored",
      );
    }

    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const { timeoutMs: _timeoutMs, signal: _signal, ...fetchOptions } =
          options;
        const requestOptions =
          typeof withApiAuth === "function"
            ? withApiAuth(url, fetchOptions)
            : fetchOptions;
        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = new Error(
            `Server error: ${response.status} ${response.statusText}`,
          );
          error.status = response.status;
          throw error;
        }

        let data = null;
        if (response.status !== 204) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            data = await response.json();
          } else {
            const text = await response.text();
            data = text || null;
          }
        }

        if ((!options.method || options.method === "GET") && data !== null) {
          OfflineManager.cacheData(url, data, 60);
        }

        if (typeof AppHealth !== "undefined") AppHealth.setStatus("healthy");
        return data;
      } catch (error) {
        lastError = error;
        const retryableNetwork =
          error.name === "AbortError" || error.message.includes("Failed to fetch");
        const retryableServer = Number(error.status) >= 500;
        const shouldRetry =
          attempt < maxAttempts && (retryableNetwork || retryableServer);

        if (shouldRetry) {
          await delay(250 * attempt);
          continue;
        }

        throw error;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError || new Error("Unknown request failure");
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Request timeout. Please try again.");
    }
    if (error.message.includes("Failed to fetch")) {
      throw new Error("Connection lost. Data will sync when online.");
    }

    if (typeof AppHealth !== "undefined") {
      AppHealth.setStatus(navigator.onLine ? "degraded" : "offline");
    }
    throw error;
  }
}

function setupOfflineHandling() {
  window.addEventListener("online", () => {
    console.log("Back online");
    showSuccessMessage("Back online - syncing data...");
    if (typeof AppHealth !== "undefined") AppHealth.setStatus("healthy");

    setTimeout(() => {
      OfflineManager.syncQueue();
    }, 1000);
  });

  window.addEventListener("offline", () => {
    console.log("Offline");
    if (typeof AppHealth !== "undefined") AppHealth.setStatus("offline");
    showErrorMessage(
      "You are offline. Changes will sync automatically when online.",
      10000,
    );
  });

  if (!navigator.onLine) {
    if (typeof AppHealth !== "undefined") AppHealth.setStatus("offline");
    showErrorMessage("You appear to be offline. Using cached data.", 10000);
  } else if (typeof AppHealth !== "undefined") {
    AppHealth.setStatus("healthy");
  }

  if (typeof AppQueueUI !== "undefined") {
    AppQueueUI.bind();
  }
}

setupOfflineHandling();
