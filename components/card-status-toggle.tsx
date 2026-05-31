"use client";

import { useTransition } from "react";
import { setCardStatus } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Status = "OWNED" | "WANTED" | "DUPLICATE" | "NONE";

const options: { value: Status; label: string; cls: string }[] = [
  { value: "OWNED", label: "Have", cls: "bg-green-600 text-white" },
  { value: "WANTED", label: "Want", cls: "bg-amber-500 text-white" },
  { value: "NONE", label: "—", cls: "bg-black/10 dark:bg-white/10" },
];

export function CardStatusToggle({
  cardId,
  current,
}: {
  cardId: string;
  current: Status;
}) {
  const [pending, start] = useTransition();

  return (
    <div className={cn("inline-flex overflow-hidden rounded-md border border-black/10 dark:border-white/15", pending && "opacity-50")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={pending}
          onClick={() => start(() => setCardStatus(cardId, o.value))}
          className={cn(
            "px-2 py-1 text-xs font-medium transition",
            current === o.value ? o.cls : "hover:bg-black/5 dark:hover:bg-white/10",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
