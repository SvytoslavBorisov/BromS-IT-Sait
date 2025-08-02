"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";           // ① импорт
import { generateAndUploadKey } from "@/lib/crypto/keys";
import Sidebar from "@/components/profile/Sidebar";
import ProfileDetails from "@/components/profile/ProfileDetails";
import Settings from "@/components/profile/Settings";
import Security from "@/components/profile/Logs";
import MyShares from "@/components/profile/Shares";
import ProfileProcesses from "@/components/profile/Process";
import RecoverList from "@/components/profile/RecoverList";


export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<
    "profile" | "keys" | "all_keys" |"process" | "security" | "settings" 
  >("profile");

  useEffect(() => {
    generateAndUploadKey().catch(console.error);
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-8">
        {/* ② Кнопка выхода */}
        <div className="flex justify-end mb-6">
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Выйти
        </button>
        </div>

        {activeTab === "profile"   && <ProfileDetails />}
        {activeTab === "keys"      && <MyShares />}
        {activeTab === "all_keys"  && <RecoverList />}
        {activeTab === "process"   && <ProfileProcesses />}
        {activeTab === "settings"  && <Settings />}
        {activeTab === "security"  && <Security />}
      </main>
    </div>
  );
}