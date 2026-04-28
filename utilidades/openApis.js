import { getPrivateKey } from "./config.js";
import { signGenerator } from "./generateSignature.js";

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

  const debugEntry = {
    url: requestConfig.url,
    method: requestConfig.method || "POST",
    headers,
    body: requestConfig.data || {},
    curl: buildCurlCommand(requestConfig, headers),
  };

  if (Array.isArray(debugSteps)) {
    debugSteps.push(debugEntry);
  }

  try {
    const response = await fetch(requestConfig.url, {
      method: requestConfig.method || "POST",
      headers,
      body: JSON.stringify(requestConfig.data || {}),
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw createHttpError(
        `HTTP ${response.status} ${response.statusText}: ${typeof data === "string" ? data : JSON.stringify(data)}`,
        debugSteps,
        debugEntry
      );
    }

    return {
      status: response.status,
      data,
    };
  } catch (error) {
    if (error?.debugSteps) {
      throw error;
    }

    throw createHttpError(error?.message || String(error), debugSteps, debugEntry, error);
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
  const data = await getConfigAccessToken(dataService);
  const headersApply = {
    "Client-Id": data.clientId,
    "Request-Time": data.requestTimeGateway,
    Signature: data.signature,
    "Merchant-id": data.merchantId,
  };

  const requestConfig = {
    url: `${url}applyToken`,
    method: "POST",
    data: data.body,
    headers: headersApply,
  };

  const response = await requestHttpAsync(requestConfig, debugSteps);

  return response;
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
  try {
    const tokens = await getTokens();

    headers["X-MC-DEVICE-ID"] = tokens.device_id || "";
    headers["X-MC-USER-AGENT"] = tokens.user_agent || "";

    const data = await getConfigInquiryUserInfo(urlApplyToken, debugSteps);

    const headersApply = {
      "Client-Id": data.clientId,
      "Request-Time": data.requestTimeGateway,
      Signature: data.signature,
      "Merchant-id": data.merchantId,
      ...headers,
    };

    const requestConfig = {
      url: `${urlUsers}inquiryUserBasicInfo`,
      method: "POST",
      data: data.body,
      headers: headersApply,
    };

    const inquiryResponse = await requestHttpAsync(requestConfig, debugSteps);

    return {
      inquiryResponse,
      accessTokenResponse: {
        status: data.responseAccessToken.status,
        data: data.responseAccessToken.data,
      },
      debugSteps,
    };
  } catch (error) {
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