const resultEl = document.getElementById("result");
const statusEl = document.getElementById("status");

function updateStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = type === "error" ? "status error" : "status success";
}

function log(message) {
  resultEl.textContent = message;
}

function sendToMiniProgram(message) {
  if (typeof my?.postMessage === "function") {
    my.postMessage(message);
    return true;
  }

  updateStatus("my.postMessage no disponible", "error");
  log("No se pudo enviar mensaje al MiniProgram");
  return false;
}

function getAuthCode() {
  updateStatus("? Requesting authorization...", "info");

  const message = {
    action: "getAuthCode",
    scopes: ["auth_base"],
    requestId: "req_" + Date.now(),
    timestamp: new Date().toISOString(),
  };

  if (sendToMiniProgram(message)) {
    log("Authorization request sent, waiting for response...", "info");
  }
}

window.addEventListener("load", getAuthCode);
