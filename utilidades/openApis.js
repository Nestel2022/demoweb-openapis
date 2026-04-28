import { getPrivateKey } from "./config.js";
import { signGenerator } from "./generateSignature.js";

async function getTokens() {
  try {
    const { result } = await my.call("MQFetchSelfcareParameters", {});
    return result;
  } catch (error) {
    throw error;
  }
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

  let authCode;

  try {
    const res = await my.getAuthCode({
      scopes: ["User_Customer_Info"],
    });
    authCode = res.authCode;
  } catch {
    const fallbackRes = await my.getAuthCode({
      scopes: ["User_Base_Info"],
    });
    authCode = fallbackRes.authCode;
  }

  const { appId } = my.getAppIdSync();
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

async function getAccessToken(url, dataService) {
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

  return my.requestLogs(requestConfig);
}

async function getConfigInquiryUserInfo(url) {
  const data = getPrivateKey();
  const responseAccessToken = await getAccessToken(url, data);
  const { clientId, merchantId } = data;
  const { appId } = my.getAppIdSync();

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
  };
}

export async function getInquiryUserInfo(urlUsers, urlApplyToken, headers = {}) {
  const tokens = await getTokens();

  headers["X-MC-DEVICE-ID"] = tokens.device_id || "";
  headers["X-MC-USER-AGENT"] = tokens.user_agent || "";

  const data = await getConfigInquiryUserInfo(urlApplyToken);
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

  return my.requestLogs(requestConfig);
}

export function getExtraData(headers) {
  return {
    "X-MC-DEVICE-ID": headers["X-MC-DEVICE-ID"],
    "X-MC-USER-AGENT": headers["X-MC-USER-AGENT"],
  };
}