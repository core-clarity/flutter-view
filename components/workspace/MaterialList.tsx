"use client";

import { ExternalLink, Plus, Trash2 } from "lucide-react";

import { type Material } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import {
  InlineFieldRow,
  InlineTextField,
} from "@/components/primitives";

type MaterialListProps = {
  items: Material[];
  onChange: (items: Material[]) => void;
};

function isValidUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function MaterialList({ items, onChange }: MaterialListProps) {
  const handleUpdate = (id: string, patch: Partial<Material>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemove = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleAdd = () => {
    onChange([
      ...items,
      { id: `mat-${Date.now()}`, label: "", url: "" },
    ]);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="px-1 py-2 text-sm text-muted-foreground">
          資料はまだありません。URL を追加してください。
        </p>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus />
          資料を追加
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
        >
          <div className="flex items-start justify-between gap-2">
            {isValidUrl(item.url) ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <span className="truncate">
                  {item.label.trim() || item.url}
                </span>
                <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">
                {item.label.trim() || "（リンク未設定）"}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleRemove(item.id)}
              aria-label="資料を削除"
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            <InlineFieldRow label="表示名">
              <InlineTextField
                value={item.label}
                onSave={(v) => handleUpdate(item.id, { label: v })}
                ariaLabel="資料の表示名"
                placeholder="例: ヒアリング議事録"
              />
            </InlineFieldRow>
            <InlineFieldRow label="URL">
              <InlineTextField
                value={item.url}
                onSave={(v) => handleUpdate(item.id, { url: v })}
                ariaLabel="資料の URL"
                placeholder="https://drive.google.com/..."
              />
            </InlineFieldRow>
          </dl>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
        <Plus />
        資料を追加
      </Button>
    </div>
  );
}
