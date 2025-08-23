"use client";

import React from "react";
import { useRouter } from "next/navigation";
import CreateRoomForm from "./CreateRoomForm";
import RoomList from "./RoomList";

export default function DKGNewPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">DKG — новые и активные комнаты</h1>

      <CreateRoomForm onCreated={(id) => router.push(`/dkg/room/${id}`)} />
      <RoomList />
    </div>
  );
}
