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

globalThis.addEventListener("load", () => {
  const authCode = getAuthCodeFromUrl();

  if (authCode) {
    alert(`authCode: ${authCode}`);
    return;
  }

  alert("No se encontró authCode en la URL");
});
