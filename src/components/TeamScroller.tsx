"use client";
import { motion } from "framer-motion";

export default function TeamScroller({ people }:{ people: {name:string; role:string; photo:string; quote?:string; phone?:string;}[] }) {
  return (
    <div className="w-full overflow-x-auto scroll-smooth snap-x snap-mandatory">
      <ul className="flex gap-6 pr-6">
        {people.map((p, i) => (
          <li key={i} className="snap-center shrink-0 w-[280px]">
            <motion.div
              whileHover={{ y: -6 }}
              className="rounded-2xl bg-white/70 backdrop-blur-md ring-1 ring-black/10 p-4 shadow-sm"
            >
              <img src={p.photo} alt={p.name} className="h-40 w-full object-cover rounded-xl mb-3" />
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-neutral-600">{p.role}</p>
              {p.quote && <p className="text-sm mt-2 text-neutral-700">{p.quote}</p>}
              {p.phone && (
                <a href={`tel:${p.phone.replace(/[^\d+]/g,"")}`} className="inline-block mt-3 text-sm text-blue-600 underline">
                  Позвонить
                </a>
              )}
            </motion.div>
          </li>
        ))}
      </ul>
    </div>
  );
}
