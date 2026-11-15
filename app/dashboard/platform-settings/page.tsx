import type { Metadata } from "next";
import PlatformSettingsForm from "./PlatformSettingsForm";

export const metadata: Metadata = { title: "Platform settings" };

export default function PlatformSettingsPage() {
  return (
    <div className="p-4 sm:p-6">
      <PlatformSettingsForm />
    </div>
  );
}
