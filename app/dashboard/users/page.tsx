import type { Metadata } from "next";
import { Suspense } from "react";
import UsersList from "./UsersList";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense>
        <UsersList />
      </Suspense>
    </div>
  );
}
