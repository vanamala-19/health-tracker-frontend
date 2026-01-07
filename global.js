function updateOnlineStatus() {
  if (!navigator.onLine) {
    alert("⚠ You are offline");
  }
}

window.addEventListener("offline", updateOnlineStatus);
window.addEventListener("online", () => {
  console.log("Back online");
});
