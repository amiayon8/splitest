import { Suspense } from "react";
import ProfileClient from "./ProfileClient";

interface SharedProfilePageProps {
  params: Promise<{ username: string }>;
}

export default function SharedProfilePage({
  params,
}: SharedProfilePageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] flex items-center justify-center p-6 text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ProfileLoader params={params} />
    </Suspense>
  );
}

async function ProfileLoader({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <ProfileClient username={username} />;
}
