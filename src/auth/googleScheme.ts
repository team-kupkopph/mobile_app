// The custom URL scheme a native Google sign-in returns to. Google's iOS client page shows it
// as the client id reversed: "123-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.123-abc".
//
// Pure and dependency-free on purpose: app.config.ts registers this scheme with iOS at BUILD
// time and socialAuth.ts builds the redirect from it at RUN time, from the one env var. If the
// two ever drifted, the browser would return to a scheme the binary does not own and the
// sign-in would hang on a blank sheet — so both derive it here rather than each spelling it.
export function googleIosUrlScheme(clientId: string): string {
  const suffix = ".apps.googleusercontent.com";
  const head = clientId.endsWith(suffix) ? clientId.slice(0, -suffix.length) : clientId;
  return `com.googleusercontent.apps.${head}`;
}
