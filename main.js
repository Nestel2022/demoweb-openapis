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

function formatTraceResponse(response) {
  if (!response || !Array.isArray(response.debugSteps)) {
    return JSON.stringify(response, null, 2);
  }

  let output = "=== REQUESTS (TRACE) ===\n\n";

  for (let index = 0; index < response.debugSteps.length; index += 1) {
    const step = response.debugSteps[index];
    output += `-- Request ${index + 1} --\n`;
    output += `URL: ${step.url}\n`;
    output += `METHOD: ${step.method}\n`;
    output += `HEADERS:\n${JSON.stringify(step.headers, null, 2)}\n`;
    output += `BODY:\n${JSON.stringify(step.body, null, 2)}\n`;
    output += `CURL:\n${step.curl}\n\n`;
  }

  output += "=== RESPONSES ===\n\n";
  output += `ACCESS TOKEN RESPONSE:\n${JSON.stringify(response.accessTokenResponse, null, 2)}\n\n`;
  output += `INQUIRY USER RESPONSE:\n${JSON.stringify(response.inquiryResponse, null, 2)}`;

  return output;
}

function formatTraceError(error) {
  const message = error?.message || String(error);

  if (!Array.isArray(error?.debugSteps) || error.debugSteps.length === 0) {
    return `ERROR:\n${message}`;
  }

  let output = `ERROR:\n${message}\n\n=== REQUESTS BEFORE FAILURE ===\n\n`;

  for (let index = 0; index < error.debugSteps.length; index += 1) {
    const step = error.debugSteps[index];
    output += `-- Request ${index + 1} --\n`;
    output += `URL: ${step.url}\n`;
    output += `METHOD: ${step.method}\n`;
    output += `HEADERS:\n${JSON.stringify(step.headers, null, 2)}\n`;
    output += `BODY:\n${JSON.stringify(step.body, null, 2)}\n`;
    output += `CURL:\n${step.curl}\n\n`;
  }

  return output;
}

async function runInquiryUserInfo() {
  try {
    const { urlApplyToken, urlUsers } = getOpenApiUrls();

    setStatus(`Consultando OpenAPI en ${ENV}...`, "info");
    setResult("Ejecutando flujo applyToken -> inquiryUserBasicInfo...");

    const response = await getInquiryUserInfo(urlUsers, urlApplyToken, {});

    setResult(formatTraceResponse(response));
    setStatus("Consulta completada", "success");
    alert("Consulta completada. Revisa el panel Resultado para ver requests, curl y responses.");
  } catch (error) {
    const message = error?.message || String(error);

    setResult(formatTraceError(error));
    setStatus(message, "error");
    alert(message);
  }
}

runButton?.addEventListener("click", runInquiryUserInfo);

globalThis.addEventListener("load", () => {
  setStatus(`Listo para consumir OpenAPI en ${ENV}`, "info");
});
