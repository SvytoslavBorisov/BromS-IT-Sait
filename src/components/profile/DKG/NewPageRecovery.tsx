"use client";

import React from "react";
import { useRouter } from "next/navigation";
import CreateRecoveryForm from "./CreateRecoveryForm";
import RecoveryList from "./RecoveryList";

export default function RecoveryNewPage() {
  const router = useRouter();
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">DKG — восстановление секрета</h1>
      <CreateRecoveryForm onCreated={(id) => router.push(`/profile/dkg/recovery/rooms/${id}`)} />
      <RecoveryList />
    </div>
  );
}
