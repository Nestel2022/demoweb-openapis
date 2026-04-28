function validarMyGetAuthCode() {
  if (!globalThis?.my || typeof my.getAuthCode !== "function") {
    throw new Error(
      "my.getAuthCode no disponible. Esta funcionalidad corre dentro de MiniProgram Studio (web-view). Verifica la carga de <script src=\"https://appx/web-view.min.js\"></script> en ese contexto."
    );
  }
}

export async function obtenerAuthCodeConFallback() {
  validarMyGetAuthCode();

  try {
    const res = await my.getAuthCode({
      scopes: ["User_Customer_Info"]
    });

    return res.authCode;
  } catch {
    const fallbackRes = await my.getAuthCode({
      scopes: ["User_Base_Info"]
    });

    return fallbackRes.authCode;
  }
}
