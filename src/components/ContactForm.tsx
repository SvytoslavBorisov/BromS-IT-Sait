"use client";

import React, { useState } from "react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        setStatus(data?.error || "Ошибка при отправке ❌");
        return;
      }
      setStatus("Сообщение успешно отправлено ✅");
    } catch (err) {
      setStatus("Ошибка сети ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-8 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Свяжитесь с нами
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Имя
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Введите ваше имя"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Электронная почта
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Сообщение
          </label>
          <textarea
            name="message"
            rows={5}
            required
            value={formData.message}
            onChange={handleChange}
            className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Напишите ваше сообщение..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Отправка..." : "Отправить"}
        </button>
      </form>

      {status && (
        <p className="mt-4 text-center text-sm text-gray-700">{status}</p>
      )}
    </div>
  );
}
