import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Grid3x3, Coins, Palette, FileSpreadsheet, Printer, Sigma } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IslandQuiz — конструктор квизов и викторин" },
      {
        name: "description",
        content:
          "Создавайте квизы, свою игру и миллионера. Пять тем, экспорт в Excel, LaTeX-формулы, drag-and-drop и всё локально в вашем браузере.",
      },
    ],
  }),
  component: Home,
});

const formats = [
  {
    href: "/builder/quiz",
    icon: FileText,
    title: "Квиз",
    tone: "primary" as const,
    desc: "Гибкий формат с ABCD, Да/Нет, открытым ответом и сопоставлением. Идеально для тестов и уроков.",
  },
  {
    href: "/builder/jeopardy",
    icon: Grid3x3,
    title: "Своя игра",
    tone: "accent" as const,
    desc: "Классическое поле с категориями и раундами. Команды, ставки в финале и подсчёт очков — всё встроено.",
  },
  {
    href: "/builder/millionaire",
    icon: Coins,
    title: "Миллионер",
    tone: "amber" as const,
    desc: "Лестница вопросов с несгораемыми суммами и подсказкой 50:50. Атмосфера настоящего шоу.",
  },
];

const features = [
  { icon: Palette, title: "5 визуальных тем", desc: "Amber, Midnight, Classic, Ocean, Forest. Атмосфера меняется одним кликом." },
  { icon: FileSpreadsheet, title: "Excel и CSV", desc: "Экспорт готовых игр в .xlsx и импорт вопросов из CSV-шаблона." },
  { icon: Printer, title: "Печать и PDF", desc: "Раздаточный материал в один клик через встроенную печать браузера." },
  { icon: Sigma, title: "LaTeX-формулы", desc: "Пишите \\(x^2\\) прямо в вопросе — рендерится через KaTeX." },
];

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-display text-sm font-black">IQ</span>
            </div>
            <span className="font-display text-xl font-bold tracking-tight">IslandQuiz</span>
          </div>
          <nav className="hidden gap-8 md:flex">
            <a href="#formats" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Форматы
            </a>
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Возможности
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/builder/quiz" className="btn-primary">
              Создать игру
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
          <div className="pointer-events-none absolute top-10 -right-16 h-72 w-72 rounded-full bg-primary-soft blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-accent-soft blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider">Собрано с душой</span>
              </div>
              <h1 className="font-display text-5xl font-black leading-[1.05] md:text-6xl">
                Создавай викторины, <br />
                которые <span className="text-primary">хочется</span> проходить
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                Личный инструмент для квизов, «Своей игры» и «Миллионера». Тёплые темы, LaTeX-формулы,
                экспорт в Excel и всё локально — без аккаунтов и подписок.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link to="/builder/quiz" className="btn-accent">
                  Создать игру
                </Link>
                <a
                  href="#formats"
                  className="rounded-2xl border-2 border-border-strong bg-surface px-8 py-4 text-lg font-bold text-foreground transition-colors hover:bg-foreground hover:text-white"
                >
                  Смотреть форматы
                </a>
              </div>
            </div>

            {/* Preview mock */}
            <div className="relative">
              <div className="surface-card rotate-1 p-6 shadow-lift">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-danger" />
                    <div className="h-3 w-3 rounded-full bg-amber" />
                    <div className="h-3 w-3 rounded-full bg-success" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">islandquiz</span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg bg-surface-muted p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Вопрос 3 из 10</p>
                    <p className="mt-2 font-display font-bold">Столица Исландии?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border-strong p-3 text-sm">Осло</div>
                    <div className="rounded-lg border-2 border-primary bg-primary-soft p-3 text-sm font-semibold">
                      Рейкьявик
                    </div>
                    <div className="rounded-lg border border-border-strong p-3 text-sm">Хельсинки</div>
                    <div className="rounded-lg border border-border-strong p-3 text-sm">Копенгаген</div>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full w-2/3 rounded-full bg-accent" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 -rotate-3 rounded-2xl border border-border bg-white p-4 shadow-lift">
                <p className="text-xs font-semibold text-muted-foreground">Ваш счёт</p>
                <p className="font-display text-2xl font-black text-primary">+300</p>
              </div>
            </div>
          </div>
        </section>

        {/* Formats */}
        <section id="formats" className="bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 text-center">
              <h2 className="font-display text-3xl font-black md:text-4xl">Выберите формат</h2>
              <p className="mt-3 text-muted-foreground">Три легендарных механики в одном инструменте</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {formats.map((f) => {
                const Icon = f.icon;
                const toneMap = {
                  primary: "bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground",
                  accent: "bg-accent-soft text-accent group-hover:bg-accent group-hover:text-accent-foreground",
                  amber: "bg-amber-soft text-amber group-hover:bg-amber group-hover:text-white",
                };
                return (
                  <div
                    key={f.title}
                    className="group relative flex flex-col rounded-3xl border border-border bg-background p-8 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift"
                  >
                    <div
                      className={`mb-6 grid h-14 w-14 place-items-center rounded-2xl transition-colors ${toneMap[f.tone]}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-2xl font-bold">{f.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                    <Link
                      to={f.href}
                      className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white py-3 font-bold text-foreground shadow-sm transition-all group-hover:bg-foreground group-hover:text-white"
                    >
                      Создать
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 max-w-2xl">
              <h2 className="font-display text-3xl font-black md:text-4xl">Всё нужное — уже внутри</h2>
              <p className="mt-3 text-muted-foreground">
                Инструмент, который не мешает создавать. Логика проверена, а интерфейс не отвлекает.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="surface-card p-6">
                    <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-lg font-bold">{f.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-6">
            <div className="relative overflow-hidden rounded-3xl bg-foreground p-10 text-center text-white sm:p-16">
              <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 -translate-y-16 translate-x-16 rounded-full bg-primary/30 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 translate-y-16 -translate-x-16 rounded-full bg-accent/30 blur-3xl" />
              <h2 className="relative font-display text-3xl font-black md:text-4xl">Готовы попробовать?</h2>
              <p className="relative mt-3 text-white/70">Создайте свой первый квиз за пару минут.</p>
              <Link
                to="/builder/quiz"
                className="btn-accent relative mt-8 inline-flex"
              >
                Начать сейчас
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded bg-foreground text-white">
              <span className="text-[9px] font-black">IQ</span>
            </div>
            <span className="font-display text-sm font-bold">IslandQuiz</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 IslandQuiz. Сделано для своих.</p>
        </div>
      </footer>
    </div>
  );
}
