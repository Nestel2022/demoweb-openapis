function obtenerMyDesdeWebView() {
  const sdk = globalThis?.my || globalThis?.window?.my;

  if (!sdk || typeof sdk.getAuthCode !== "function") {
    throw new Error(
      "SDK no disponible. Asegurate de cargar <script src=\"https://appx/web-view.min.js\"></script> antes de usar esta utilidad."
    );
  }

  return sdk;
}

export async function obtenerAuthCodeConFallback() {
  const sdk = obtenerMyDesdeWebView();

  try {
    const res = await sdk.getAuthCode({
      scopes: ["User_Customer_Info"]
    });

    return res.authCode;
  } catch {
    const fallbackRes = await sdk.getAuthCode({
      scopes: ["User_Base_Info"]
    });

    return fallbackRes.authCode;
  }
}
