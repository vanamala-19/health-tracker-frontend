function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function notifyError(message) {
  if (typeof showErrorMessage === "function") {
    showErrorMessage(message);
    return;
  }
  alert(message);
}

function notifySuccess(message) {
  if (typeof showSuccessMessage === "function") {
    showSuccessMessage(message);
    return;
  }
  alert(message);
}

function notifyWarning(message) {
  if (typeof showErrorMessage === "function") {
    showErrorMessage(message);
    return;
  }
  alert(message);
}

const API_AUTH_TOKEN_STORAGE_KEY = "health_tracker_api_token";

function getApiAuthToken() {
  if (
    typeof window.API_AUTH_TOKEN === "string" &&
    window.API_AUTH_TOKEN.trim()
  ) {
    return window.API_AUTH_TOKEN.trim();
  }

  try {
    return (localStorage.getItem(API_AUTH_TOKEN_STORAGE_KEY) || "").trim();
  } catch (_e) {
    return "";
  }
}

function withApiAuth(url, options = {}) {
  const token = getApiAuthToken();
  const method = String(options.method || "GET").toUpperCase();
  const isReadOnly = method === "GET" || method === "HEAD";
  const headers = new Headers(options.headers || {});

  if (!isReadOnly && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    ...options,
    credentials: options.credentials || (isReadOnly ? "omit" : "include"),
    headers,
  };
}

function setApiAuthToken(token) {
  const value = String(token || "").trim();
  window.API_AUTH_TOKEN = value;

  try {
    if (value) {
      localStorage.setItem(API_AUTH_TOKEN_STORAGE_KEY, value);
    } else {
      localStorage.removeItem(API_AUTH_TOKEN_STORAGE_KEY);
    }
  } catch (_e) {
    // Ignore storage failures; in-memory token still works for this session.
  }
}

const AppHealth = {
  current: "unknown",

  apply(status) {
    const chip = document.getElementById("apiHealthChip");
    const chipMobile = document.getElementById("apiHealthChipMobile");
    [chip, chipMobile].forEach((el) => {
      if (!el) return;
      el.className = `health-chip ${status}`;
      if (status === "healthy") el.textContent = "API: Healthy";
      else if (status === "degraded") el.textContent = "API: Degraded";
      else if (status === "offline") el.textContent = "API: Offline";
      else el.textContent = "API: Unknown";
    });
  },

  setStatus(status) {
    this.current = status;
    this.apply(status);
  },
};

const AppQueueUI = {
  update() {
    const countDesktop = document.getElementById("queueCount");
    const countMobile = document.getElementById("queueCountMobile");
    if (typeof OfflineManager === "undefined") {
      [countDesktop, countMobile].forEach((el) => {
        if (el) el.textContent = "0";
      });
      return;
    }
    const status = OfflineManager.getQueueStatus();
    const size = status.size || 0;
    [countDesktop, countMobile].forEach((el) => {
      if (el) el.textContent = String(size);
    });
  },

  bind() {
    const syncDesktop = document.getElementById("syncNowBtn");
    const clearDesktop = document.getElementById("clearQueueBtn");
    const syncMobile = document.getElementById("syncNowBtnMobile");
    const clearMobile = document.getElementById("clearQueueBtnMobile");

    const handleSync = async () => {
      if (typeof OfflineManager === "undefined") return;
      await OfflineManager.syncQueue();
      this.update();
    };
    const handleClear = () => {
      if (typeof OfflineManager === "undefined") return;
      OfflineManager.clearQueue();
      this.update();
      notifySuccess("Sync queue cleared.");
    };

    [syncDesktop, syncMobile].forEach((btn) => {
      if (btn && !btn.dataset.bound) {
        btn.addEventListener("click", handleSync);
        btn.dataset.bound = "1";
      }
    });
    [clearDesktop, clearMobile].forEach((btn) => {
      if (btn && !btn.dataset.bound) {
        btn.addEventListener("click", handleClear);
        btn.dataset.bound = "1";
      }
    });

    this.update();
  },
};

window.AppHealth = AppHealth;
window.AppQueueUI = AppQueueUI;
window.getApiAuthToken = getApiAuthToken;
window.withApiAuth = withApiAuth;
window.setApiAuthToken = setApiAuthToken;
