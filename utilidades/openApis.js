import { getPrivateKey } from "./config.js";
import { signGenerator } from "./generateSignature.js";
import { requestWithFetch } from "./fetchTransport.js";

function escapeShellValue(value) {
  return String(value).replaceAll('"', String.raw`\"`);
}

function buildCurlCommand(requestConfig, headers) {
  const method = requestConfig.method || "POST";
  const headerParts = Object.entries(headers || {}).map(
    ([key, value]) => `-H "${escapeShellValue(key)}: ${escapeShellValue(value)}"`
  );
  const data = JSON.stringify(requestConfig.data || {});

  return [
    `curl -X ${method}`,
    `"${escapeShellValue(requestConfig.url)}"`,
    ...headerParts,
    `--data-raw '${data}'`,
  ].join(" ");
}

function createHttpError(message, debugSteps, debugEntry, cause) {
  const error = new Error(message);

  if (cause) {
    error.cause = cause;
  }

  error.debugSteps = Array.isArray(debugSteps) ? [...debugSteps] : [];

  if (debugEntry) {
    error.lastRequest = debugEntry;
  }

  return error;
}

function callMyAsync(method, params = {}) {
  return new Promise((resolve, reject) => {
    try {
      const maybePromise = my.call(method, params, (response) => {
        resolve(response);
      });

      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(resolve).catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function requestHttpAsync(requestConfig, debugSteps) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (requestConfig.headers) {
    Object.assign(headers, requestConfig.headers);
  }

  console.log("🔹 [requestHttpAsync] Iniciando transporte con Fetch API...");
  console.log("   URL:", requestConfig.url);
  console.log("   METHOD:", requestConfig.method || "POST");

  try {
    const startTime = Date.now();

    // Usar Fetch API como transporte principal
    const response = await requestWithFetch(
      {
        url: requestConfig.url,
        method: requestConfig.method || "POST",
        headers,
        data: requestConfig.data || {},
      },
      debugSteps
    );

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ [requestHttpAsync] Transporte completó en ${elapsedTime}ms`);
    console.log("   Transport usado:", response.debugEntry?.transport);
    console.log("   Status:", response.status);
    console.log("   Response Data:", response.data);

    return {
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    const errorMessage = error?.message || String(error);
    console.error(`❌ [requestHttpAsync] ERROR: ${errorMessage}`);
    console.error("   Full error:", error);

    if (error?.debugSteps) {
      throw error;
    }

    throw createHttpError(errorMessage, debugSteps, null, error);
  }
}

async function getTokens() {
  const response = await callMyAsync("MQFetchSelfcareParameters", {});

  if (!response) {
    return {};
  }

  return response.result || response.data || response;
}

function getAuthCodeFromUrl() {
  const searchParams = new URLSearchParams(globalThis.location.search);
  const hashParams = new URLSearchParams(globalThis.location.hash.replace(/^#/, ""));

  return (
    searchParams.get("authCode") ||
    searchParams.get("auth_code") ||
    hashParams.get("authCode") ||
    hashParams.get("auth_code")
  );
}

function getAppIdFromUrl() {
  const searchParams = new URLSearchParams(globalThis.location.search);
  const hashParams = new URLSearchParams(globalThis.location.hash.replace(/^#/, ""));

  return (
    searchParams.get("appId") ||
    searchParams.get("app_id") ||
    hashParams.get("appId") ||
    hashParams.get("app_id")
  );
}

function generateSignatureFormat(globaldata, requestGateway, requestTimeGateway, url) {
  return {
    HTTP_METHOD: "POST",
    URL: url,
    CLIENT_ID: globaldata.clientId,
    MERCHANT_ID: globaldata.merchantId,
    REQUEST_TIME: requestTimeGateway,
    PRIVATE_KEY: globaldata.privateKey,
    reqMap: {
      ...requestGateway,
    },
  };
}

async function getConfigAccessToken(data) {
  const { clientId, merchantId } = data;

  const authCode = getAuthCodeFromUrl();
  const appId = getAppIdFromUrl();

  if (!authCode) {
    throw new Error("No se encontró authCode en la URL.");
  }

  if (!appId) {
    throw new Error("No se encontró appId en la URL.");
  }

  const body = {
    appId,
    grantType: "AUTHORIZATION_CODE",
    authClientId: clientId,
    authCode,
  };

  const requestTimeGateway = Math.floor(Date.now() / 1000).toString();
  const url = "/miniprogram/api/v2/authorization/applyToken";
  const signatureFormat = generateSignatureFormat(data, body, requestTimeGateway, url);
  const signature = signGenerator(signatureFormat);

  return {
    clientId,
    merchantId,
    signature,
    requestTimeGateway,
    body,
  };
}

async function getAccessToken(url, dataService, debugSteps = []) {
  console.log("🔹 [getAccessToken] Iniciando getAccessToken...");
  console.log("   URL base proporcionada:", url);
  
  const data = await getConfigAccessToken(dataService);
  
  const headersApply = {
    "Client-Id": data.clientId,
    "Request-Time": data.requestTimeGateway,
    Signature: data.signature,
    "Merchant-id": data.merchantId,
  };

  const fullUrl = `${url}applyToken`;
  console.log("✅ [getAccessToken] URL COMPLETA PARA APPLYTOKEN:", fullUrl);
  console.log("   Signature (primeros 50 chars):", data.signature.substring(0, 50) + "...");

  const requestConfig = {
    url: fullUrl,
    method: "POST",
    data: data.body,
    headers: headersApply,
  };

  console.log("✅ [getAccessToken] Llamando requestHttpAsync...");
  try {
    const response = await requestHttpAsync(requestConfig, debugSteps);
    console.log("✅ [getAccessToken] applyToken EXITOSO");
    return response;
  } catch (error) {
    console.error("❌ [getAccessToken] applyToken FALLÓ:", error?.message);
    throw error;
  }
}

async function getConfigInquiryUserInfo(url, debugSteps = []) {
  const data = getPrivateKey();
  const responseAccessToken = await getAccessToken(url, data, debugSteps);
  const { clientId, merchantId } = data;
  const appId = getAppIdFromUrl();

  if (!appId) {
    throw new Error("No se encontró appId en la URL.");
  }

  const body = {
    appId,
    accessToken: responseAccessToken.data.accessToken,
    authClientId: clientId,
  };

  const requestTimeGateway = Math.floor(Date.now() / 1000).toString();
  const urlConfig = "/miniprogram/api/v2/users/inquiryUserBasicInfo";
  const signatureFormat = generateSignatureFormat(data, body, requestTimeGateway, urlConfig);
  const signature = signGenerator(signatureFormat);

  return {
    clientId,
    merchantId,
    signature,
    requestTimeGateway,
    body,
    responseAccessToken,
  };
}

export async function getInquiryUserInfo(urlUsers, urlApplyToken, headers = {}) {
  const debugSteps = [];
  
  console.log("🔹 [getInquiryUserInfo] ========== INICIANDO FLUJO COMPLETO ==========");
  console.log("   urlUsers (base):", urlUsers);
  console.log("   urlApplyToken (base):", urlApplyToken);
  
  try {
    console.log("🔹 [getInquiryUserInfo] Obteniendo tokens de dispositivo...");
    const tokens = await getTokens();
    console.log("   Tokens obtenidos:", tokens);

    headers["X-MC-DEVICE-ID"] = tokens.device_id || "";
    headers["X-MC-USER-AGENT"] = tokens.user_agent || "";
    console.log("   Headers adicionales configurados:", headers);

    console.log("🔹 [getInquiryUserInfo] Configurando acceso a token...");
    const data = await getConfigInquiryUserInfo(urlApplyToken, debugSteps);
    console.log("✅ [getInquiryUserInfo] Config obtenida, primer request realizado");
    console.log("   Access Token recibido:", data.responseAccessToken.data.accessToken?.substring(0, 50) + "...");

    const headersApply = {
      "Client-Id": data.clientId,
      "Request-Time": data.requestTimeGateway,
      Signature: data.signature,
      "Merchant-id": data.merchantId,
      ...headers,
    };

    const fullUrl = `${urlUsers}inquiryUserBasicInfo`;
    console.log("🔹 [getInquiryUserInfo] Realizando inquiry...");
    console.log("   ✅ URL COMPLETA PARA INQUIRY:", fullUrl);
    console.log("   ✅ Signature (primeros 50 chars):", data.signature.substring(0, 50) + "...");

    const requestConfig = {
      url: fullUrl,
      method: "POST",
      data: data.body,
      headers: headersApply,
    };

    console.log("✅ [getInquiryUserInfo] Llamando requestHttpAsync para inquiryUserBasicInfo...");
    const inquiryResponse = await requestHttpAsync(requestConfig, debugSteps);

    console.log("✅ [getInquiryUserInfo] ========== FLUJO COMPLETADO EXITOSAMENTE ==========");
    return {
      inquiryResponse,
      accessTokenResponse: {
        status: data.responseAccessToken.status,
        data: data.responseAccessToken.data,
      },
      debugSteps,
    };
  } catch (error) {
    console.error("❌ [getInquiryUserInfo] ERROR EN FLUJO:", error?.message || String(error));
    console.error("   debugSteps hasta el error:", debugSteps.length, "requests registrados");
    console.error("   Detalles del error:", error);
    
    if (!error?.debugSteps) {
      error.debugSteps = [...debugSteps];
    }

    throw error;
  }
}

export function getExtraData(headers) {
  return {
    "X-MC-DEVICE-ID": headers["X-MC-DEVICE-ID"],
    "X-MC-USER-AGENT": headers["X-MC-USER-AGENT"],
  };
}