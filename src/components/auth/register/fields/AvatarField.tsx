"use client";
import { inputBase, labelBase } from "../styles";

export default function AvatarField({
  image, setImage, clearError,
}: { image: string; setImage: (v: string)=>void; clearError?: ()=>void; }) {
  return (
    <div className="md:col-span-2">
      <label htmlFor="image" className={labelBase}>Аватар (URL)</label>
      <input id="image" type="url" className={inputBase} placeholder="https://…"
             value={image} onChange={e=>{setImage(e.target.value); clearError?.();}} />
    </div>
  );
}
