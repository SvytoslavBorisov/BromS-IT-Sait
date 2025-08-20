import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Регистрация",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <RegisterForm />
    </main>
  );
}