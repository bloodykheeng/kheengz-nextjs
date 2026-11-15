/**
 * Photos on screen: which ones Next.js resizes for each spot they appear in.
 *
 * Only photos the API stores (uploads and pictures it downloaded from a link,
 * served from `{API origin}/storage/...`) go through the image optimizer, which
 * `next.config.ts` allows by the same origin. Anything else (an External photo
 * on someone else's CDN, a `blob:` preview of a file not uploaded yet) is shown
 * as it is: we do not fetch other people's images through our server.
 * The sizes are set in next.config.ts `images`.
 */
const API_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api").origin;

export function isStoredPhoto(url: string): boolean {
  return url.startsWith(`${API_ORIGIN}/storage/`);
}
