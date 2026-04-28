import { obtenerAuthCodeConFallback } from "./utilidades/authCode.js";
import { getInquiryUserInfo } from "./utilidades/openApis.js";
import { getOpenApiUrls, ENV } from "./utilidades/config.js";

const btnAuth = document.getElementById("btn-auth");
const btnUserInfo = document.getElementById("btn-user-info");
const btnClear = document.getElementById("btn-clear");
const authOutput = document.getElementById("auth-output");
const status = document.getElementById("status");
const urlApplyTokenInput = document.getElementById("url-apply-token");
const urlUsersInput = document.getElementById("url-users");
const sdkScript = document.getElementById("sdk-webview");
const defaultUrls = getOpenApiUrls();

if (urlApplyTokenInput && !urlApplyTokenInput.value) {
  urlApplyTokenInput.value = defaultUrls.urlApplyToken;
}

if (urlUsersInput && !urlUsersInput.value) {
  urlUsersInput.value = defaultUrls.urlUsers;
}

function setStatus(message, type = "") {
  status.textContent = message;
  status.className = type ? `status ${type}` : "status";
}

function hasMyApi() {
  return Boolean(globalThis?.my || globalThis?.window?.my);
}

function getMiniProgramEnv() {
  return new Promise((resolve, reject) => {
    if (!hasMyApi() || typeof my.getEnv !== "function") {
      reject(new Error("my.getEnv no está disponible en este contexto."));
      return;
    }

    try {
      my.getEnv((res) => resolve(res || {}));
    } catch (error) {
      reject(error);
    }
  });
}

function setupWebViewMessaging() {
  if (!hasMyApi()) {
    return;
  }

  my.onMessage = function onMessageFromMiniProgram(e) {
    const payload = formatJson(e);

    console.log("Mensaje recibido desde Mini Program:", e);
    authOutput.textContent = `Mensaje recibido desde Mini Program:\n${payload}`;
    setStatus("Mensaje recibido desde Mini Program.", "ok");
  };

  if (typeof my.postMessage === "function") {
    my.postMessage({ name: "web-view cargado" });
  }
}

function showErrorOnScreen(message, detail = "") {
  const safeMessage = message || "Ocurrió un error no controlado.";
  const safeDetail = detail ? `\n\nDetalle:\n${detail}` : "";

  authOutput.textContent = `${safeMessage}${safeDetail}`;
  setStatus(safeMessage, "error");
}

function extractErrorDetail(errorLike) {
  if (!errorLike) {
    return "";
  }

  if (typeof errorLike === "string") {
    return errorLike;
  }

  if (errorLike?.stack) {
    return errorLike.stack;
  }

  if (errorLike?.message) {
    return errorLike.message;
  }

  try {
    return JSON.stringify(errorLike, null, 2);
  } catch {
    return String(errorLike);
  }
}

async function onObtenerAuthCode() {
  authOutput.textContent = "Procesando...";
  setStatus("Solicitando autorización...");

  try {
    const authCode = await obtenerAuthCodeConFallback();
    authOutput.textContent = authCode || "(vacío)";
    setStatus("Auth code obtenido correctamente.", "ok");
    console.log("AuthCode:", authCode || "(vacío)");
    return authCode;
  } catch (error) {
    showErrorOnScreen(error?.message || "No fue posible obtener el auth code.", extractErrorDetail(error));
    console.error("Error obteniendo authCode:", error);
    return null;
  }
}

function formatJson(data) {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

async function onConsultarUsuario() {
  const urlApplyToken = urlApplyTokenInput?.value?.trim() || defaultUrls.urlApplyToken;
  const urlUsers = urlUsersInput?.value?.trim() || defaultUrls.urlUsers;

  authOutput.textContent = "Procesando consulta OpenAPI...";
  setStatus(`Consultando información de usuario en entorno ${ENV}...`);

  try {
    const response = await getInquiryUserInfo(urlUsers, urlApplyToken, {});
    authOutput.textContent = formatJson(response);
    setStatus("Consulta realizada correctamente.", "ok");
  } catch (error) {
    showErrorOnScreen(error?.message || "Fallo en la consulta OpenAPI.", extractErrorDetail(error));
  }
}

function onLimpiar() {
  authOutput.textContent = "Sin ejecutar";
  setStatus("");
}

btnAuth?.addEventListener("click", onObtenerAuthCode);
btnUserInfo?.addEventListener("click", onConsultarUsuario);
btnClear?.addEventListener("click", onLimpiar);

globalThis.addEventListener("error", (event) => {
  const message = event?.message || "Error de ejecución.";
  const detail = extractErrorDetail(event?.error) || `${event?.filename || ""}:${event?.lineno || ""}`;

  showErrorOnScreen(message, detail);
});

globalThis.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason;
  const message = (typeof reason === "object" && reason?.message) || "Promesa rechazada sin manejo.";

  showErrorOnScreen(message, extractErrorDetail(reason));
});

sdkScript?.addEventListener("error", () => {
  const msg = "No se pudo cargar web-view.min.js.";

  showErrorOnScreen(msg, "Verifica conectividad/DNS y que el host appx sea accesible desde este entorno.");
});

window.addEventListener("load", () => {
  void (async () => {
    if (globalThis.__sdkLoadError) {
      showErrorOnScreen(globalThis.__sdkLoadError, "El SDK no se cargó. No se puede solicitar authCode.");
      return;
    }

    if (!hasMyApi()) {
      showErrorOnScreen(
        "API my no disponible.",
        "Esta funcionalidad corre en MiniProgram Studio WebView. Verifica que el contenedor cargue web-view.min.js."
      );
      return;
    }

    setupWebViewMessaging();

    try {
      const env = await getMiniProgramEnv();

      if (!env?.miniprogram) {
        showErrorOnScreen(
          "No estás en entorno Mini Program.",
          `Resultado de my.getEnv: ${formatJson(env)}`
        );
        return;
      }

      console.log("Entorno Mini Program detectado:", env);
      await onObtenerAuthCode();
    } catch (error) {
      showErrorOnScreen("No se pudo validar entorno con my.getEnv.", extractErrorDetail(error));
    }
  })();
});
