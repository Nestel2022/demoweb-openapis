/**
 * Módulo de transporte HTTP híbrido
 * Intenta múltiples métodos: my.httpRequest (nativo MiniProgram) -> XMLHttpRequest -> fetch
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

// ============ MÉTODO 1: my.httpRequest (API NATIVA DEL MINIPROGRAM) ============
async function requestViaMyHttpRequest(url, method, headers, body) {
  console.log("🔹 [requestViaMyHttpRequest] Intentando usar my.httpRequest (API Nativa)...");

  if (typeof my === "undefined" || !my.httpRequest) {
    console.warn("⚠️ [requestViaMyHttpRequest] my.httpRequest no disponible");
    return null;
  }

  return new Promise((resolve, reject) => {
    try {
      my.httpRequest({
        url,
        method,
        headers,
        data: body,
        timeout: 30000,
        dataType: "json",
        success(response) {
          console.log("✅ [requestViaMyHttpRequest] Respuesta exitosa");
          console.log("   Status:", response.status);
          console.log("   Data:", response.data);

          if (response.status >= 200 && response.status < 300) {
            resolve({
              status: response.status,
              data: response.data,
              transport: "my.httpRequest",
            });
          } else {
            reject(
              new Error(
                `HTTP ${response.status}: ${JSON.stringify(response.data)}`
              )
            );
          }
        },
        error(err) {
          console.error("❌ [requestViaMyHttpRequest] Error:", err);
          reject(err);
        },
        complete() {
          console.log("✅ [requestViaMyHttpRequest] Completado");
        },
      });
    } catch (error) {
      console.error("❌ [requestViaMyHttpRequest] Exception:", error);
      reject(error);
    }
  });
}

// ============ MÉTODO 2: XMLHttpRequest (COMPATIBLE LEGACY) ============
async function requestViaXMLHttpRequest(url, method, headers, body) {
  console.log("🔹 [requestViaXMLHttpRequest] Intentando usar XMLHttpRequest...");

  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();

      xhr.open(method, url, true);
      xhr.timeout = 30000;

      // Configurar headers
      Object.entries(headers || {}).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.onload = () => {
        console.log("✅ [requestViaXMLHttpRequest] Respuesta recibida");
        console.log("   Status:", xhr.status);
        console.log("   Response:", xhr.responseText);

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              status: xhr.status,
              data,
              transport: "XMLHttpRequest",
            });
          } catch (e) {
            resolve({
              status: xhr.status,
              data: xhr.responseText,
              transport: "XMLHttpRequest",
            });
          }
        } else {
          reject(
            new Error(
              `HTTP ${xhr.status}: ${xhr.responseText}`
            )
          );
        }
      };

      xhr.onerror = () => {
        console.error("❌ [requestViaXMLHttpRequest] Network error");
        reject(new Error("Network error"));
      };

      xhr.ontimeout = () => {
        console.error("❌ [requestViaXMLHttpRequest] Timeout");
        reject(new Error("Request timeout"));
      };

      xhr.send(JSON.stringify(body));
    } catch (error) {
      console.error("❌ [requestViaXMLHttpRequest] Exception:", error);
      reject(error);
    }
  });
}

// ============ MÉTODO 3: fetch (API MODERNA) ============
async function requestViaFetch(url, method, headers, body) {
  console.log("🔹 [requestViaFetch] Intentando usar fetch...");

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
    }).catch((err) => {
      console.error("❌ [requestViaFetch] Fetch error:", err?.message);
      throw err;
    });

    console.log("✅ [requestViaFetch] Respuesta recibida");
    console.log("   Status:", response.status);

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (response.ok) {
      console.log("✅ [requestViaFetch] Datos parseados");
      return {
        status: response.status,
        data,
        transport: "fetch",
      };
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error("❌ [requestViaFetch] Error:", error?.message);
    throw error;
  }
}

// ============ ORQUESTADOR PRINCIPAL ============
export async function requestHybrid(requestConfig, debugSteps = []) {
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

  console.log("🔹 [requestHybrid] ========== INICIANDO TRANSPORTE HÍBRIDO ==========");
  console.log("   URL:", url);
  console.log("   METHOD:", method);
  console.log("   Headers:", finalHeaders);

  // Intentar en orden: my.httpRequest -> XMLHttpRequest -> fetch
  const methods = [
    { name: "my.httpRequest (API Nativa)", fn: requestViaMyHttpRequest },
    { name: "XMLHttpRequest (Legacy)", fn: requestViaXMLHttpRequest },
    { name: "fetch (Moderna)", fn: requestViaFetch },
  ];

  for (const { name, fn } of methods) {
    try {
      console.log(`\n➡️ Probando: ${name}...`);
      const response = await fn(url, method, finalHeaders, data);

      if (response) {
        console.log(`✅ ¡ÉXITO CON ${name}!`);
        console.log("   Status:", response.status);
        console.log("   Transport:", response.transport);

        return {
          status: response.status,
          data: response.data,
          debugEntry: {
            ...debugEntry,
            transport: response.transport,
            success: true,
          },
        };
      }
    } catch (error) {
      console.warn(`⚠️ ${name} falló:`, error?.message);
      continue; // Intentar el siguiente método
    }
  }

  // Si llegamos aquí, ningún método funcionó
  const errorMessage =
    "❌ Todos los métodos de transporte fallaron: my.httpRequest, XMLHttpRequest, fetch";
  console.error(errorMessage);

  const error = new Error(errorMessage);
  error.debugSteps = [...debugSteps];
  error.lastRequest = debugEntry;
  throw error;
}

// ============ FUNCIONES AUXILIARES ============
export function getAvailableTransports() {
  const available = [];

  if (typeof my !== "undefined" && my.httpRequest) {
    available.push("my.httpRequest");
  }

  if (typeof XMLHttpRequest !== "undefined") {
    available.push("XMLHttpRequest");
  }

  if (typeof fetch !== "undefined") {
    available.push("fetch");
  }

  return available;
}

export function getTransportInfo() {
  const info = {
    my: typeof my !== "undefined",
    myHttpRequest: typeof my !== "undefined" && !!my.httpRequest,
    XMLHttpRequest: typeof XMLHttpRequest !== "undefined",
    fetch: typeof fetch !== "undefined",
    available: getAvailableTransports(),
  };

  console.log("📊 [getTransportInfo] Transportes disponibles:", info);
  return info;
}
