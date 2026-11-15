import axiosAPI, { clearAuthCookies } from "../axiosApi";
import type {
  LoginPayload,
  LoginResponse,
  OtpRequestPayload,
  OtpRequestResponse,
  OtpValidatePayload,
  OtpValidateResponse,
  OtpResetPasswordPayload,
  OtpResetPasswordResponse,
  ProfileResponse,
  UpdateProfileResponse,
} from "../types/auth";
import type { AxiosResponse } from "axios";

/**
 * The signing-in browser's IANA zone.
 *
 * A display concern only: it renders instants in the user's local clock. Shared
 * day boundaries (sales per day, payout statements, every report) always use the
 * business timezone, never this. See kheengz-laravel/docs/timezone-handling.md.
 */
function resolveViewerTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    // Older or locked-down browsers may not expose it. Not knowing the zone is
    // fine; failing the sign-in over it would not be.
    return undefined;
  }
}

export async function postToLogin(
  payload: LoginPayload
): Promise<AxiosResponse<LoginResponse>> {
  const response = await axiosAPI.post<LoginResponse>("/v1/auth/login", {
    timezone: resolveViewerTimezone(),
    ...payload,
  });
  return response;
}

/**
 * Confirm an email with its 6-digit code; answers like postToLogin (a token and the user). The
 * session is saved by AuthContext's login(), the one place that does it, as after a sign-in.
 */
export async function postVerifyEmail(payload: { email: string; code: string }): Promise<AxiosResponse<LoginResponse>> {
  return axiosAPI.post<LoginResponse>("/v1/auth/email/verify", payload);
}

/** Ask for a fresh code (the API answers the same whether or not the address has an account). */
export async function postResendCode(email: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosAPI.post<{ message: string }>("/v1/auth/email/resend", { email });
}

export async function postToLogout(): Promise<AxiosResponse<{ message: string }>> {
  const response = await axiosAPI.post<{ message: string }>("/v1/auth/logout");
  clearAuthCookies();
  return response;
}

export async function getAuthProfile(): Promise<AxiosResponse<ProfileResponse>> {
  const response = await axiosAPI.get<ProfileResponse>("/v1/auth/profile");
  return response;
}

/**
 * Save the signed-in user's own profile.
 *
 * `POST` (not PATCH) because the photo arrives as multipart. Every optional
 * field must be sent on every save: the API treats an absent `username` /
 * `phone` as "clear it", so a partial payload silently wipes them.
 */
export async function updateAuthProfile(
  payload: FormData | Record<string, unknown>
): Promise<AxiosResponse<UpdateProfileResponse>> {
  const response = await axiosAPI.post<UpdateProfileResponse>(
    "/v1/auth/profile",
    payload,
    // Declared on the call that carries the file. The instance says
    // `application/json` for everything, and axios reads that header before it
    // looks at the body: seeing JSON declared it serialises the FormData, so
    // the photo arrives as `{}` and is silently dropped.
    payload instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined
  );
  return response;
}

export async function postOtpRequest(
  payload: OtpRequestPayload
): Promise<AxiosResponse<OtpRequestResponse>> {
  const response = await axiosAPI.post<OtpRequestResponse>(
    "/v1/auth/otp/request",
    payload
  );
  return response;
}

export async function postOtpValidate(
  payload: OtpValidatePayload
): Promise<AxiosResponse<OtpValidateResponse>> {
  const response = await axiosAPI.post<OtpValidateResponse>(
    "/v1/auth/otp/validate",
    payload
  );
  return response;
}

export async function postOtpResetPassword(
  payload: OtpResetPasswordPayload
): Promise<AxiosResponse<OtpResetPasswordResponse>> {
  const response = await axiosAPI.post<OtpResetPasswordResponse>(
    "/v1/auth/otp/reset-password",
    payload
  );
  return response;
}
