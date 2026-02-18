/**
 * Dark Mode Manager
 * Handles theme switching, persistence, and CSS variable updates
 */

const DarkMode = {
  // Current theme state
  isDark: false,

  // Storage key for theme preference
  storageKey: "health-tracker-theme",

  // CSS variable names for theming
  variables: {
    // Background colors
    bgPrimary: "--bg-primary",
    bgSecondary: "--bg-secondary",
    bgCard: "--bg-card",

    // Text colors
    textPrimary: "--text-primary",
    textSecondary: "--text-secondary",

    // Border colors
    borderColor: "--border-color",

    // Button colors
    btnPrimary: "--btn-primary",
    btnPrimaryHover: "--btn-primary-hover",

    // Accent colors
    accentGreen: "--accent-green",
    accentGreenHover: "--accent-green-hover",
  },

  /**
   * Initialize dark mode on page load
   * Should be called as early as possible to prevent flash
   */
  init() {
    // Check saved preference first, then system preference
    const savedTheme = localStorage.getItem(this.storageKey);

    if (savedTheme) {
      this.isDark = savedTheme === "dark";
    } else {
      // Check system preference
      this.isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    // Apply theme immediately
    this.applyTheme();

    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!localStorage.getItem(this.storageKey)) {
          this.isDark = e.matches;
          this.applyTheme();
        }
      });
  },

  /**
   * Toggle between light and dark themes
   */
  toggle() {
    this.isDark = !this.isDark;
    localStorage.setItem(this.storageKey, this.isDark ? "dark" : "light");
    this.applyTheme();
    this.updateToggleButton();
  },

  /**
   * Apply theme by setting CSS variables
   */
  applyTheme() {
    const root = document.documentElement;

    if (this.isDark) {
      // Dark theme colors
      root.style.setProperty(this.variables.bgPrimary, "#1a1a1a");
      root.style.setProperty(this.variables.bgSecondary, "#2a2a2a");
      root.style.setProperty(this.variables.bgCard, "#333333");

      root.style.setProperty(this.variables.textPrimary, "#f0f0f0");
      root.style.setProperty(this.variables.textSecondary, "#b0b0b0");

      root.style.setProperty(this.variables.borderColor, "#444444");

      root.style.setProperty(this.variables.btnPrimary, "#2ecc71");
      root.style.setProperty(this.variables.btnPrimaryHover, "#27ae60");

      root.style.setProperty(this.variables.accentGreen, "#27ae60");
      root.style.setProperty(this.variables.accentGreenHover, "#229954");
      // button accent colors
      root.style.setProperty("--btn-accent", "#8e44ad");
      root.style.setProperty("--btn-accent-hover", "#7a2c93");
      root.style.setProperty("--btn-disabled", "#555");
      root.style.setProperty("--btn-loading", "#3498db");
      // subtle hover overlay for lists/tables in dark mode
      root.style.setProperty("--hover-bg", "rgba(255,255,255,0.03)");

      // Add dark class to body for CSS selector options
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    } else {
      // Light theme colors
      root.style.setProperty(this.variables.bgPrimary, "#ffffff");
      root.style.setProperty(this.variables.bgSecondary, "#f5f5f5");
      root.style.setProperty(this.variables.bgCard, "#ffffff");

      root.style.setProperty(this.variables.textPrimary, "#333333");
      root.style.setProperty(this.variables.textSecondary, "#666666");

      root.style.setProperty(this.variables.borderColor, "#ddd");

      root.style.setProperty(this.variables.btnPrimary, "#2ecc71");
      root.style.setProperty(this.variables.btnPrimaryHover, "#27ae60");

      root.style.setProperty(this.variables.accentGreen, "#2ecc71");
      root.style.setProperty(this.variables.accentGreenHover, "#27ae60");
      // button accent colors (light)
      root.style.setProperty("--btn-accent", "#9b59b6");
      root.style.setProperty("--btn-accent-hover", "#8e44ad");
      root.style.setProperty("--btn-disabled", "#bbb");
      root.style.setProperty("--btn-loading", "#3498db");
      // hover background for light mode
      root.style.setProperty("--hover-bg", "#fafafa");

      // Remove dark class from body
      document.body.classList.remove("dark-mode");
      document.body.classList.add("light-mode");
    }
  },

  /**
   * Update toggle button icon/text
   */
  updateToggleButton() {
    // Update all theme toggle buttons (desktop and mobile)
    const buttons = document.querySelectorAll(".btn-theme-toggle");
    buttons.forEach((btn) => {
      if (this.isDark) {
        btn.innerHTML = '<i class="fas fa-sun"></i> Light';
        btn.title = "Switch to light mode";
      } else {
        btn.innerHTML = '<i class="fas fa-moon"></i> Dark';
        btn.title = "Switch to dark mode";
      }
    });
  },

  /**
   * Get current theme
   * @returns {string} - 'dark' or 'light'
   */
  getCurrentTheme() {
    return this.isDark ? "dark" : "light";
  },

  /**
   * Set theme explicitly
   * @param {string} theme - 'dark' or 'light'
   */
  setTheme(theme) {
    this.isDark = theme === "dark";
    localStorage.setItem(this.storageKey, theme);
    this.applyTheme();
    this.updateToggleButton();
  },
};

// Initialize dark mode as soon as script loads
document.addEventListener("DOMContentLoaded", () => {
  DarkMode.init();
});

// For cases where DOM is already ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    DarkMode.init();
  });
} else {
  DarkMode.init();
}
