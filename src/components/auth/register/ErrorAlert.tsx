"use client";
export default function ErrorAlert({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
      {message}
    </div>
  );
}
