"use client";

import Echo from "laravel-echo";
import Pusher, { type ChannelAuthorizationCallback } from "pusher-js";
import axiosAPI from "@/services/axiosApi";

// Laravel Echo's reverb broadcaster is built on pusher-js, which expects a global Pusher.
type EchoClient = Echo<"reverb">;

/** The signed payload Laravel returns for a channel (pusher-js does not export its name for it). */
type ChannelAuthorization = NonNullable<Parameters<ChannelAuthorizationCallback>[1]>;

let echoInstance: EchoClient | null = null;

/**
 * Lazily creates (and memoises) the Echo client for Laravel Reverb.
 *
 * One socket per browser tab, shared by every screen. Channel authorization is
 * routed through our Sanctum-guarded endpoint (`/api/v1/broadcasting/auth`) via
 * the shared axios instance, so the Bearer token authorizes each private channel
 * (a user's own `App.Models.User.{id}`) and the `online` presence channel; there
 * is no session cookie to fall back on.
 *
 * Returns null during SSR or when the Reverb key is not configured, so realtime
 * degrades to "no live updates" rather than crashing the page.
 */
export function getEcho(): EchoClient | null {
  if (typeof window === "undefined") return null;
  if (echoInstance) return echoInstance;

  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  if (!key) {
    console.warn(
      "[echo] NEXT_PUBLIC_REVERB_APP_KEY is not set: realtime disabled.",
    );
    return null;
  }

  (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080);
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || "http";

  echoInstance = new Echo({
    broadcaster: "reverb",
    key,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || "localhost",
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === "https",
    enabledTransports: ["ws", "wss"],
    authorizer: (channel: { name: string }) => ({
      // pusher-js's Node-style (error, data) callback; the signed payload goes straight back to it.
      authorize: (socketId: string, callback: ChannelAuthorizationCallback) => {
        axiosAPI
          .post<ChannelAuthorization>("/v1/broadcasting/auth", { socket_id: socketId, channel_name: channel.name })
          .then((res) => callback(null, res.data))
          .catch((err: Error) => callback(err, null));
      },
    }),
  });

  return echoInstance;
}

// Every API call says which socket made it (X-Socket-ID), so the API's `->toOthers()` leaves out
// the screen that made the change: its own mutation already refreshed it, and a second round of
// refetches only slowed the toast. Registered once, read per request, so a reconnect is followed.
axiosAPI.interceptors.request.use((config) => {
  const socketId = echoInstance?.socketId();
  if (socketId) config.headers["X-Socket-ID"] = socketId;
  return config;
});

/** Tears down the socket. Call on logout so the next user gets a fresh auth. */
export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}
