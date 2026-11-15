/**
 * A payload as multipart form data, for a request that carries a file.
 *
 * FormData only holds strings and files, so each value is written the way Laravel reads it back:
 * booleans as "1"/"0", an array as one `key[]` entry per item (String() would send "a,b" and the
 * API would answer "must be an array"), files as they are. null, undefined and "" are left out,
 * so an optional field reads as absent. See docs/dashboard-patterns.md.
 */
export function toFormData(payload: Record<string, unknown>, form: FormData = new FormData()): FormData {
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => form.append(`${key}[]`, item instanceof Blob ? item : String(item)));
      return;
    }
    form.append(key, value instanceof Blob ? value : typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  });
  return form;
}
