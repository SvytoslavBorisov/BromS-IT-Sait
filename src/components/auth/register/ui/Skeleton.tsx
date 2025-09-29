"use client";
import { UserPlus } from "lucide-react";

export default function Skeleton() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-3xl">
        <div className="relative rounded-3xl border border-gray-200 bg-white shadow-lg">
          <div className="p-8">
            <div className="mb-6 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 mb-3">
                <UserPlus className="h-6 w-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">Регистрация</h1>
              <p className="text-sm text-gray-600 mt-1">Создайте аккаунт за минуту</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-10 bg-gray-100 rounded-xl"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
