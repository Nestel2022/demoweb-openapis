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
      const errorMsg = "API my no disponible. Verifica que estés en MiniProgram WebView.";
      showResult(errorMsg, "error");
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    // Debug: log what's available in my
    const availableMethods = Object.keys(my);
    alert(`Objeto my disponible:\n${JSON.stringify(my, null, 2)}`);
    alert(`Métodos en my:\n${availableMethods.join("\n")}`);
    
    alert(`Objeto my encontrado\n\nMétodos disponibles:\n${availableMethods.join("\n")}`);

    if (typeof my.getAuthCode !== "function") {
      const methodsList = availableMethods.join("\n");
      const errorMsg = `my.getAuthCode NO ES UNA FUNCIÓN\n\nMétodos disponibles en my:\n${methodsList}`;
      showResult(errorMsg, "error");
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    const res = await my.getAuthCode({
      scopes: ["User_Customer_Info"]
    });

    alert(`Respuesta de my.getAuthCode:\n${JSON.stringify(res, null, 2)}`);
    showResult(`AuthCode: ${res.authCode}`, "success");
    alert(`AuthCode obtenido exitosamente:\n${res.authCode}`);
    console.log("AuthCode:", res.authCode);
  } catch (error) {
    alert(`Error capturado: ${error?.message || String(error)}`);
    showError(error);
  }
}

window.addEventListener("load", () => {
  getAuthCode();
});
