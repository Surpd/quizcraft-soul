// AI helper (TZ v2.0 §7 + AI_LOGIC.md). Standalone popover that calls
// api.generateQuestion / api.generateQuiz. Wiring points into builders is
// intentionally minimal — drop <AIHelperButton onPick={...} /> next to a
// field to get 3 generated variants.

import { useState } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { generateQuestion, type GeneratedQuestion } from "@/lib/api";

interface Props {
  currentValue?: string;
  onPickQuestion?: (v: GeneratedQuestion) => void;
  onPickText?: (v: string) => void;
}

export function AIHelperButton({ currentValue = "", onPickQuestion, onPickText }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<GeneratedQuestion[]>([]);
  const [wishes, setWishes] = useState("");
  const [topic, setTopic] = useState(currentValue);

  const run = async () => {
    setLoading(true);
    try {
      const { variants } = await generateQuestion({ topic, wishes });
      setVariants(variants);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); if (currentValue) { setTopic(currentValue); run(); } }}
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
        title="Спросить AI"
      >
        <Sparkles className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={() => setOpen(false)}>
          <div className="surface-card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <Sparkles className="h-4 w-4 text-primary" /> AI-помощник
              </h3>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-surface-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Тема</span>
              <input className="input-base" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="например, Древний Рим" />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Пожелания</span>
              <input className="input-base" value={wishes} onChange={(e) => setWishes(e.target.value)} placeholder="сложные, на английском..." />
            </label>
            <button onClick={run} disabled={loading} className="btn-accent w-full justify-center">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Сгенерировать 3 варианта
            </button>
            {variants.length > 0 && (
              <div className="mt-4 space-y-2">
                {variants.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (onPickQuestion) onPickQuestion(v);
                      else if (onPickText) onPickText(v.question);
                      setOpen(false);
                    }}
                    className="w-full rounded-xl border border-border bg-white p-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary-soft"
                  >
                    <div className="font-semibold">{v.question}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {v.options.map((o, oi) => `${String.fromCharCode(65 + oi)}. ${o}`).join(" · ")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
