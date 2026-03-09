// =====================
// CENTRALIZED API CONFIG
// =====================

// Switch between local development and production
const MODE = "Prod";

// API Base URL
const API_BASE_URL =
  MODE === "local"
    ? "http://localhost:3000"
    : "https://health-tracker-backend-9928u0d7f-vanamala19s-projects.vercel.app";

// Export for use in all modules (if using ES6 modules)
// export { API_BASE_URL };

// For browser global access, API_BASE_URL is available globally
// console.log(`🚀 API Mode: ${MODE} → ${API_BASE_URL}`);
