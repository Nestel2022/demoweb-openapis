import jsrsasign from "https://esm.sh/jsrsasign@11.1.0";

function normalizePrivateKey(privateKey) {
  if (privateKey.includes("BEGIN PRIVATE KEY")) {
    return privateKey;
  }

  return `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
}

export function signContent(content, privateKeyPem) {
  const privateKey = jsrsasign.KEYUTIL.getKey(privateKeyPem);
  const sig = new jsrsasign.crypto.Signature({ alg: "SHA256withRSA" });

  sig.init(privateKey);
  sig.updateString(content);

  const signature = sig.sign();
  return jsrsasign.hextob64(signature);
}

export function signGenerator(data) {
  const {
    HTTP_METHOD,
    URL,
    REQUEST_TIME,
    MERCHANT_ID,
    PRIVATE_KEY,
    CLIENT_ID,
    reqMap,
  } = data;

  const mapJson = JSON.stringify(reqMap);
  const content = `${HTTP_METHOD} ${URL}\n${CLIENT_ID}.${MERCHANT_ID}.${REQUEST_TIME}.${mapJson}`;
  const signed = signContent(content, normalizePrivateKey(PRIVATE_KEY));

  return `algorithm=RSA256, keyVersion=0, signature=${signed}`;
}