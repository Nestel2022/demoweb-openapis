import { getOpenApiUrls, ENV } from "./utilidades/config.js";
import { getInquiryUserInfo } from "./utilidades/openApis.js";

const resultEl = document.getElementById("result");
const statusEl = document.getElementById("status");
const runButton = document.getElementById("run-open-api");

function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = type === "error" ? "status error" : "status success";
}

function setResult(value) {
  resultEl.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

async function runInquiryUserInfo() {
  try {
    const { urlApplyToken, urlUsers } = getOpenApiUrls();

    setStatus(`Consultando OpenAPI en ${ENV}...`, "info");
    setResult("Ejecutando flujo applyToken -> inquiryUserBasicInfo...");

    const response = await getInquiryUserInfo(urlUsers, urlApplyToken, {});

    setResult(response);
    setStatus("Consulta completada", "success");
    alert(JSON.stringify(response, null, 2));
  } catch (error) {
    const message = error?.message || String(error);

    setResult(message);
    setStatus(message, "error");
    alert(message);
  }
}

runButton?.addEventListener("click", runInquiryUserInfo);

globalThis.addEventListener("load", () => {
  setStatus(`Listo para consumir OpenAPI en ${ENV}`, "info");
});
