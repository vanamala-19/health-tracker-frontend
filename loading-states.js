/**
 * Loading States Manager
 * Handles button disabling, form submission blocking, and visual feedback during API requests
 */

const LoadingState = {
  // Track active requests to prevent multiple submissions
  activeRequests: new Set(),

  /**
   * Mark a request as active
   * @param {string} requestId - Unique identifier for the request
   */
  startRequest(requestId) {
    this.activeRequests.add(requestId);
  },

  /**
   * Mark a request as complete
   * @param {string} requestId - Unique identifier for the request
   */
  endRequest(requestId) {
    this.activeRequests.delete(requestId);
  },

  /**
   * Check if any requests are in progress
   * @returns {boolean} - True if any requests are active
   */
  hasActiveRequests() {
    return this.activeRequests.size > 0;
  },

  /**
   * Disable a button and show loading state
   * @param {HTMLElement|string} buttonElement - Button element or ID
   * @param {string} loadingText - Text to show while loading (optional)
   */
  disableButton(buttonElement) {
    const btn =
      typeof buttonElement === "string"
        ? document.getElementById(buttonElement)
        : buttonElement;

    if (!btn) return;

    // Store original content for restoration
    btn.dataset.originalContent = btn.innerHTML;
    btn.dataset.originalClass = btn.className;

    btn.disabled = true;
    btn.classList.add("btn-loading");
    btn.innerHTML = '<span class="spinner"></span> Loading...';
  },

  /**
   * Enable a button and restore original state
   * @param {HTMLElement|string} buttonElement - Button element or ID
   */
  enableButton(buttonElement) {
    const btn =
      typeof buttonElement === "string"
        ? document.getElementById(buttonElement)
        : buttonElement;

    if (!btn) return;

    btn.disabled = false;
    btn.classList.remove("btn-loading");

    // Restore original content if it was saved
    if (btn.dataset.originalContent) {
      btn.innerHTML = btn.dataset.originalContent;
      delete btn.dataset.originalContent;
    }
    if (btn.dataset.originalClass) {
      delete btn.dataset.originalClass;
    }
  },

  /**
   * Disable all buttons on the page
   */
  disableAllButtons() {
    document.querySelectorAll("button").forEach((btn) => {
      if (!btn.classList.contains("btn-no-disable")) {
        btn.disabled = true;
        btn.classList.add("btn-disabled");
      }
    });
  },

  /**
   * Enable all buttons on the page
   */
  enableAllButtons() {
    document.querySelectorAll("button").forEach((btn) => {
      if (!btn.classList.contains("btn-no-disable")) {
        btn.disabled = false;
        btn.classList.remove("btn-disabled");
      }
    });
  },

  /**
   * Disable form submission
   * @param {HTMLElement|string} formElement - Form element or ID
   */
  disableForm(formElement) {
    const form =
      typeof formElement === "string"
        ? document.getElementById(formElement)
        : formElement;

    if (!form) return;

    form.classList.add("form-submitting");
    form.querySelectorAll("input, select, textarea, button").forEach((el) => {
      if (el.tagName === "BUTTON" && el.type === "submit") {
        this.disableButton(el);
      } else {
        el.disabled = true;
      }
    });
  },

  /**
   * Enable form submission
   * @param {HTMLElement|string} formElement - Form element or ID
   */
  enableForm(formElement) {
    const form =
      typeof formElement === "string"
        ? document.getElementById(formElement)
        : formElement;

    if (!form) return;

    form.classList.remove("form-submitting");
    form.querySelectorAll("input, select, textarea, button").forEach((el) => {
      if (el.tagName === "BUTTON" && el.type === "submit") {
        this.enableButton(el);
      } else {
        el.disabled = false;
      }
    });
  },

  /**
   * Wrap an async function with automatic loading state management
   * @param {HTMLElement|string} buttonElement - Button to show loading state
   * @param {Function} asyncFunction - Async function to execute
   * @returns {Promise} - Promise that resolves when function completes
   */
  async withLoadingState(buttonElement, asyncFunction) {
    const btn =
      typeof buttonElement === "string"
        ? document.getElementById(buttonElement)
        : buttonElement;

    if (!btn) {
      return asyncFunction();
    }

    this.disableButton(btn);

    try {
      return await asyncFunction();
    } finally {
      this.enableButton(btn);
    }
  },

  /**
   * Wrap an async function with form loading state
   * @param {HTMLElement|string} formElement - Form to disable
   * @param {Function} asyncFunction - Async function to execute
   * @returns {Promise} - Promise that resolves when function completes
   */
  async withFormLoadingState(formElement, asyncFunction) {
    const form =
      typeof formElement === "string"
        ? document.getElementById(formElement)
        : formElement;

    if (!form) {
      return asyncFunction();
    }

    this.disableForm(form);

    try {
      return await asyncFunction();
    } finally {
      this.enableForm(form);
    }
  },

  /**
   * Show loading overlay (optional for critical operations)
   */
  showOverlay() {
    let overlay = document.getElementById("loading-overlay");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "loading-overlay";
      overlay.className = "loading-overlay";
      overlay.innerHTML =
        '<div class="loading-content"><span class="spinner"></span><p>Processing...</p></div>';
      document.body.appendChild(overlay);
    }

    overlay.style.display = "flex";
  },

  /**
   * Hide loading overlay
   */
  hideOverlay() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.style.display = "none";
    }
  },
};

// Prevent double submissions on forms automatically
document.addEventListener(
  "submit",
  function (e) {
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (submitBtn && !submitBtn.disabled) {
      // Button will be disabled by the form submission handler
      // This just prevents accidental double-clicks
      if (LoadingState.hasActiveRequests()) {
        e.preventDefault();
        showErrorMessage("⏳ Please wait for the previous request to complete");
      }
    }
  },
  true,
);
