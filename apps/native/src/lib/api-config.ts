/**
 * Base URL for the web app API. Used for account deletion and other
 * server-side operations that require the service role.
 *
 * Set EXPO_PUBLIC_API_URL in your .env (e.g. https://your-app.vercel.app)
 */
export function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is required for account deletion. Set it to your web app URL (e.g. https://your-app.vercel.app)",
    );
  }
  return url.replace(/\/$/, "");
}
