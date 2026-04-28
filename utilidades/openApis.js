import { getPrivateKey } from "./config.js";
import { signGenerator } from "./generateSignature.js";
import { obtenerAuthCodeConFallback } from "./authCode.js";

function validarMyDisponible() {
  if (!globalThis?.my) {
    throw new Error("API my no disponible. Verifica web-view.min.js en el WebView.");
  }
}

export async function getTokens() {
  try {
    validarMyDisponible();
    const { result } = await my.call("MQFetchSelfcareParameters", {});
    return result;
  } catch (error) {
    return error;
  }
}

export function generateSignatureFormat(globaldata, requestGateway, requestTimeGateway, url) {
  return {
    HTTP_METHOD: "POST",
    URL: url,
    CLIENT_ID: globaldata.clientId,
    MERCHANT_ID: globaldata.merchantId,
    REQUEST_TIME: requestTimeGateway,
    PRIVATE_KEY: globaldata.privateKey,
    reqMap: {
      ...requestGateway
    }
  };
}

export async function getConfigAccessToken(data) {
  const { clientId, merchantId } = data;

  try {
    validarMyDisponible();
    const authCode = await obtenerAuthCodeConFallback();
    const { appId } = my.getAppIdSync();

    const body = {
      appId,
      grantType: "AUTHORIZATION_CODE",
      authClientId: clientId,
      authCode
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
      body
    };
  } catch (error) {
    return error;
  }
}

export async function getAccessToken(url, dataService) {
  try {
    validarMyDisponible();
    const data = await getConfigAccessToken(dataService);

    const headersApply = {
      "Client-Id": data.clientId,
      "Request-Time": data.requestTimeGateway,
      Signature: data.signature,
      "Merchant-id": data.merchantId
    };

    const requestConfig = {
      url: `${url}applyToken`,
      method: "POST",
      data: data.body,
      headers: headersApply
    };

    return await my.requestLogs(requestConfig);
  } catch (error) {
    return error;
  }
}

export async function getConfigInquiryUserInfo(url) {
  try {
    validarMyDisponible();
    const data = getPrivateKey();
    const responseAccessToken = await getAccessToken(url, data);
    const { clientId, merchantId } = data;
    const { appId } = my.getAppIdSync();

    const body = {
      appId,
      accessToken: responseAccessToken?.data?.accessToken,
      authClientId: clientId
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
      body
    };
  } catch (error) {
    return error;
  }
}

export async function getInquiryUserInfo(urlUsers, urlApplyToken, headers = {}) {
  try {
    validarMyDisponible();
    const tokens = await getTokens();

    headers["X-MC-DEVICE-ID"] = tokens?.device_id || "";
    headers["X-MC-USER-AGENT"] = tokens?.user_agent || "";

    const data = await getConfigInquiryUserInfo(urlApplyToken);
    const headersApply = {
      "Client-Id": data.clientId,
      "Request-Time": data.requestTimeGateway,
      Signature: data.signature,
      "Merchant-id": data.merchantId,
      ...getExtraData(headers)
    };

    const requestConfig = {
      url: `${urlUsers}inquiryUserBasicInfo`,
      method: "POST",
      data: data.body,
      headers: headersApply
    };

    return await my.requestLogs(requestConfig);
  } catch (error) {
    return error;
  }
}

export function getExtraData(headers) {
  return {
    "X-MC-DEVICE-ID": headers["X-MC-DEVICE-ID"],
    "X-MC-USER-AGENT": headers["X-MC-USER-AGENT"]
  };
}
