import { useEffect, useRef, useState } from "react";
import {
  Save,
  Play,
  ChevronDown,
  Upload,
  FileSpreadsheet,
  Printer,
  Settings2,
  FileText,
  X,
  Radio,
  Monitor,
  Copy,
} from "lucide-react";
import { createRoom } from "@/lib/api";
import type { GameKind } from "@/lib/types";

// ---------- Toolbar (Import / Export / Settings) ----------

interface ToolbarProps {
  kind: GameKind;
  onImportFile: (file: File) => void;
  onDownloadTemplate: () => void;
  onExportExcel: () => void;
  onPrint: (withAnswers: boolean) => void;
  printAnswers: boolean;
  onToggleSettings: () => void;
}

export function BuilderToolbar({
  kind: _kind,
  onImportFile,
  onDownloadTemplate,
  onExportExcel,
  onPrint,
  printAnswers,
  onToggleSettings,
}: ToolbarProps) {
  const [openImport, setOpenImport] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setOpenExport(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button className="btn-ghost" onClick={() => setOpenImport(true)}>
          <Upload className="h-4 w-4" /> Импорт
        </button>

        <div ref={exportRef} className="relative">
          <button className="btn-ghost" onClick={() => setOpenExport((v) => !v)}>
            <FileSpreadsheet className="h-4 w-4" /> Экспорт
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {openExport && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lift">
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                onClick={() => { setOpenExport(false); onExportExcel(); }}
              >
                <FileSpreadsheet className="h-4 w-4 text-primary" /> Скачать Excel (.xlsx)
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                onClick={() => { setOpenExport(false); onPrint(printAnswers); }}
              >
                <Printer className="h-4 w-4 text-primary" /> Печать / PDF ({printAnswers ? "с ответами" : "без ответов"})
              </button>
            </div>
          )}
        </div>

        <button
          className="btn-ghost"
          onClick={onToggleSettings}
          aria-label="Настройки"
          title="Настройки"
        >
          <Settings2 className="h-4 w-4" /> Настройки
        </button>
      </div>

      {openImport && (
        <ImportModal
          onClose={() => setOpenImport(false)}
          onFile={(f) => { onImportFile(f); setOpenImport(false); }}
          onDownloadTemplate={onDownloadTemplate}
        />
      )}
    </>
  );
}

function ImportModal({
  onClose,
  onFile,
  onDownloadTemplate,
}: {
  onClose: () => void;
  onFile: (f: File) => void;
  onDownloadTemplate: () => void;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-fade-up rounded-3xl bg-surface p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Импорт из Excel</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
            drag ? "border-primary bg-primary-soft" : "border-border-strong bg-surface-muted"
          }`}
        >
          <Upload className="h-8 w-8 text-primary" />
          <p className="text-sm font-semibold">Перетащите Excel сюда</p>
          <p className="text-xs text-muted-foreground">или кликните, чтобы выбрать файл</p>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.currentTarget.value = "";
            }}
          />
        </label>

        <button
          className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-primary hover:underline"
          onClick={onDownloadTemplate}
        >
          <FileText className="h-4 w-4" /> Нет шаблона? Скачать шаблон
        </button>
      </div>
    </div>
  );
}

// ---------- FABs: Save (split) + Play ----------

interface FabsProps {
  kind: GameKind;
  savedId: string | null;
  onSave: () => string | null;
  onSaveAsCopy: () => string | null;
  themeAccent?: string;
}

export function BuilderFabs({ kind, savedId, onSave, onSaveAsCopy, themeAccent }: FabsProps) {
  const [openSaveMenu, setOpenSaveMenu] = useState(false);
  const [openQuizModal, setOpenQuizModal] = useState(false);
  const [hostView, setHostView] = useState<{ id: string } | null>(null);
  const saveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (saveRef.current && !saveRef.current.contains(e.target as Node)) {
        setOpenSaveMenu(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handlePlay = () => {
    const id = onSave();
    if (!id) return;
    if (kind === "quiz" || kind === "jeopardy") {
      setOpenQuizModal(true);
    } else {
      window.open(`/play/${kind}/${id}`, "_blank", "noopener");
    }
  };


  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        {/* Split Save */}
        <div ref={saveRef} className="relative flex items-stretch overflow-hidden rounded-full shadow-lift">
          <button
            type="button"
            onClick={() => onSave()}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-95"
            style={{ background: "var(--foreground)" }}
          >
            <Save className="h-4 w-4" />
            {savedId ? "Сохранить" : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={() => setOpenSaveMenu((v) => !v)}
            aria-label="Ещё"
            className="grid place-items-center border-l border-white/20 px-3 text-white hover:bg-white/10"
            style={{ background: "var(--foreground)" }}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          {openSaveMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lift">
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                onClick={() => { setOpenSaveMenu(false); onSaveAsCopy(); }}
              >
                <Copy className="h-4 w-4 text-primary" /> Сохранить как копию
              </button>
            </div>
          )}
        </div>

        {/* Play */}
        <button
          type="button"
          onClick={handlePlay}
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-lift transition-transform hover:scale-[1.03] active:scale-95"
          style={{ background: themeAccent ?? "var(--primary)", color: themeAccent ? "#000" : "#fff" }}
        >
          <Play className="h-4 w-4" /> Играть
        </button>
      </div>

      {openQuizModal && savedId && (
        <QuizPlayModal
          gameId={savedId}
          onClose={() => setOpenQuizModal(false)}
          onOfflineHost={(id) => { setOpenQuizModal(false); setHostView({ id }); }}
        />
      )}

      {hostView && (
        <OfflineHostView gameId={hostView.id} onClose={() => setHostView(null)} />
      )}
    </>
  );
}

function QuizPlayModal({
  gameId,
  onClose,
  onOfflineHost,
}: {
  gameId: string;
  onClose: () => void;
  onOfflineHost: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startOnline = async () => {
    setError(null);
    setLoading(true);
    try {
      const { code } = await createRoom("quiz", gameId);
      window.open(`/room/${code}`, "_blank", "noopener");
      onClose();
    } catch (err) {
      console.error(err);
      setError("Не удалось создать комнату");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-fade-up rounded-3xl bg-surface p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">Как играем?</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={startOnline}
            disabled={loading}
            className="group flex flex-col items-start gap-2 rounded-2xl border-2 border-border p-5 text-left transition-all hover:border-primary hover:bg-primary-soft disabled:opacity-60"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Radio className="h-5 w-5" />
            </span>
            <span className="font-display text-base font-bold">Онлайн-комната</span>
            <span className="text-xs text-muted-foreground">
              {loading ? "Создаём..." : "Ученики заходят по коду со своих устройств"}
            </span>
          </button>

          <button
            onClick={() => onOfflineHost(gameId)}
            className="group flex flex-col items-start gap-2 rounded-2xl border-2 border-border p-5 text-left transition-all hover:border-amber hover:bg-amber-soft"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-soft text-amber">
              <Monitor className="h-5 w-5" />
            </span>
            <span className="font-display text-base font-bold">▶️ Офлайн</span>
            <span className="text-xs text-muted-foreground">
              Плеер на проекторе, ссылка + QR для учеников
            </span>
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        )}
      </div>
    </div>
  );
}

function OfflineHostView({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const playUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/quiz/${gameId}`
      : `/play/quiz/${gameId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(playUrl)}`;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(playUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-fade-up rounded-3xl bg-surface p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">Офлайн-режим</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ссылка для учеников
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                className="input-base flex-1 font-mono text-xs"
                value={playUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button className="btn-ghost" onClick={copy}>
                <Copy className="h-4 w-4" /> {copied ? "Ок" : "Копировать"}
              </button>
            </div>
            <button
              onClick={() => window.open(playUrl, "_blank", "noopener")}
              className="btn-accent mt-4 w-full justify-center py-3"
            >
              <Monitor className="h-4 w-4" /> Открыть плеер на проекторе
            </button>
          </div>
          <div className="grid place-items-center rounded-2xl border border-border bg-surface-muted p-3">
            <img src={qrUrl} alt="QR" className="h-40 w-40 rounded-lg" />
            <p className="mt-2 text-[11px] text-muted-foreground">QR к плееру</p>
          </div>
        </div>
      </div>
    </div>
  );
}
