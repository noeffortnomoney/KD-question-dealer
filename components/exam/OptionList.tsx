"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OptionItem {
  optionId: string;
  text: string;
}

const same = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a && b && a.toLowerCase() === b.toLowerCase());

export function OptionList({
  name,
  options,
  selectedOptionId,
  onSelect,
  disabled,
  correctOptionId,
}: {
  name: string;
  options: OptionItem[];
  selectedOptionId: string | null;
  onSelect?: (optionId: string) => void;
  disabled?: boolean;
  correctOptionId?: string | null;
}) {
  const reveal = correctOptionId !== undefined && correctOptionId !== null;
  return (
    <div role="radiogroup" className="space-y-2.5">
      {options.map((o, i) => {
        const selected = same(o.optionId, selectedOptionId);
        const isCorrect = reveal && same(o.optionId, correctOptionId);
        const isWrongPick = reveal && selected && !isCorrect;
        return (
          <button
            key={o.optionId}
            type="button"
            role="radio"
            aria-checked={selected}
            name={name}
            disabled={disabled}
            onClick={() => onSelect?.(o.optionId)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
              !reveal && selected && "border-brand bg-brand-soft",
              !reveal && !selected && "bg-card hover:border-brand/40 hover:bg-brand-soft/40",
              isCorrect && "border-success bg-success-soft",
              isWrongPick && "border-red-300 bg-red-50",
              reveal && !isCorrect && !isWrongPick && "bg-card",
              disabled && "cursor-default"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                selected ? "border-brand" : "border-gray-300"
              )}
            >
              {selected && <span className="size-2.5 rounded-full bg-brand" />}
            </span>
            <span className="flex-1">
              <span className="mr-1 font-semibold text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
              {o.text}
            </span>
            {isCorrect && <CheckCircle2 className="size-5 shrink-0 text-success" />}
            {isWrongPick && <XCircle className="size-5 shrink-0 text-red-600" />}
          </button>
        );
      })}
    </div>
  );
}
