import Link from "next/link";
import { MdArrowBack } from "react-icons/md";
import BrandingPanel from "../BrandingPanel";
import ForgotPasswordRowForm from "./RowForm";
import Logo from "@/components/brand/Logo";

export default function ForgotPassword() {
  return (
    <div className="flex min-h-screen">
      <BrandingPanel />

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-105">

          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          {/* Back link */}
          <Link
            href="/login"
            className="mb-7 inline-flex items-center gap-1.5 text-sm font-medium text-(--ink)/55 transition-colors hover:text-(--ink)"
          >
            <MdArrowBack className="text-base" />
            Back to sign in
          </Link>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-(--ink)">
              Forgot your password?
            </h2>
            <p className="mt-1 text-sm text-(--ink)/55">
              Enter your registered email, phone or username to receive a one-time code by email,
              then set a new password.
            </p>
          </div>

          <ForgotPasswordRowForm />

          <p className="mt-6 text-center text-sm text-(--ink)/55">
            Remembered it?{" "}
            <Link
              href="/login"
              className="font-semibold text-(--brand-ink) hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
