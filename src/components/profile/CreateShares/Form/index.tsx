"use client";

import { useMemo } from "react";
import { FileType, Participant } from "@/lib/crypto/shares";
import HeaderField from "./sections/HeaderField";
import TypeSelector from "./sections/TypeSelector";
import SecretField from "./sections/SecretField";
import MetaFields from "./sections/MetaFields";
import ParticipantsSection from "./sections/ParticipantsSection";
import ThresholdSection from "./sections/ThresholdSection";
import SummarySidebar from "./sections/SummarySidebar";
import useFormValidation from "./hooks/useFormValidation";
import useParticipantsFilter from "./hooks/useParticipantsFilter";

export interface CreateSharesFormState {
  title: string;
  secret: string;
  type: FileType;
  comment: string;
  expiresAt: string | null;
  threshold: number;
  selected: Set<string>;
  createCertForAsymmetric?: boolean;
}

export default function CreateSharesForm({
  state,
  setState,
  participants,
  onToggle,
}: {
  state: CreateSharesFormState;
  setState: (partial: Partial<CreateSharesFormState>) => void;
  participants: Participant[];
  onToggle: (id: string) => void;
}) {
  const {
    errors, isValid, n, k, combos, strength,
  } = useFormValidation(state);

  const {
    q, setQ, filtered, allFilteredChecked, someFilteredChecked, toggleAllFiltered,
  } = useParticipantsFilter({
    participants,
    selected: state.selected,
    setState,
  });

  // Пробрасываем во внешний контейнер признак валидности при необходимости:
  // useEffect(()=>onValidityChange?.(isValid),[isValid])

  const showSecret = state.type === "CUSTOM";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* левая колонка */}
      <div className="lg:col-span-8 space-y-5">
        <HeaderField
          value={state.title}
          error={errors.title}
          onChange={(v) => setState({ title: v })}
        />

        <TypeSelector
          type={state.type}
          createCert={!!state.createCertForAsymmetric}
          onTypeChange={(t) => setState({ type: t, threshold: Math.min(state.threshold, Math.max(1, state.selected.size)) })}
          onToggleCreateCert={(v) => setState({ createCertForAsymmetric: v })}
        />

        {showSecret && (
          <SecretField
            value={state.secret}
            onChange={(v) => setState({ secret: v })}
            error={errors.secret}
            strength={strength}
          />
        )}

        <MetaFields
          comment={state.comment}
          expiresAt={state.expiresAt}
          onChange={(p) => setState(p)}
        />

        <ParticipantsSection
          q={q}
          setQ={setQ}
          participants={filtered}
          selected={state.selected}
          onToggle={onToggle}
          allFilteredChecked={allFilteredChecked}
          someFilteredChecked={someFilteredChecked}
          toggleAllFiltered={toggleAllFiltered}
          selectedCount={n}
        />

        <ThresholdSection
          k={k}
          n={n}
          combos={combos}
          error={errors.threshold}
          onChange={(val) => setState({ threshold: val })}
        />
      </div>

      {/* правая колонка */}
      <aside className="lg:col-span-4">
        <SummarySidebar
          state={state}
          n={n}
          k={k}
          combos={combos}
          errors={errors}
          isValid={isValid}
        />
      </aside>
    </div>
  );
}
