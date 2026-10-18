import { Suspense } from "react";
import ProfileClient from "./ProfileClient";
import { PRESET_USERS_DIRECTORY } from "@/lib/users-directory";

export function generateStaticParams() {
  return PRESET_USERS_DIRECTORY.map((user) => ({
    username: user.username,
  }));
}

interface SharedProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function SharedProfilePage({
  params,
}: SharedProfilePageProps) {
  const { username } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] flex items-center justify-center p-6 text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ProfileClient username={username} />
    </Suspense>
  );
}
