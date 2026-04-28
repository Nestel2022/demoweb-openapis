import { getOpenApiUrls, ENV } from "./utilidades/config.js";
import { getInquiryUserInfo } from "./utilidades/openApis.js";
import { getAxiosInfo, isAxiosAvailable } from "./utilidades/axiosTransport.js";

const resultEl = document.getElementById("result");
const statusEl = document.getElementById("status");
const runButton = document.getElementById("run-open-api");
const debugLogsEl = document.getElementById("debug-logs");
const clearLogsBtn = document.getElementById("clear-logs");

// ============ SISTEMA DE LOGS ============
const LogSystem = {
  entries: [],
  maxEntries: 100,

  addLog(message, type = "info", data = null) {
    const timestamp = new Date().toLocaleTimeString("es-CO");
    const entry = {
      timestamp,
      type,
      message,
      data,
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    this.renderLog(entry);
  },

  renderLog(entry) {
    const logEl = document.createElement("div");
    logEl.className = `log-entry log-${entry.type}`;

    let content = `<span class="log-timestamp">[${entry.timestamp}]</span> ${entry.message}`;

    if (entry.data) {
      const dataStr =
        typeof entry.data === "string"
          ? entry.data
          : JSON.stringify(entry.data, null, 2);
      content += `\n<div style="margin-top: 5px; padding-left: 10px; color: #999; font-size: 0.75rem;">${dataStr}</div>`;
    }

    logEl.innerHTML = content;
    debugLogsEl.appendChild(logEl);

    // Auto-scroll al final
    debugLogsEl.scrollTop = debugLogsEl.scrollHeight;
  },

  clear() {
    this.entries = [];
    debugLogsEl.innerHTML =
      '<div class="log-entry log-info"><span class="log-timestamp">[CLEAR]</span> Logs limpiados</div>';
  },
};

// Interceptar console.log y console.error
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function (...args) {
  originalLog(...args);
  const message = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  LogSystem.addLog(message, "info");
};

console.error = function (...args) {
  originalError(...args);
  const message = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  LogSystem.addLog(message, "error");
};

console.warn = function (...args) {
  originalWarn(...args);
  const message = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  LogSystem.addLog(message, "warn");
};

// Capturar errores globales
globalThis.addEventListener("error", (event) => {
  LogSystem.addLog(`❌ GLOBAL ERROR: ${event.message}`, "error", {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

globalThis.addEventListener("unhandledrejection", (event) => {
  LogSystem.addLog(`❌ UNHANDLED REJECTION: ${event.reason}`, "error");
});

// Botón para limpiar logs
clearLogsBtn?.addEventListener("click", () => {
  LogSystem.clear();
});

// ============ RESTO DEL CÓDIGO ============

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

    LogSystem.addLog(`🚀 INICIANDO FLUJO EN AMBIENTE: ${ENV}`, "success", {
      urlApplyToken,
      urlUsers,
    });

    setStatus(`Consultando OpenAPI en ${ENV}...`, "info");
    setResult("⏳ Ejecutando flujo applyToken -> inquiryUserBasicInfo...\n\n✅ Ve los logs en tiempo real en el panel LOGS EN TIEMPO REAL");

    const response = await getInquiryUserInfo(urlUsers, urlApplyToken, {});

    LogSystem.addLog("✅ FLUJO COMPLETADO EXITOSAMENTE", "success", {
      accessToken: response.accessTokenResponse?.data?.accessToken?.substring(0, 50) + "...",
      userInfo: response.inquiryResponse?.data,
    });

    setResult(formatTraceResponse(response));
    setStatus("✅ Consulta completada", "success");
    alert("✅ Consulta completada. Revisa los logs en el panel de LOGS EN TIEMPO REAL");
  } catch (error) {
    const message = error?.message || String(error);

    LogSystem.addLog(`❌ ERROR EN FLUJO: ${message}`, "error", {
      errorType: error?.name,
      errorStack: error?.stack,
      debugSteps: error?.debugSteps?.length || 0,
    });

    console.error("Full error:", error);

    setResult(formatTraceError(error));
    setStatus("❌ " + message, "error");
    alert("❌ Error: " + message + "\n\nRevisa los logs en el panel LOGS EN TIEMPO REAL");
  }
}

runButton?.addEventListener("click", runInquiryUserInfo);

globalThis.addEventListener("load", () => {
  const axiosAvailable = isAxiosAvailable();
  const axiosInfo = getAxiosInfo();

  LogSystem.addLog(
    `✅ Sistema listo en ambiente: ${ENV}`,
    "success",
    {
      axiosDisponible: axiosAvailable,
      axiosVersion: axiosInfo.version,
      mensaje: axiosAvailable
        ? "✅ Usando Axios para consumir APIs"
        : "⚠️ Axios no disponible, usa fallback",
    }
  );

  setStatus(`Listo para consumir OpenAPI en ${ENV}`, "info");
});
