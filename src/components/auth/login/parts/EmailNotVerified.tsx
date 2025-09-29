// src/components/auth/login/parts/EmailNotVerified.tsx
import { Loader2, RefreshCw } from "lucide-react";

export default function EmailNotVerified({
  resendLoading,
  resendMsg,
  onResend,
  emailPresent,
}: {
  resendLoading: boolean;
  resendMsg: string | null;
  onResend: () => void;
  emailPresent: boolean;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="font-medium mb-1">E-mail не подтверждён</div>
      <div className="space-y-3">
        <p>Проверьте почту. Если письма нет — отправьте ещё раз.</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResend}
            disabled={resendLoading || !emailPresent}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          >
            {resendLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Отправляем…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Отправить ещё раз
              </>
            )}
          </button>
          <span className="text-xs text-amber-800">На адрес из поля «Email».</span>
        </div>
        {resendMsg && <p className="text-xs text-amber-800">{resendMsg}</p>}
      </div>
    </div>
  );
}
