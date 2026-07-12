import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Coins,
  Plus,
  Trash2,
  FileSpreadsheet,
  Upload,
  Settings2,
  Printer,
  FileText,
  Play,
} from "lucide-react";
import { BuilderShell } from "@/components/builder-shell";
import { HelpButton } from "@/components/help-modal";
import { ImageDrop } from "@/lib/image-drop";
import { ThemeSelect } from "@/components/theme-select";
import { FormulaButton } from "@/components/formula-popover";
import { newId, saveGame } from "@/lib/storage";
import {
  downloadExcelTemplate,
  exportMillionaireExcel,
  importMillionaireXlsx,
  printMillionaire,
} from "@/lib/exports";
import type {
  MilestoneMode,
  MillionaireConfig,
  MillionaireData,
  MillionaireQuestion,
  MoneyScale,
  PlayerTheme,
  PointsMode,
} from "@/lib/types";

export const Route = createFileRoute("/builder/millionaire")({
  head: () => ({
    meta: [
      { title: "Миллионер — конструктор — IslandQuiz" },
      { name: "description", content: "Создайте лестницу вопросов с несгораемыми суммами и 50:50." },
    ],
  }),
  component: BuilderMillionaire,
});

const LADDERS: Record<MoneyScale, number[]> = {
  easy: [100, 200, 300, 500, 1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 125_000, 250_000, 500_000, 1_000_000].map((n) => n / 10),
  normal: [500, 1_000, 2_000, 3_000, 5_000, 7_500, 10_000, 15_000, 25_000, 50_000, 100_000, 200_000, 400_000, 750_000, 1_000_000],
  hard: [10_000, 25_000, 50_000, 100_000, 200_000, 400_000, 750_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 75_000_000, 100_000_000],
};

function makeQuestion(money: number): MillionaireQuestion {
  return {
    q: "",
    image: "",
    money,
    options: [
      { text: "", correct: true },
      { text: "", correct: false },
      { text: "", correct: false },
      { text: "", correct: false },
    ],
  };
}

function BuilderMillionaire() {
  const [config, setConfig] = useState<MillionaireConfig>({
    theme: "amber",
    timePerQuestion: 30,
    moneyScale: "normal",
    milestones: "three",
  });
  const [questions, setQuestions] = useState<MillionaireQuestion[]>(
    LADDERS.normal.slice(0, 5).map((m) => makeQuestion(m)),
  );
  const [showSettings, setShowSettings] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const addQuestion = () => {
    const nextIdx = questions.length;
    const money = LADDERS[config.moneyScale][nextIdx] ?? LADDERS[config.moneyScale].at(-1)!;
    setQuestions([...questions, makeQuestion(money)]);
    setTimeout(() => {
      document.getElementById(`mq-${nextIdx}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const patchQuestion = (idx: number, patch: Partial<MillionaireQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const patchOption = (qIdx: number, oIdx: number, patch: Partial<{ text: string; correct: boolean }>) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i !== qIdx
          ? q
          : {
              ...q,
              options: q.options.map((o, oi) => (oi === oIdx ? { ...o, ...patch } : o)),
            },
      ),
    );
  };

  const markCorrect = (qIdx: number, oIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i !== qIdx ? q : { ...q, options: q.options.map((o, oi) => ({ ...o, correct: oi === oIdx })) },
      ),
    );
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = (): string | null => {
    if (questions.some((q) => !q.q.trim() || !q.options.some((o) => o.correct && o.text.trim()))) {
      showToast("В каждом вопросе укажите текст и верный ответ");
      return null;
    }
    const id = savedId ?? newId();
    saveGame<MillionaireData>("millionaire", id, { config, questions });
    setSavedId(id);
    showToast("Игра сохранена!");
    return id;
  };

  const openPlayer = () => {
    const id = handleSave();
    if (id) window.open(`/play/millionaire/${id}`, "_blank", "noopener");
  };

  const handleImport = async (file: File) => {
    try {
      const imported = await importMillionaireXlsx(file);
      if (imported.length) {
        setQuestions(imported);
        showToast(`Загружено вопросов: ${imported.length}`);
      }
    } catch (err) {
      console.error(err);
      showToast("Не удалось прочитать Excel");
    }
  };

  const scrollToQ = (idx: number) => {
    document.getElementById(`mq-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const sidebar = (
    <div className="space-y-1">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Лестница
      </p>
      {questions.map((q, i) => {
        const filled = q.q.trim() && q.options.some((o) => o.correct && o.text.trim());
        return (
          <button
            key={i}
            onClick={() => scrollToQ(i)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface-muted ${
              filled ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <span
              className={`grid h-6 w-6 place-items-center rounded-md font-mono text-[10px] font-bold ${
                filled ? "bg-success-soft text-success" : "bg-surface-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className="truncate">{q.money.toLocaleString("ru-RU")} ₽</span>
          </button>
        );
      })}
      <div className="my-2 border-t border-border" />
      <button onClick={addQuestion} className="btn-ghost w-full justify-center text-xs">
        <Plus className="h-3.5 w-3.5" /> Вопрос
      </button>
    </div>
  );

  const toolbar = (
    <div className="flex flex-wrap gap-2">
      <button className="btn-ghost" onClick={() => downloadExcelTemplate("millionaire")}>
        <FileText className="h-4 w-4" /> Шаблон Excel
      </button>
      <label className="btn-ghost cursor-pointer">
        <Upload className="h-4 w-4" /> Загрузить Excel
        <input
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
            e.currentTarget.value = "";
          }}
        />
      </label>
      <button className="btn-ghost" onClick={() => exportMillionaireExcel({ config, questions })}>
        <FileSpreadsheet className="h-4 w-4" /> Скачать .xlsx
      </button>
      <button className="btn-ghost" onClick={() => printMillionaire({ config, questions })}>
        <Printer className="h-4 w-4" /> Печать
      </button>
      <button className="btn-ghost" onClick={() => setShowSettings((s) => !s)}>
        <Settings2 className="h-4 w-4" /> Настройки
      </button>
      <button className="btn-accent" onClick={openPlayer}>
        <Play className="h-4 w-4" /> Играть (новая вкладка)
      </button>
    </div>
  );

  return (
    <BuilderShell
      title="Миллионер"
      subtitle="Лестница вопросов с 4 вариантами, несгораемыми суммами и подсказкой 50:50"
      icon={<Coins className="h-5 w-5" />}
      toolbar={toolbar}
      sidebar={sidebar}
      theme={config.theme}
      onSave={handleSave}
      extraFabs={
        <HelpButton title="Как пользоваться конструктором «Миллионера»">
          <p><b>Лестница:</b> 15 вопросов от лёгких к сложным. Сумма растёт по выбранной шкале (Лёгкая / Средняя / Хард).</p>
          <p><b>Верный ответ:</b> кликните по букве A/B/C/D — она станет зелёной.</p>
          <p><b>Несгораемые:</b> в настройках — «Классика» (2 точки), «Три точки» или «Без».</p>
          <p><b>Слева</b> — быстрая навигация по всем 15 вопросам; зелёный значок = вопрос готов.</p>
          <p><b>Excel:</b> шаблон включает колонки money, question, a, b, c, d, correct (буква).</p>
        </HelpButton>
      }
    >
      {showSettings && (
        <div className="surface-card animate-fade-up space-y-4 p-6">
          <h3 className="font-display font-bold">Настройки</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Время на вопрос (сек)</span>
              <input
                type="number"
                className="input-base"
                value={config.timePerQuestion}
                onChange={(e) => setConfig({ ...config, timePerQuestion: parseInt(e.target.value) || 30 })}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Шкала призов</span>
              <select
                className="input-base"
                value={config.moneyScale}
                onChange={(e) => setConfig({ ...config, moneyScale: e.target.value as MoneyScale })}
              >
                <option value="easy">Лёгкая (10-100 000)</option>
                <option value="normal">Средняя (500-1 000 000)</option>
                <option value="hard">Хард (10 000-100 млн)</option>
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Несгораемые</span>
              <select
                className="input-base"
                value={config.milestones}
                onChange={(e) => setConfig({ ...config, milestones: e.target.value as MilestoneMode })}
              >
                <option value="classic">Классика (5-я, 10-я)</option>
                <option value="three">Три точки (5-я, 10-я, 15-я)</option>
                <option value="none">Без несгораемых</option>
              </select>
            </label>
            <div className="sm:col-span-3">
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">Тема плеера</span>
              <ThemeSelect
                value={config.theme}
                onChange={(theme: PlayerTheme) => setConfig({ ...config, theme })}
              />
            </div>
          </div>
        </div>
      )}

      {questions.map((q, idx) => (
        <div key={idx} id={`mq-${idx}`} className="surface-card space-y-3 p-6 scroll-mt-24">
          <div className="flex items-center justify-between">
            <div className="rounded-full bg-amber-soft px-4 py-1.5 text-sm font-bold text-amber">
              Вопрос {idx + 1} · {q.money.toLocaleString("ru-RU")} ₽
            </div>
            <button
              onClick={() => removeQuestion(idx)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <textarea
            rows={2}
            className="input-base"
            placeholder="Текст вопроса..."
            value={q.q}
            onChange={(e) => patchQuestion(idx, { q: e.target.value })}
          />
          <ImageDrop value={q.image} onChange={(image) => patchQuestion(idx, { image })} />
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => markCorrect(idx, oi)}
                  className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${
                    opt.correct
                      ? "border-success bg-success text-white"
                      : "border-border-strong text-muted-foreground hover:border-primary"
                  }`}
                  aria-label="Отметить верным"
                >
                  {String.fromCharCode(65 + oi)}
                </button>
                <input
                  className="input-base"
                  placeholder={`Вариант ${String.fromCharCode(65 + oi)}`}
                  value={opt.text}
                  onChange={(e) => patchOption(idx, oi, { text: e.target.value })}
                />
              </div>
            ))}
          </div>
          <label className="text-xs text-muted-foreground">
            Сумма
            <input
              type="number"
              className="input-base ml-2 inline-block w-32 py-1 text-sm"
              value={q.money}
              onChange={(e) => patchQuestion(idx, { money: parseInt(e.target.value) || 0 })}
            />
          </label>
        </div>
      ))}

      <button onClick={addQuestion} className="btn-ghost w-full justify-center py-4">
        <Plus className="h-4 w-4" /> Добавить вопрос
      </button>

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white shadow-lift">
          {toast}
        </div>
      )}
    </BuilderShell>
  );
}
