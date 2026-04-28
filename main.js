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

async function onObtenerAuthCode() {
  authOutput.textContent = "Procesando...";
  setStatus("Solicitando autorización...");

  try {
    const authCode = await obtenerAuthCodeConFallback();
    authOutput.textContent = authCode || "(vacío)";
    setStatus("Auth code obtenido correctamente.", "ok");
  } catch (error) {
    authOutput.textContent = "Error";
    setStatus(error?.message || "No fue posible obtener el auth code.", "error");
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
    authOutput.textContent = "Error";
    setStatus(error?.message || "Fallo en la consulta OpenAPI.", "error");
  }
}

function onLimpiar() {
  authOutput.textContent = "Sin ejecutar";
  setStatus("");
}

btnAuth?.addEventListener("click", onObtenerAuthCode);
btnUserInfo?.addEventListener("click", onConsultarUsuario);
btnClear?.addEventListener("click", onLimpiar);

await onObtenerAuthCode();
