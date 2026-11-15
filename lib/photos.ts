/**
 * Photos picked in the dashboard: checked here, shrunk here, sent with the form.
 *
 * Phones take 5 to 20 MB photos. The API takes up to 20 MB, but nobody should
 * push that over mobile data for a picture shown at 1,200 pixels, so a large
 * photo is redrawn at most 2,560 pixels on its longest side as an 85% JPEG
 * (a 15 MB photo leaves as about 1 MB). Anything the browser cannot draw, or
 * that would not get smaller, goes as it is.
 */

export const PHOTO_MAX_MB = 20;
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

const MAX_SIDE = 2560;
const SHRINK_ABOVE = 1.5 * 1024 * 1024;

/** Splits picked files into usable photos and a message about any left out. */
export function checkPhotos(files: File[]): { photos: File[]; problem: string | null } {
  const tooBig = files.filter((f) => f.size > PHOTO_MAX_MB * 1024 * 1024);
  const notPhotos = files.filter((f) => !PHOTO_ACCEPT.split(",").includes(f.type));
  const photos = files.filter((f) => !tooBig.includes(f) && !notPhotos.includes(f));

  const problem = tooBig.length
    ? `${tooBig.map((f) => f.name).join(", ")}: larger than ${PHOTO_MAX_MB} MB.`
    : notPhotos.length
      ? `${notPhotos.map((f) => f.name).join(", ")}: use JPG, PNG or WebP.`
      : null;

  return { photos, problem };
}

export async function shrinkPhoto(file: File): Promise<File> {
  if (file.size <= SHRINK_ABOVE || typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#ffffff"; // a transparent PNG becomes white, not black
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export const shrinkPhotos = (files: File[]) => Promise.all(files.map(shrinkPhoto));

/**
 * A pasted image address: http(s), no spaces. The API checks the rest (a public site, a real JPG, PNG, WebP
 * or GIF up to 20 MB) when it downloads its own copy (kheengz-laravel App\Support\ImageFromLink).
 */
export const IMAGE_LINK = /^https?:\/\/[^\s/$.?#][^\s]*$/i;
