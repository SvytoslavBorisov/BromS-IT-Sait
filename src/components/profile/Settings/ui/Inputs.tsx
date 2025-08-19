"use client";

export function NumberInput(
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) {
  return <input {...props} type="number" className={`rounded-lg border px-3 py-1.5 text-sm ${props.className ?? ""}`} />;
}

export function TextInput(
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) {
  return <input {...props} className={`rounded-lg border px-3 py-1.5 text-sm ${props.className ?? ""}`} />;
}

export function Select(
  props: React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>
) {
  return <select {...props} className={`rounded-lg border px-3 py-1.5 text-sm ${props.className ?? ""}`} />;
}
