// log-humanizer.ts
export type LogEntry = {
  userId: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  event?: string;
  message?: string;
  requestId?: string;
  module?: string;

  // доп. поля, которые реально встречаются в логах
  // (они опциональны, чтобы тип не ломал старые записи)
  method?: string;           // auth.login
  outcome?: string;          // *_success / *_failure
  ip?: string;
  ua?: string;
  latencyMs?: number;

  // docs.*
  count?: number;
  fileName?: string;
  size?: number;
  documentId?: string;
  sessionId?: string;
  signSessionId?: string;

  // recovery / encrypt
  mode?: string;
  recoveryId?: string;
  participantsCount?: number;
  participants?: string[];
  reason?: string;

  // vss.*
  type?: string;
  threshold?: number;
  sharesCount?: number;
  status?: string;
  recipient?: string;
  x?: string;
};

export type Humanized = {
  title: string;          // короткий заголовок
  subtitle?: string;      // пояснение
  meta?: string[];        // дополнительные детали
  severity: "neutral" | "success" | "warning" | "danger";
  icon?: string;          // простая иконка-эмодзи (можешь заменить на свои SVG)
};

// утилиты форматирования
const fmtTime = (ts: string) =>
  new Date(ts).toLocaleString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

const bytes = (n?: number) =>
  typeof n === "number" ? `${n} байт` : undefined;

const secs = (ms?: number) =>
  typeof ms === "number" ? `${(ms / 1000).toFixed(2)} сек` : undefined;

function outcomeTone(outcome?: string): Humanized["severity"] {
  if (!outcome) return "neutral";
  if (/_success$/i.test(outcome)) return "success";
  if (/_failure$/i.test(outcome)) return "warning";
  return "neutral";
}

function defaultMeta(l: LogEntry): string[] {
  const m: string[] = [];
  if (l.documentId) m.push(`Документ: ${l.documentId}`);
  if (l.sessionId)  m.push(`Сессия: ${l.sessionId}`);
  if (l.recoveryId) m.push(`Восстановление: ${l.recoveryId}`);
  if (l.requestId)  m.push(`req: ${l.requestId.slice(0, 8)}`);
  return m;
}

// Основной маппер
export function humanizeLog(l: LogEntry): Humanized {
  const metaBase = defaultMeta(l);

  // ====== AUTH ======
  if (l.event === "auth.login") {
    const ok = l.outcome === "success";
    return {
      title: ok ? "Вход выполнен" : "Неудачный вход",
      subtitle: l.method === "password" ? "Метод: пароль" : l.method ? `Метод: ${l.method}` : undefined,
      meta: [
        ...(l.ip ? [`IP: ${l.ip}`] : []),
        ...(typeof l.latencyMs === "number" ? [`Время: ${secs(l.latencyMs)}`] : []),
        ...(l.userId ? [`Пользователь: ${l.userId}`] : []),
      ],
      severity: ok ? "success" : "warning",
      icon: ok ? "✅" : "⚠️",
    };
  }

  // ====== ДОКУМЕНТЫ: список ======
  if (l.event === "docs.list_success") {
    return {
      title: "Список документов обновлён",
      subtitle: l.count !== undefined ? `Найдено документов: ${l.count}` : undefined,
      meta: metaBase,
      severity: "success",
      icon: "📄",
    };
  }

  // ====== ДОКУМЕНТЫ: загрузка ======
  if (l.event === "docs.upload_start") {
    return {
      title: "Загрузка файла начата",
      subtitle: l.fileName ? `Файл: ${l.fileName}` : undefined,
      meta: [
        ...(l.size ? [`Размер: ${bytes(l.size)}`] : []),
        ...metaBase,
      ],
      severity: "neutral",
      icon: "⏫",
    };
  }

  if (l.event === "docs.upload_success") {
    return {
      title: "Файл загружен",
      subtitle: l.fileName ? `Файл: ${l.fileName}` : undefined,
      meta: metaBase,
      severity: "success",
      icon: "✅",
    };
  }

  // ====== ПОДПИСЬ ======
  if (l.event === "docs.sign_start") {
    return {
      title: "Подписание начато",
      subtitle: "Подготовка данных для подписи",
      meta: metaBase,
      severity: "neutral",
      icon: "✍️",
    };
  }

  if (l.event === "docs.sign_success") {
    return {
      title: "Документ подписан",
      subtitle: "Подпись успешно создана",
      meta: metaBase,
      severity: "success",
      icon: "✅",
    };
  }

  if (l.event === "docs.sign_failure") {
    return {
      title: "Не удалось подписать документ",
      subtitle: "Проверьте участников и параметры сеанса",
      meta: metaBase,
      severity: "warning",
      icon: "⚠️",
    };
  }

  // ====== ОТПРАВКА (отдача доли/отправка пакета) ======
  if (l.event === "docs.send_start") {
    return {
      title: "Отправка начата",
      subtitle: "Готовим данные к отправке",
      meta: metaBase,
      severity: "neutral",
      icon: "📤",
    };
  }

  if (l.event === "docs.send_success") {
    return {
      title: "Отправка завершена",
      subtitle: "Данные успешно отправлены",
      meta: metaBase,
      severity: "success",
      icon: "✅",
    };
  }

  if (l.event === "docs.send_failure") {
    return {
      title: "Отправка не удалась",
      subtitle: "Повторите или проверьте соединение",
      meta: metaBase,
      severity: "warning",
      icon: "⚠️",
    };
  }

  // ====== ШИФРОВАНИЕ/Восстановление (encryptFile / recovery) ======
  if (l.module === "api/document/encryptFile" && l.event === "docs.encrypt_start") {
    return {
      title: "Шифрование файла",
      subtitle: l.mode ? `Режим: ${l.mode}` : "Подготовка к шифрованию",
      meta: metaBase,
      severity: "neutral",
      icon: "🔐",
    };
  }

  if (l.module === "api/document/encryptFile" && l.event === "recovery.started") {
    return {
      title: "Восстановление секрета запущено",
      subtitle: l.participantsCount !== undefined
        ? `Участников: ${l.participantsCount}`
        : "Сеанс восстановления начат",
      meta: metaBase,
      severity: "success",
      icon: "🧩",
    };
  }

  if (l.module === "api/document/encryptFile" && l.event === "recovery.start_failed") {
    const reasonMap: Record<string, string> = {
      no_participants: "Нет участников — добавьте хотя бы одного",
    };
    return {
      title: "Не удалось запустить восстановление",
      subtitle: reasonMap[l.reason ?? ""] ?? (l.reason ? `Причина: ${l.reason}` : "Неизвестная причина"),
      meta: metaBase,
      severity: "warning",
      icon: "⚠️",
    };
  }

  // ====== VSS / Сессии разделения (api/shares) ======
  if (l.module === "api/shares" && l.event === "vss.create_start") {
    return {
      title: "Создание сессии разделения",
      subtitle: `Тип: ${l.type ?? "—"}, порог: ${l.threshold ?? "—"}, долей: ${l.sharesCount ?? "—"}`,
      meta: metaBase,
      severity: "neutral",
      icon: "🧮",
    };
  }

  if (l.module === "api/shares" && l.event === "vss.share_saved") {
    return {
      title: "Доля сохранена",
      subtitle: l.recipient ? `Получатель: ${l.recipient}` : undefined,
      meta: [
        ...(l.x ? [`x = ${l.x}`] : []),
        ...(l.status ? [`Статус: ${l.status}`] : []),
        ...metaBase,
      ],
      severity: "success",
      icon: "💾",
    };
  }

  if (l.module === "api/shares" && l.event === "vss.create_success") {
    return {
      title: "Сессия разделения создана",
      subtitle: `Тип: ${l.type ?? "—"}, порог: ${l.threshold ?? "—"}, долей: ${l.sharesCount ?? "—"}`,
      meta: metaBase,
      severity: "success",
      icon: "✅",
    };
  }

  if (l.module === "api/shares" && l.event === "vss.create_failed") {
    const reasonMap: Record<string, string> = {
      missing_asymmetric_params: "Не заданы параметры асимметрии (p, q, g/кривая и т.п.)",
    };
    return {
      title: "Сессия разделения не создана",
      subtitle: reasonMap[l.reason ?? ""] ?? (l.reason ? `Причина: ${l.reason}` : "Неизвестная причина"),
      meta: metaBase,
      severity: "warning",
      icon: "⚠️",
    };
  }

  // ====== fallback ======
  return {
    title: l.event ? `Событие: ${l.event}` : "Событие",
    subtitle: l.message,
    meta: metaBase,
    severity: l.level === "error" ? "danger" : l.level === "warn" ? "warning" : "neutral",
    icon: l.level === "error" ? "⛔" : l.level === "warn" ? "⚠️" : "ℹ️",
  };
}
