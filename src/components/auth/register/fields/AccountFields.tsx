"use client";
import { inputBase, labelBase } from "../styles";

type Props = {
  email: string; setEmail: (v: string)=>void;
  password: string; setPassword: (v: string)=>void;
  clearError?: ()=>void;
};

export default function AccountFields(p: Props) {
  const ce = () => p.clearError?.();
  return (
    <>
      <div>
        <label htmlFor="email" className={labelBase}>Email *</label>
        <input id="email" type="email" required className={inputBase}
               value={p.email} onChange={e=>{p.setEmail(e.target.value); ce();}}
               placeholder="you@example.com" autoComplete="email"/>
      </div>

      <div>
        <label htmlFor="password" className={labelBase}>Пароль *</label>
        <input id="password" type="password" required className={inputBase}
               value={p.password} onChange={e=>{p.setPassword(e.target.value); ce();}}
               placeholder="••••••••" autoComplete="new-password"/>
      </div>
    </>
  );
}
