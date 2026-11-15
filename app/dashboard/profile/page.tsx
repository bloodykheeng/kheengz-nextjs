import { Suspense } from "react";
import ProfileDetails from "./ProfileDetails";

export default function ProfilePage() {
  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">My profile</h1>
        <p className="mt-0.5 text-sm text-(--text-muted)">
          Your account and what it may do.
        </p>
      </div>
      <Suspense>
        <ProfileDetails />
      </Suspense>
    </div>
  );
}
