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

function formatDateDDMMYY(value) {
  if (!value) return "";
  const d = parseSheetDate(value);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return String(value);
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const mm = monthNames[d.getMonth()] || "UNK";
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

let backendWakePromise = null;
let backendReady = false;

function getWakeNotice() {
  let notice = document.getElementById("wake-notification");
  if (notice) return notice;

  notice = document.createElement("div");
  notice.id = "wake-notification";
  notice.style.position = "fixed";
  notice.style.right = "12px";
  notice.style.bottom = "12px";
  notice.style.zIndex = "9999";
  notice.style.maxWidth = "320px";
  notice.style.padding = "10px 12px";
  notice.style.borderRadius = "10px";
  notice.style.border = "1px solid #f1c40f";
  notice.style.background = "#fff8e1";
  notice.style.color = "#7f5f00";
  notice.style.fontSize = "13px";
  notice.style.boxShadow = "0 6px 20px rgba(0,0,0,0.12)";
  notice.style.display = "none";
  document.body.appendChild(notice);
  return notice;
}

function showWakeNotice(message) {
  const notice = getWakeNotice();
  notice.textContent = message;
  notice.style.display = "block";
}

function hideWakeNotice() {
  const notice = document.getElementById("wake-notification");
  if (notice) notice.style.display = "none";
}

async function pingBackendReady(timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const requestOptions =
      typeof withApiAuth === "function" ? withApiAuth(`${API_BASE_URL}/health/ready`) : {};
    const response = await fetch(`${API_BASE_URL}/health/ready`, {
      ...requestOptions,
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error(`Health check failed: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return true;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForBackendWake(options = {}) {
  if (backendReady) return true;
  if (backendWakePromise) return backendWakePromise;

  const delays = options.delays || [0, 2500, 5000, 8000, 12000];
  const timeoutMs = options.timeoutMs || 8000;
  const quiet = Boolean(options.quiet);

  backendWakePromise = (async () => {
    let lastError = null;

    for (let i = 0; i < delays.length; i++) {
      const waitMs = delays[i];
      if (!quiet) {
        const attempt = i + 1;
        showWakeNotice(`Waking server... attempt ${attempt}/${delays.length}`);
      }

      if (waitMs > 0) {
        await delay(waitMs);
      }

      try {
        await pingBackendReady(timeoutMs);
        backendReady = true;
        if (typeof AppHealth !== "undefined") AppHealth.setStatus("healthy");
        hideWakeNotice();
        return true;
      } catch (error) {
        lastError = error;
      }
    }

    hideWakeNotice();
    throw lastError || new Error("Backend wake check failed");
  })().finally(() => {
    if (!backendReady) backendWakePromise = null;
  });

  return backendWakePromise;
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

function withApiAuth(url, options = {}) {
  return {
    ...options,
    headers: new Headers(options.headers || {}),
  };
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
window.withApiAuth = withApiAuth;

