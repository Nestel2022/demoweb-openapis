function obtenerMyDesdeWebView() {
  const sdk = globalThis?.my || globalThis?.window?.my;

  if (!sdk || typeof sdk.getAuthCode !== "function") {
    throw new Error(
      "SDK no disponible. Esta funcionalidad corre dentro de MiniProgram Studio (web-view). Verifica la carga de <script src=\"https://appx/web-view.min.js\"></script> en ese contexto."
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
