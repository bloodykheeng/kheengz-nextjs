import type { ApiResource } from "./api";

/** The API's UserResource (kheengz-laravel app/Http/Resources/UserResource.php), field for field. */
export interface UserFields {
  name: string;
  email: string | null;
  username: string | null;
  /** Digits with the country code, no "+" (256700000001). */
  phone: string | null;
  allow_notifications: boolean;
  status: "Active" | "Inactive";
  /** Admin, Staff or Vendor ("No Role" if none was given). */
  role: string;
  lastlogin: string | null;
  photo_url: string | null;
  /** Upload, Link (our copy of a pasted link) or External. */
  photo_source?: "Upload" | "Link" | "External" | null;
  photo_source_url?: string | null;
  timezone: string | null;
  email_verified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by?: { id: string; name: string; email?: string | null } | null;
  updated_by?: { id: string; name: string; email?: string | null } | null;
}

/** The signed-in user, flat. */
export type UserResource = ApiResource<UserFields>;

// Login

export interface LoginPayload {
  email: string;
  password: string;
  device_name?: string;
}

/** A sign-in (or a confirmed email). The resource sits inside a plain JSON body, so it arrives flat. */
export interface LoginResponse {
  token: string;
  token_type: "Bearer";
  user: UserResource;
}


// OTP / Password reset

export interface OtpRequestPayload {
  /** API field named "email"; accepts an email, a phone number or a username. */
  email: string;
}

export interface OtpRequestResponse {
  success: boolean;
  message: string;
  data: {
    email_sent: boolean;
  };
}

export interface OtpValidatePayload {
  email: string;
  otp: string;
}

export interface OtpValidateResponse {
  success: boolean;
  message: string;
  data: {
    user_id: string;
    email: string;
  };
}

export interface OtpResetPasswordPayload {
  email: string;
  otp: string;
  password: string;
  password_confirmation: string;
}

export interface OtpResetPasswordResponse {
  success: boolean;
  message: string;
}

// Profile

export interface ProfileResponse {
  message: string;
  user: UserResource;
  permissions: string[];
}

export interface UpdateProfileResponse {
  message: string;
  user: UserResource;
}
