const resultEl = document.getElementById("result");
const statusEl = document.getElementById("status");

function showResult(text, type = "info") {
  resultEl.textContent = text;
  statusEl.textContent = text;
  statusEl.className = type === "error" ? "status error" : "status success";
}

function showError(error) {
  const msg = error?.message || String(error);
  showResult(msg, "error");
  console.error(msg, error);
}

async function getAuthCode() {
  try {
    showResult("Obteniendo authCode...");

    if (!my) {
      throw new Error("API my no disponible. Verifica que estés en MiniProgram WebView.");
    }

    if (typeof my.getAuthCode !== "function") {
      throw new Error("my.getAuthCode no es una función.");
    }

    const res = await my.getAuthCode({
      scopes: ["User_Customer_Info"]
    });

    showResult(`AuthCode: ${res.authCode}`, "success");
    console.log("AuthCode:", res.authCode);
  } catch (error) {
    showError(error);
  }
}

window.addEventListener("load", () => {
  getAuthCode();
});
