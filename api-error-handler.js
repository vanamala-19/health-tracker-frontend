// =====================
// API ERROR HANDLER UTILITY
// =====================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 * @param {string} duration - How long to show (ms), default 5000
 */
function showErrorMessage(message, duration = 5000) {
  // Create or reuse error notification container
  let errorBox = document.getElementById("error-notification");

  if (!errorBox) {
    errorBox = document.createElement("div");
    errorBox.id = "error-notification";
    errorBox.className = "error-notification";
    document.body.insertBefore(errorBox, document.body.firstChild);
  }

  errorBox.innerHTML = `
    <div class="error-content">
      <span class="error-icon">⚠️</span>
      <span class="error-text">${escapeHtml(message)}</span>
      <button class="error-close" onclick="this.parentElement.parentElement.style.display='none'">✕</button>
    </div>
  `;

  errorBox.style.display = "block";

  // Auto-hide after duration
  setTimeout(() => {
    if (errorBox.style.display === "block") {
      errorBox.style.display = "none";
    }
  }, duration);
}

/**
 * Show success message to user
 * @param {string} message - Success message to display
 * @param {string} duration - How long to show (ms), default 3000
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
      <span class="success-icon">✅</span>
      <span class="success-text">${escapeHtml(message)}</span>
      <button class="success-close" onclick="this.parentElement.parentElement.style.display='none'">✕</button>
    </div>
  `;

  successBox.style.display = "block";

  setTimeout(() => {
    if (successBox.style.display === "block") {
      successBox.style.display = "none";
    }
  }, duration);
}

/**
 * Show loading spinner
 */
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

/**
 * Hide loading spinner
 */
function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.style.display = "none";
  }
}

/**
 * Safe API fetch with error handling
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise} Response data or throws error
 */
async function safeApiFetch(url, options = {}) {
  try {
    showLoader();

    const response = await fetch(url, {
      timeout: 10000, // 10 second timeout
      ...options,
    });

    if (!response.ok) {
      const errorMsg = `Server error: ${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    hideLoader();
    return data;
  } catch (error) {
    hideLoader();

    // Handle different error types
    let userMessage = "Something went wrong. Please try again.";

    if (error.message.includes("Failed to fetch")) {
      userMessage =
        "⚠️ Connection error. Please check your internet connection.";
    } else if (error.message.includes("timeout")) {
      userMessage =
        "⏱️ Request timed out. Server might be slow, please try again.";
    } else if (error.message.includes("Server error")) {
      userMessage = `❌ ${error.message}`;
    } else if (error instanceof SyntaxError) {
      userMessage = "❌ Invalid response from server.";
    }

    showErrorMessage(userMessage);
    console.error("API Error:", error);
    throw error;
  }
}

/**
 * Validate required form fields
 * @param {object} fields - Object with field name and required value
 * @returns {boolean} True if all required fields are filled
 */
function validateFormFields(fields) {
  for (const [name, value] of Object.entries(fields)) {
    if (!value || (typeof value === "string" && !value.trim())) {
      showErrorMessage(`❌ "${name}" is required.`);
      return false;
    }
  }
  return true;
}
