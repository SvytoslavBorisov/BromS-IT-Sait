"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";

type ShareSession = {
  id: string;
  name: string;
};

export default function ProfileProcesses() {
  const { status, data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [sessions, setSessions] = useState<ShareSession[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Обработчик выбора файла
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    // сбрасываем предыдущие стейты
    setShowDropdown(false);
    setSessions([]);
    setSelectedSessionId("");
  };

  // Нажали "Подписать документ"
  const handleSignClick = async () => {
    if (!file) return;
    setIsLoadingSessions(true);
    try {
      const res = await fetch("/api/shareSessions");
      if (!res.ok) throw new Error("Не удалось загрузить сессии");
      const data: ShareSession[] = await res.json();
      setSessions(data);
      setShowDropdown(true);
    } catch (err) {
      console.error(err);
      alert("Ошибка при получении списка ключей.");
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Пользователь нажал "Готово"
  const handleDone = () => {
    if (!selectedSessionId) return;
    // Тут можно отправить файл + выбранную сессию на бэкенд
    console.log("Отправляем файл", file, "сессия:", selectedSessionId);
  };

  return (
    <div className="space-y-4 max-w-md mx-auto p-4">
      <div>
        <label className="block mb-1 font-medium">Загрузите документ</label>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          className="block w-full"
        />
      </div>

      <button
        type="button"
        disabled={!file}
        onClick={handleSignClick}
        className={`px-4 py-2 rounded ${
          file
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
      >
        {isLoadingSessions ? "Загрузка..." : "Подписать документ"}
      </button>

      {showDropdown && (
        <div className="space-y-2">
          <label className="block font-medium">Выберите ключ или создайте новый</label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="block w-full border rounded p-2"
          >
            <option value="">-- выберите --</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="new">Создать новый ключ</option>
          </select>
        </div>
      )}

      {selectedSessionId && (
        <button
          type="button"
          onClick={handleDone}
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Готово
        </button>
      )}
    </div>
  );
}
