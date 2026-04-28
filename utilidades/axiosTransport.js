/**
 * Módulo HTTP usando Axios
 * Alternativa moderna y robusta para consumir APIs
 * Documentación: https://axios-http.com/
 */

// CDN de Axios (auto-cargado en HTML)
// <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

function buildCurlCommand(url, method, headers, body) {
  const headerParts = Object.entries(headers || {}).map(
    ([key, value]) => `-H "${String(value).replaceAll('"', '\\"')}: ${String(value).replaceAll('"', '\\"')}"`
  );
  const data = JSON.stringify(body || {});

  return [
    `curl -X ${method}`,
    `"${url}"`,
    ...headerParts,
    `--data-raw '${data}'`,
  ].join(" ");
}

/**
 * Cliente HTTP basado en Axios
 * Intenta: axios -> XMLHttpRequest -> fetch
 */
export async function requestWithAxios(requestConfig, debugSteps = []) {
  const { url, method = "POST", headers = {}, data } = requestConfig;

  const finalHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  const debugEntry = {
    url,
    method,
    headers: finalHeaders,
    body: data || {},
    curl: buildCurlCommand(url, method, finalHeaders, data),
  };

  if (Array.isArray(debugSteps)) {
    debugSteps.push(debugEntry);
  }

  console.log("🔹 [requestWithAxios] ========== INICIANDO AXIOS ==========");
  console.log("   URL:", url);
  console.log("   METHOD:", method);
  console.log("   Headers:", finalHeaders);

  // Verificar si Axios está disponible
  if (typeof axios === "undefined") {
    console.error(
      "❌ [requestWithAxios] Axios no cargado. Agrega: <script src='https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'></script>"
    );
    throw new Error("Axios no está disponible. Verifica que esté cargado en index.html");
  }

  try {
    console.log("➡️ Usando Axios para la solicitud...");
    const startTime = Date.now();

    const response = await axios({
      url,
      method,
      headers: finalHeaders,
      data,
      timeout: 30000, // 30 segundos
      validateStatus: () => true, // Aceptar cualquier status (lo checamos después)
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ [requestWithAxios] Axios completó en ${elapsedTime}ms`);
    console.log("   Status:", response.status, response.statusText);
    console.log("   Response Data:", response.data);

    if (response.status >= 200 && response.status < 300) {
      console.log("✅ [requestWithAxios] Respuesta exitosa");
      return {
        status: response.status,
        data: response.data,
        debugEntry: {
          ...debugEntry,
          transport: "axios",
          success: true,
        },
      };
    } else {
      console.error("❌ [requestWithAxios] HTTP Error:", response.status);
      throw new Error(
        `HTTP ${response.status}: ${
          typeof response.data === "string"
            ? response.data
            : JSON.stringify(response.data)
        }`
      );
    }
  } catch (error) {
    console.error("❌ [requestWithAxios] Error:", error?.message);
    console.error("   Error type:", error?.code || error?.name);
    console.error("   Full error:", error);

    // Detectar tipo de error
    let friendlyMessage = error?.message || "Unknown error";

    if (error?.code === "ECONNABORTED") {
      friendlyMessage = "⏱️ Timeout: La solicitud tardó demasiado";
    } else if (error?.code === "ERR_NETWORK") {
      friendlyMessage = "🌐 Error de red: No se pudo conectar al servidor";
    } else if (error?.response?.status === 0) {
      friendlyMessage = "🔌 Error de conectividad: Verifica la URL y conectividad";
    } else if (error?.response?.status === 403) {
      friendlyMessage = "🔒 Acceso denegado (403): Verifica los permisos y headers";
    } else if (error?.response?.status === 401) {
      friendlyMessage = "🔐 No autorizado (401): Verifica authCode y credentials";
    }

    const axiosError = new Error(friendlyMessage);
    axiosError.debugSteps = [...debugSteps];
    axiosError.lastRequest = debugEntry;
    axiosError.originalError = error;

    throw axiosError;
  }
}

/**
 * Verificar disponibilidad de Axios
 */
export function isAxiosAvailable() {
  const available = typeof axios !== "undefined";
  console.log("📊 Axios disponible:", available);
  return available;
}

/**
 * Obtener información de Axios
 */
export function getAxiosInfo() {
  if (typeof axios === "undefined") {
    return {
      available: false,
      version: null,
      message: "Axios no está cargado",
    };
  }

  return {
    available: true,
    version: axios.VERSION,
    defaults: {
      timeout: axios.defaults.timeout,
      headers: axios.defaults.headers,
    },
  };
}
