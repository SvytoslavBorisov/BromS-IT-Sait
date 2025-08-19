import TelegramLoginPanel from "@/components/integrations/TelegramLoginPanel";

export default async function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* другие блоки */}
      <TelegramLoginPanel />
    </div>
  );
}