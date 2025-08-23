// страница остаётся server component (без "use client")
import RoomPage from "@/components/profile/DKG/RoomPage";

// отключаем кэш страницы на уровне Next
export const dynamic = "force-dynamic";

export default function Page() {
  return <RoomPage />; // RoomPage уже "use client"
}