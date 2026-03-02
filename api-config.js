// =====================
// CENTRALIZED API CONFIG
// =====================

// Switch between local development and production
const MODE = "Prod";

// API Base URL
const API_BASE_URL =
  MODE === "local"
    ? "http://localhost:3000"
    : "https://health-tracker-backend-z131.onrender.com";

// Optional auth token for protected backend routes.
// Leave empty in git; set a real value in your local deploy/config.
const API_AUTH_TOKEN = "";

if (!window.API_AUTH_TOKEN && API_AUTH_TOKEN) {
  window.API_AUTH_TOKEN = API_AUTH_TOKEN;
}

// Export for use in all modules (if using ES6 modules)
// export { API_BASE_URL };

// For browser global access, API_BASE_URL is available globally
// console.log(`🚀 API Mode: ${MODE} → ${API_BASE_URL}`);
