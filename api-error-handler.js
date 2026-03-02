// =====================
// API ERROR HANDLER UTILITY
// =====================

/**
 * Show error message to user
 * @param {string} message - Error message to display
 * @param {number} duration - How long to show (ms), default 5000
 */
function showErrorMessage(message, duration = 5000) {
  let errorBox = document.getElementById("error-notification");

  if (!errorBox) {
    errorBox = document.createElement("div");
    errorBox.id = "error-notification";
    errorBox.className = "error-notification";
    document.body.insertBefore(errorBox, document.body.firstChild);
  }

  errorBox.innerHTML = `
    <div class="error-content">
      <span class="error-icon">!</span>
      <span class="error-text">${escapeHtml(message)}</span>
      <button class="error-close" onclick="this.parentElement.parentElement.style.display='none'">x</button>
    </div>
  `;

  errorBox.style.display = "block";

  setTimeout(() => {
    if (errorBox.style.display === "block") {
      errorBox.style.display = "none";
    }
  }, duration);
}

/**
 * Show success message to user
 * @param {string} message - Success message to display
 * @param {number} duration - How long to show (ms), default 3000
 */
function showSuccessMessage(message, duration = 3000) {
  let successBox = document.getElementById("success-notification");

  if (!successBox) {
    successBox = document.createElement("div");
    successBox.id = "success-notification";
    successBox.className = "success-notification";
    document.body.insertBefore(successBox, document.body.firstChild);
  }

  successBox.innerHTML = `
    <div class="success-content">
      <span class="success-icon">OK</span>
      <span class="success-text">${escapeHtml(message)}</span>
      <button class="success-close" onclick="this.parentElement.parentElement.style.display='none'">x</button>
    </div>
  `;

  successBox.style.display = "block";

  setTimeout(() => {
    if (successBox.style.display === "block") {
      successBox.style.display = "none";
    }
  }, duration);
}

function showLoader() {
  let loader = document.getElementById("loader");

  if (!loader) {
    loader = document.createElement("div");
    loader.id = "loader";
    loader.className = "loader";
    loader.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loader);
  }

  loader.style.display = "flex";
}

function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.style.display = "none";
  }
}

async function safeApiFetch(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 10000;
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const maxAttempts = isGet ? 3 : 1;

  showLoader();

  try {
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const { timeoutMs: _timeoutMs, signal: _signal, ...fetchOptions } = options;
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = new Error(
            `Server error: ${response.status} ${response.statusText}`,
          );
          error.status = response.status;
          throw error;
        }

        if (typeof AppHealth !== "undefined") {
          AppHealth.setStatus("healthy");
        }

        if (response.status === 204) return null;

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          return await response.json();
        }

        const text = await response.text();
        return text || null;
      } catch (error) {
        lastError = error;
        const retryableNetwork =
          error.name === "AbortError" || error.message.includes("Failed to fetch");
        const retryableServer = Number(error.status) >= 500;
        const shouldRetry = attempt < maxAttempts && (retryableNetwork || retryableServer);

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
    let userMessage = "Something went wrong. Please try again.";

    if (error.name === "AbortError") {
      userMessage = "Request timed out. Server might be slow, please try again.";
    } else if (error.message.includes("Failed to fetch")) {
      userMessage = "Connection error. Please check your internet connection.";
    } else if (error.message.includes("Server error")) {
      userMessage = error.message;
    } else if (error instanceof SyntaxError) {
      userMessage = "Invalid response from server.";
    }

    if (typeof AppHealth !== "undefined") {
      AppHealth.setStatus(navigator.onLine ? "degraded" : "offline");
    }

    showErrorMessage(userMessage);
    console.error("API Error:", error);
    throw error;
  } finally {
    hideLoader();
  }
}

function validateFormFields(fields) {
  for (const [name, value] of Object.entries(fields)) {
    if (!value || (typeof value === "string" && !value.trim())) {
      showErrorMessage(`"${name}" is required.`);
      return false;
    }
  }
  return true;
}
