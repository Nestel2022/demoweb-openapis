/**
 * Módulo HTTP usando Fetch API (Nativa)
 * Alternativa moderna, sin dependencias externas
 * Documentación: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */

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
 * Cliente HTTP basado en Fetch API
 * API nativa, sin dependencias externas
 */
export async function requestWithFetch(requestConfig, debugSteps = []) {
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

  console.log("🔹 [requestWithFetch] ========== INICIANDO FETCH API ==========");
  console.log("   URL:", url);
  console.log("   METHOD:", method);
  console.log("   Headers:", finalHeaders);

  try {
    console.log("➡️ Usando Fetch para la solicitud...");
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ [requestWithFetch] Fetch completó en ${elapsedTime}ms`);
    console.log("   Status:", response.status, response.statusText);

    // Parsear respuesta
    let responseData;
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    console.log("   Response Data:", responseData);

    if (response.ok) {
      console.log("✅ [requestWithFetch] Respuesta exitosa");
      return {
        status: response.status,
        data: responseData,
        debugEntry: {
          ...debugEntry,
          transport: "fetch",
          success: true,
        },
      };
    } else {
      console.error("❌ [requestWithFetch] HTTP Error:", response.status);
      throw new Error(
        `HTTP ${response.status}: ${
          typeof responseData === "string"
            ? responseData
            : JSON.stringify(responseData)
        }`
      );
    }
  } catch (error) {
    console.error("❌ [requestWithFetch] Error:", error?.message);
    console.error("   Error type:", error?.name);
    console.error("   Full error:", error);

    // Detectar tipo de error
    let friendlyMessage = error?.message || "Unknown error";

    if (error?.name === "AbortError") {
      friendlyMessage = "⏱️ Timeout: La solicitud tardó demasiado (30s)";
    } else if (error?.message === "Failed to fetch") {
      friendlyMessage = "🌐 Error de red: No se pudo conectar al servidor";
    } else if (error?.name === "TypeError") {
      friendlyMessage = "🔌 Error de red o URL inválida";
    }

    const fetchError = new Error(friendlyMessage);
    fetchError.debugSteps = [...debugSteps];
    fetchError.lastRequest = debugEntry;
    fetchError.originalError = error;

    throw fetchError;
  }
}

/**
 * Verificar disponibilidad de Fetch API
 */
export function isFetchAvailable() {
  const available = typeof fetch !== "undefined";
  console.log("📊 Fetch API disponible:", available);
  return available;
}

/**
 * Obtener información de Fetch
 */
export function getFetchInfo() {
  const available = typeof fetch !== "undefined";
  
  return {
    available,
    version: "native",
    message: available 
      ? "Fetch API disponible (API nativa del navegador)" 
      : "Fetch API no disponible",
    features: {
      abort: typeof AbortController !== "undefined",
      signal: typeof AbortSignal !== "undefined",
      headers: typeof Headers !== "undefined",
      request: typeof Request !== "undefined",
      response: typeof Response !== "undefined",
    },
  };
}
