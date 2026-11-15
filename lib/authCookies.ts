/**
 * The cookies' names, prefixed with the app. Cookies belong to a host, not a port, so every app
 * on `localhost` shares one cookie jar: with generic names (`access_token`, `profile`, `theme`)
 * one app reads another's token, gets a 401 from its own API and signs the user out. Alpha
 * learned this the hard way. Read and write them only through these.
 */
export const AUTH_TOKEN_COOKIE = "kheengz_access_token";
export const AUTH_PROFILE_COOKIE = "kheengz_profile";
/** Light or dark, for the dashboards and sign-in pages (storefronts use the shop's own look). */
export const THEME_COOKIE = "kheengz_theme";
