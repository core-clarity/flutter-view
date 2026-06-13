"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type BprStage } from "@/lib/schema";

type SelectBprStageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fieldLabel: string;
  fieldId: string;
  placeholder: string;
  emptyMessage: string;
  stages: BprStage[];
  onSelect: (stage: BprStage) => void;
};

export function SelectBprStageDialog({
  open,
  onOpenChange,
  title,
  description,
  fieldLabel,
  fieldId,
  placeholder,
  emptyMessage,
  stages,
  onSelect,
}: SelectBprStageDialogProps) {
  const [selectedId, setSelectedId] = useState("");

  const handleSubmit = () => {
    const stage = stages.find((s) => s.id === selectedId);
    if (!stage) return;
    onSelect(stage);
    setSelectedId("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setSelectedId("");
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={fieldId}>{fieldLabel}</FieldLabel>
              <Select
                value={selectedId || undefined}
                onValueChange={(v) => setSelectedId(v ?? "")}
              >
                <SelectTrigger id={fieldId} className="w-full">
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent align="start">
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline">キャンセル</Button>} />
          <Button
            onClick={handleSubmit}
            disabled={stages.length === 0 || !selectedId}
          >
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
