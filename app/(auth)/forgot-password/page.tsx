import type { Metadata } from "next";
import ForgotPassword from "./ForgotPassword";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return <ForgotPassword />;
}
