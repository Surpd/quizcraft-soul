// Reusable image drop-zone. Accepts drag-drop, click-to-upload, or URL.
// Stores the result as a data URL (compact enough for localStorage under 500KB).

import { useRef, useState, useEffect } from "react";
import { ImagePlus, X } from "lucide-react";

interface Props {
  value?: string;
  onChange: (value: string) => void;
  maxKB?: number;
  compact?: boolean;
}

export function ImageDrop({ value, onChange, maxKB = 500, compact }: Props) {
  const [url, setUrl] = useState(value?.startsWith("data:") ? "" : value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value?.startsWith("data:")) setUrl("");
    else if (value) setUrl(value);
  }, [value]);

  const readFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Только изображения");
      return;
    }
    if (file.size > maxKB * 1024) {
      setError(`Файл больше ${maxKB} КБ`);
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => onChange(String(e.target?.result ?? ""));
    reader.readAsDataURL(file);
  };

  const clear = () => {
    onChange("");
    setUrl("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className={compact ? "flex items-center gap-2" : "space-y-2"}>
      {!compact && (
        <input
          type="url"
          className="input-base"
          placeholder="URL картинки (или перетащите файл ниже)"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            onChange(e.target.value);
          }}
        />
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) readFile(f);
        }}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed transition-all ${
          compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"
        } ${
          dragging
            ? "border-primary bg-primary-soft"
            : "border-border-strong bg-surface-muted hover:border-primary/50"
        } text-muted-foreground flex items-center gap-2`}
      >
        <ImagePlus className="h-4 w-4" />
        <span>Перетащите изображение или нажмите</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f);
          }}
        />
      </div>

      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Предпросмотр"
            className="max-h-24 rounded-lg border border-border object-cover"
          />
          <button
            type="button"
            onClick={clear}
            aria-label="Удалить изображение"
            className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-white shadow-sm"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
