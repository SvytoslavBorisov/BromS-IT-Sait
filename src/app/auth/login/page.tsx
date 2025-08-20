// server component (без "use client")
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Вход",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <LoginForm />
    </div>
  );
}
