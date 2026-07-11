// Export helpers — Excel (xlsx) and CSV/PDF (browser print).
// Kept dependency-light: xlsx + papaparse are already installed.

import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { JeopardyData, MillionaireData, QuizData } from "./types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- Excel ---------------- */

export function exportQuizExcel(data: QuizData) {
  const wb = XLSX.utils.book_new();
  const rows = data.questions.map((q, i) => ({
    "#": i + 1,
    Тип: q.type,
    Вопрос: q.q,
    Варианты: q.options.join(" | "),
    Ответ: q.answer,
    Баллы: q.points,
    "Время (сек)": q.time,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Вопросы");
  XLSX.writeFile(wb, `${data.config.title || "quiz"}.xlsx`);
}

export function exportJeopardyExcel(data: JeopardyData) {
  const wb = XLSX.utils.book_new();
  data.rounds.forEach((round, ri) => {
    const rows: Record<string, string | number>[] = [];
    round.forEach((cat) => {
      cat.questions.forEach((q) => {
        rows.push({
          Категория: cat.category,
          Стоимость: q.points,
          Вопрос: q.q,
          Ответ: q.a,
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `Раунд ${ri + 1}`);
  });
  const finalWs = XLSX.utils.json_to_sheet([
    { Категория: data.final.category, Вопрос: data.final.q, Ответ: data.final.a },
  ]);
  XLSX.utils.book_append_sheet(wb, finalWs, "Финал");
  XLSX.writeFile(wb, "своя-игра.xlsx");
}

export function exportMillionaireExcel(data: MillionaireData) {
  const wb = XLSX.utils.book_new();
  const rows = data.questions.map((q, i) => ({
    "#": i + 1,
    Сумма: q.money,
    Вопрос: q.q,
    A: q.options[0]?.text ?? "",
    B: q.options[1]?.text ?? "",
    C: q.options[2]?.text ?? "",
    D: q.options[3]?.text ?? "",
    Верный: ["A", "B", "C", "D"][q.options.findIndex((o) => o.correct)] ?? "?",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Миллионер");
  XLSX.writeFile(wb, "миллионер.xlsx");
}

/* ---------------- CSV import ---------------- */

export function parseCSV<T = Record<string, string>>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve(res.data),
      error: reject,
    });
  });
}

/* ---------------- CSV templates ---------------- */

export function downloadCSVTemplate(kind: "quiz" | "jeopardy" | "millionaire") {
  let csv = "";
  if (kind === "quiz") {
    csv =
      "type,question,options,answer,points,time\nchoice,Столица Франции?,Париж|Лондон|Берлин|Мадрид,Париж,100,30\nbool,Вода мокрая?,,true,50,20\ntext,Что такое H2O?,,вода,100,30\n";
  } else if (kind === "jeopardy") {
    csv =
      "round,category,points,question,answer\n1,История,100,Год начала ВОВ?,1941\n1,История,200,Первый президент США?,Вашингтон\nfinal,Наука,0,Единица силы?,Ньютон\n";
  } else {
    csv =
      "money,question,a,b,c,d,correct\n500,Столица Японии?,Токио,Осака,Киото,Нагоя,A\n1000,Автор «Войны и мира»?,Толстой,Достоевский,Чехов,Пушкин,A\n";
  }
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `template_${kind}.csv`);
}

/* ---------------- Print / PDF ---------------- */

export function printQuiz(data: QuizData) {
  const win = window.open("", "_blank");
  if (!win) return;
  const rows = data.questions
    .map(
      (q, i) => `
      <div class="q">
        <div class="qn">${i + 1}. ${escape(q.q)}</div>
        ${q.options.length ? `<ul>${q.options.map((o) => `<li>${escape(o)}</li>`).join("")}</ul>` : ""}
        <div class="a"><strong>Ответ:</strong> ${escape(q.answer)}</div>
      </div>`,
    )
    .join("");
  win.document.write(printShell(data.config.title || "Квиз", rows));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function printJeopardy(data: JeopardyData) {
  const win = window.open("", "_blank");
  if (!win) return;
  const body = data.rounds
    .map(
      (round, ri) => `
      <h2>Раунд ${ri + 1}</h2>
      ${round
        .map(
          (cat) => `
        <h3>${escape(cat.category)}</h3>
        <table><thead><tr><th>Стоимость</th><th>Вопрос</th><th>Ответ</th></tr></thead>
        <tbody>${cat.questions
          .map(
            (q) => `<tr><td>${q.points}</td><td>${escape(q.q)}</td><td>${escape(q.a)}</td></tr>`,
          )
          .join("")}</tbody></table>`,
        )
        .join("")}`,
    )
    .join("");
  const finalBlock = `<h2>Финал</h2><p><strong>${escape(data.final.category)}:</strong> ${escape(data.final.q)}</p><p><em>Ответ: ${escape(data.final.a)}</em></p>`;
  win.document.write(printShell("Своя Игра", body + finalBlock));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function printMillionaire(data: MillionaireData) {
  const win = window.open("", "_blank");
  if (!win) return;
  const rows = data.questions
    .map(
      (q, i) => `
    <div class="q">
      <div class="qn">${i + 1}. [${q.money.toLocaleString("ru-RU")} ₽] ${escape(q.q)}</div>
      <ol type="A">${q.options
        .map((o) => `<li${o.correct ? ' style="font-weight:700"' : ""}>${escape(o.text)}</li>`)
        .join("")}</ol>
    </div>`,
    )
    .join("");
  win.document.write(printShell("Миллионер", rows));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function escape(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function printShell(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; color:#0f172a; padding:32px; max-width:900px; margin:0 auto; }
    h1 { border-bottom: 2px solid #0d9488; padding-bottom: 8px; }
    h2 { margin-top: 28px; color: #0d9488; }
    .q { margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; break-inside: avoid; }
    .qn { font-weight: 700; margin-bottom: 8px; }
    .a { color: #0d9488; margin-top: 8px; font-size: 0.9rem; }
    table { width:100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 0.9rem; }
    th { background: #f1f5f9; }
    @media print { body { padding: 0; } }
  </style></head><body><h1>${escape(title)}</h1>${body}</body></html>`;
}
