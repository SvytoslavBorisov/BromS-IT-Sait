// app/auth/after-oauth/page.tsx
import AfterOAuthProvisioner from "./provisioner";

export default function Page() {
  // Серверный компонент просто рендерит клиентский провижионер
  return <AfterOAuthProvisioner />;
}
