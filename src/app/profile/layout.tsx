import { getServerSession } from "next-auth/next";
import { redirect }         from "next/navigation";
import { authOptions }      from "@/app/api/auth/[...nextauth]/route";
import KeyInitializer       from "@/components/profile/KeyInitializer";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  return (
    <>
      {/* Компонент на клиенте, который позаботится о генерации/загрузке ключей */}
      <KeyInitializer />

      {/* Ваши защищённые страницы */}
      {children}
    </>
  );
}