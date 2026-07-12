import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Grid3x3,
  Plus,
  Trash2,
  FileSpreadsheet,
  Printer,
  Upload,
  Settings2,
  LayoutGrid,
  List,
  FileText,
  Pencil,
  Play,
} from "lucide-react";
import { BuilderShell } from "@/components/builder-shell";
import { HelpButton } from "@/components/help-modal";
import { FormulaButton } from "@/components/formula-popover";
import { ImageDrop } from "@/lib/image-drop";
import { ThemeSelect } from "@/components/theme-select";
import { newId, saveGame } from "@/lib/storage";
import {
  downloadExcelTemplate,
  exportJeopardyExcel,
  importJeopardyXlsx,
  printJeopardy,
} from "@/lib/exports";
import type {
  JeopardyCategory,
  JeopardyConfig,
  JeopardyData,
  JeopardyFinal,
  JeopardyQuestion,
  PlayerTheme,
} from "@/lib/types";

export const Route = createFileRoute("/builder/jeopardy")({
  head: () => ({
    meta: [
      { title: "Своя игра — конструктор — IslandQuiz" },
      { name: "description", content: "Создавайте раунды, категории и финал для «Своей игры»." },
    ],
  }),
  component: BuilderJeopardy,
});

const DEFAULT_POINTS = [100, 200, 300, 400, 500];

function makeCategory(round: number): JeopardyCategory {
  const step = round === 1 ? 100 : round === 2 ? 200 : 300;
  return {
    category: "",
    questions: DEFAULT_POINTS.map((p) => ({ points: p * (step / 100), q: "", a: "", image: "" })),
  };
}

interface ModalTarget {
  roundIdx: number;
  catIdx: number;
  qIdx: number;
}

function BuilderJeopardy() {
  const [config, setConfig] = useState<JeopardyConfig>({
    theme: "amber",
    timeBase: 30,
    timeStep: 15,
    timeFinal: 90,
  });
  const [rounds, setRounds] = useState<JeopardyCategory[][]>([
    [makeCategory(1), makeCategory(1), makeCategory(1)],
  ]);
  const [final, setFinal] = useState<JeopardyFinal>({ category: "", q: "", a: "", image: "" });
  const [mode, setMode] = useState<"list" | "grid">("list");
  const [showSettings, setShowSettings] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalTarget | null>(null);
  const [printAnswers, setPrintAnswers] = useState(true);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const addRound = () => {
    setRounds((prev) => [...prev, [makeCategory(prev.length + 1), makeCategory(prev.length + 1)]]);
  };

  const addCategory = (roundIdx: number) => {
    setRounds((prev) =>
      prev.map((r, ri) => (ri === roundIdx ? [...r, makeCategory(roundIdx + 1)] : r)),
    );
  };

  const updateCategory = (roundIdx: number, catIdx: number, patch: Partial<JeopardyCategory>) => {
    setRounds((prev) =>
      prev.map((r, ri) =>
        ri !== roundIdx ? r : r.map((c, ci) => (ci === catIdx ? { ...c, ...patch } : c)),
      ),
    );
  };

  const updateQuestion = (
    roundIdx: number,
    catIdx: number,
    qIdx: number,
    patch: Partial<JeopardyQuestion>,
  ) => {
    setRounds((prev) =>
      prev.map((r, ri) =>
        ri !== roundIdx
          ? r
          : r.map((c, ci) =>
              ci !== catIdx
                ? c
                : {
                    ...c,
                    questions: c.questions.map((q, qi) => (qi === qIdx ? { ...q, ...patch } : q)),
                  },
            ),
      ),
    );
  };

  const removeCategory = (roundIdx: number, catIdx: number) => {
    setRounds((prev) => prev.map((r, ri) => (ri === roundIdx ? r.filter((_, ci) => ci !== catIdx) : r)));
  };

  const removeRound = (roundIdx: number) => {
    setRounds((prev) => prev.filter((_, ri) => ri !== roundIdx));
  };

  const handleSave = (): string | null => {
    const id = savedId ?? newId();
    const data: JeopardyData = { config, rounds, final };
    saveGame<JeopardyData>("jeopardy", id, data);
    setSavedId(id);
    showToast("Игра сохранена!");
    return id;
  };

  const openPlayer = () => {
    const id = handleSave();
    if (id) window.open(`/play/jeopardy/${id}`, "_blank", "noopener");
  };

  const handleImport = async (file: File) => {
    try {
      const { rounds: nextRounds, final: nextFinal } = await importJeopardyXlsx(file);
      if (nextRounds.length) setRounds(nextRounds);
      if (nextFinal) setFinal(nextFinal);
      showToast(`Загружено раундов: ${nextRounds.length}`);
    } catch (err) {
      console.error(err);
      showToast("Не удалось прочитать Excel");
    }
  };

  const sidebar = useMemo(
    () => (
      <div className="space-y-2">
        {rounds.map((round, ri) => (
          <div key={ri}>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  document
                    .getElementById(`round-${ri}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="flex-1 truncate rounded-lg bg-primary px-3 py-2 text-left text-xs font-bold text-primary-foreground"
              >
                Раунд {ri + 1}
              </button>
              <button
                onClick={() => addCategory(ri)}
                aria-label="Добавить категорию"
                title="Добавить категорию"
                className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-md border border-border-strong bg-surface text-primary hover:bg-primary-soft"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1 space-y-0.5 pl-2">
              {round.map((cat, ci) => (
                <button
                  key={ci}
                  onClick={() =>
                    document
                      .getElementById(`cat-${ri}-${ci}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="block w-full truncate rounded px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-surface-muted"
                >
                  {cat.category || `Категория ${ci + 1}`}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          onClick={addRound}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-primary/40 bg-primary-soft px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10"
        >
          <Plus className="h-3.5 w-3.5" /> Раунд
        </button>
        <button
          onClick={() => document.getElementById("final-block")?.scrollIntoView({ behavior: "smooth" })}
          className="w-full rounded-lg border border-amber/30 bg-amber-soft px-3 py-2 text-center text-xs font-bold text-amber"
        >
          Финал
        </button>
      </div>
    ),
    [rounds],
  );

  const toolbar = (
    <div className="flex flex-wrap gap-2">
      <button
        className="btn-ghost"
        onClick={() => setMode((m) => (m === "list" ? "grid" : "list"))}
      >
        {mode === "list" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
        {mode === "list" ? "Плитки" : "Список"}
      </button>
      <button className="btn-ghost" onClick={() => downloadExcelTemplate("jeopardy")}>
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
      <button className="btn-ghost" onClick={() => exportJeopardyExcel({ config, rounds, final })}>
        <FileSpreadsheet className="h-4 w-4" /> Скачать .xlsx
      </button>
      <button className="btn-ghost" onClick={() => printJeopardy({ config, rounds, final }, { withAnswers: printAnswers })}>
        <Printer className="h-4 w-4" /> Печать {printAnswers ? "с ответами" : "без ответов"}
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
      title="Своя игра"
      subtitle="Раунды, категории, стоимость вопросов и финальный вопрос со ставками"
      icon={<Grid3x3 className="h-5 w-5" />}
      toolbar={toolbar}
      sidebar={mode === "list" ? sidebar : undefined}
      theme={config.theme}
      onSave={openPlayer}
      extraFabs={
        <HelpButton title="Как пользоваться конструктором Своей игры">
          <p><b>Раунды и категории:</b> в раунде — несколько категорий, в каждой 5 вопросов разной стоимости. Кнопка «Категория» добавляет колонку, «Добавить раунд» — новый раунд.</p>
          <p><b>Плитки / Список:</b> переключайте вид кнопкой в тулбаре — плитки удобны для обзора, список — для быстрой правки.</p>
          <p><b>Финал:</b> отдельный вопрос со ставками команд, отображается ниже раундов.</p>
          <p><b>Excel:</b> скачайте шаблон, заполните — загрузите обратно. Роль «final» — финальный вопрос.</p>
          <p><b>Слева — быстрая навигация</b> по раундам и категориям.</p>
        </HelpButton>
      }
    >
      {showSettings && (
        <div className="surface-card animate-fade-up space-y-4 p-6">
          <h3 className="font-display font-bold">Настройки</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Базовое время (сек)</span>
              <input
                type="number"
                className="input-base"
                value={config.timeBase}
                onChange={(e) => setConfig({ ...config, timeBase: parseInt(e.target.value) || 30 })}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Шаг времени (сек)</span>
              <input
                type="number"
                className="input-base"
                value={config.timeStep}
                onChange={(e) => setConfig({ ...config, timeStep: parseInt(e.target.value) || 0 })}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Таймер финала (сек)</span>
              <input
                type="number"
                className="input-base"
                value={config.timeFinal}
                onChange={(e) => setConfig({ ...config, timeFinal: parseInt(e.target.value) || 90 })}
              />
            </label>
            <div className="sm:col-span-3">
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">Тема плеера</span>
              <ThemeSelect
                value={config.theme}
                onChange={(theme: PlayerTheme) => setConfig({ ...config, theme })}
              />
            </div>
            <label className="flex items-center gap-2 pt-2 text-sm sm:col-span-3">
              <input
                type="checkbox"
                checked={printAnswers}
                onChange={(e) => setPrintAnswers(e.target.checked)}
              />
              Печатать с ответами (иначе — только вопросы)
            </label>
          </div>
        </div>
      )}

      {rounds.map((round, ri) => (
        <section key={ri} id={`round-${ri}`} className="surface-card space-y-4 p-6 scroll-mt-24">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-black text-primary">Раунд {ri + 1}</h2>
            {rounds.length > 1 && (
              <button
                onClick={() => removeRound(ri)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                aria-label="Удалить раунд"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {mode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {round.map((cat, ci) => (
                <div key={ci} id={`cat-${ri}-${ci}`} className="rounded-2xl border border-border bg-surface-muted p-3">
                  <input
                    className="input-base mb-2 bg-white text-center font-bold"
                    placeholder={`Категория ${ci + 1}`}
                    value={cat.category}
                    onChange={(e) => updateCategory(ri, ci, { category: e.target.value })}
                  />
                  <div className="grid grid-rows-5 gap-1">
                    {cat.questions.map((q, qi) => (
                      <button
                        key={qi}
                        onClick={() => setModal({ roundIdx: ri, catIdx: ci, qIdx: qi })}
                        className={`rounded-lg border-2 py-2 text-sm font-bold transition-all ${
                          q.q
                            ? "border-success bg-success-soft text-success"
                            : "border-border-strong bg-white text-primary hover:border-primary"
                        }`}
                      >
                        {q.points}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => removeCategory(ri, ci)}
                    className="mt-2 w-full rounded p-1 text-[11px] text-muted-foreground hover:text-danger"
                  >
                    Удалить категорию
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {round.map((cat, ci) => (
                <div key={ci} id={`cat-${ri}-${ci}`} className="rounded-2xl border border-border p-4 scroll-mt-24">
                  <div className="mb-3 flex gap-2">
                    <input
                      className="input-base font-bold"
                      placeholder={`Категория ${ci + 1}`}
                      value={cat.category}
                      onChange={(e) => updateCategory(ri, ci, { category: e.target.value })}
                    />
                    <button
                      onClick={() => removeCategory(ri, ci)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {cat.questions.map((q, qi) => (
                      <div key={qi} className="flex flex-wrap items-center gap-2">
                        <span className="grid h-10 w-16 flex-shrink-0 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">
                          {q.points}
                        </span>
                        <input
                          className="input-base flex-1"
                          placeholder="Вопрос"
                          value={q.q}
                          onChange={(e) => updateQuestion(ri, ci, qi, { q: e.target.value })}
                        />
                        <input
                          className="input-base flex-1"
                          placeholder="Ответ"
                          value={q.a}
                          onChange={(e) => updateQuestion(ri, ci, qi, { a: e.target.value })}
                        />
                        <button
                          onClick={() => setModal({ roundIdx: ri, catIdx: ci, qIdx: qi })}
                          className="rounded-lg border border-border-strong bg-white p-2 hover:border-primary"
                          aria-label="Подробно"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => addCategory(ri)} className="btn-ghost w-full justify-center">
            <Plus className="h-4 w-4" /> Категория
          </button>
        </section>
      ))}

      <button onClick={addRound} className="btn-ghost w-full justify-center py-4">
        <Plus className="h-4 w-4" /> Добавить раунд
      </button>

      <section id="final-block" className="surface-card space-y-3 border-2 border-amber/30 p-6 scroll-mt-24">
        <h2 className="font-display text-xl font-black text-amber">Финал</h2>
        <input
          className="input-base"
          placeholder="Категория финала"
          value={final.category}
          onChange={(e) => setFinal({ ...final, category: e.target.value })}
        />
        <textarea
          rows={2}
          className="input-base"
          placeholder="Финальный вопрос"
          value={final.q}
          onChange={(e) => setFinal({ ...final, q: e.target.value })}
        />
        <input
          className="input-base"
          placeholder="Правильный ответ"
          value={final.a}
          onChange={(e) => setFinal({ ...final, a: e.target.value })}
        />
        <ImageDrop value={final.image} onChange={(image) => setFinal({ ...final, image })} />
      </section>

      {modal && (
        <QuestionModal
          data={rounds[modal.roundIdx][modal.catIdx].questions[modal.qIdx]}
          onClose={() => setModal(null)}
          onSave={(patch) => {
            updateQuestion(modal.roundIdx, modal.catIdx, modal.qIdx, patch);
            setModal(null);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white shadow-lift">
          {toast}
        </div>
      )}
    </BuilderShell>
  );
}

function QuestionModal({
  data,
  onClose,
  onSave,
}: {
  data: JeopardyQuestion;
  onClose: () => void;
  onSave: (patch: Partial<JeopardyQuestion>) => void;
}) {
  const [q, setQ] = useState(data.q);
  const [a, setA] = useState(data.a);
  const [image, setImage] = useState(data.image ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-fade-up rounded-3xl bg-surface p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Вопрос за {data.points}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <textarea
            rows={3}
            className="input-base"
            placeholder="Текст вопроса"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            className="input-base"
            placeholder="Ответ"
            value={a}
            onChange={(e) => setA(e.target.value)}
          />
          <ImageDrop value={image} onChange={setImage} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            Отмена
          </button>
          <button onClick={() => onSave({ q, a, image })} className="btn-primary bg-primary">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
