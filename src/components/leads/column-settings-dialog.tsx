"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2, GripVertical, Lock, Database, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface ColumnSetting {
  id: string;
  column_key: string;
  column_label: string;
  is_visible: boolean;
  display_order: number;
  is_system: boolean;
  column_width: number | null;
  // csv_mappings와 연동된 추가 정보
  field_type?: string;
  is_core_field?: boolean;
  csv_column?: string;
}

interface ColumnSettingsDialogProps {
  onSettingsChange?: (columns: ColumnSetting[]) => void;
  /** 외부에서 다이얼로그 열림 상태를 제어할 때 사용 */
  open?: boolean;
  /** 외부에서 다이얼로그 열림 상태를 제어할 때 사용 */
  onOpenChange?: (open: boolean) => void;
  /** 트리거 버튼 숨김 여부 (외부에서 열 때 사용) */
  hideTrigger?: boolean;
}

// 드래그 가능한 컬럼 아이템 컴포넌트
function SortableColumnItem({
  column,
  onVisibilityToggle,
}: {
  column: ColumnSetting;
  onVisibilityToggle: (columnKey: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 ${
        column.is_system ? "bg-muted/30" : ""
      } ${isDragging ? "shadow-lg bg-background border" : ""}`}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
          type="button"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <Label
          htmlFor={`col-${column.column_key}`}
          className="cursor-pointer flex items-center gap-2"
        >
          {column.column_label}
          {column.is_system && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
          {!column.is_system && column.is_core_field === false && (
            <Sparkles className="h-3 w-3 text-amber-500" />
          )}
          {!column.is_system && column.is_core_field !== false && (
            <Database className="h-3 w-3 text-blue-500" />
          )}
        </Label>
      </div>
      <Switch
        id={`col-${column.column_key}`}
        checked={column.is_visible}
        onCheckedChange={() =>
          !column.is_system && onVisibilityToggle(column.column_key)
        }
        disabled={column.is_system}
      />
    </div>
  );
}

export function ColumnSettingsDialog({
  onSettingsChange,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: ColumnSettingsDialogProps) {
  // 내부 상태 (uncontrolled mode)
  const [internalOpen, setInternalOpen] = useState(false);

  // controlled vs uncontrolled 모드 결정
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (value: boolean) => controlledOnOpenChange?.(value)
    : setInternalOpen;
  const [columns, setColumns] = useState<ColumnSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 컬럼 설정 조회
  const fetchColumns = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings/lead-columns");
      const result = await response.json();

      if (result.success) {
        setColumns(result.data);
      } else {
        toast.error("컬럼 설정을 불러오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("Error fetching column settings:", error);
      toast.error("컬럼 설정을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 다이얼로그 열릴 때 데이터 로드
  useEffect(() => {
    if (open) {
      fetchColumns();
    }
  }, [open]);

  // 표시 여부 토글
  const handleVisibilityToggle = (columnKey: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.column_key === columnKey
          ? { ...col, is_visible: !col.is_visible }
          : col
      )
    );
  };

  // 드래그 종료 시 순서 변경
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // display_order 업데이트
        return newItems.map((item, index) => ({
          ...item,
          display_order: index + 1,
        }));
      });
    }
  };

  // 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings/lead-columns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("컬럼 설정이 저장되었습니다.");
        setColumns(result.data);
        onSettingsChange?.(result.data);
        setOpen(false);
      } else {
        toast.error(result.error || "저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error saving column settings:", error);
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.is_system ? col : { ...col, is_visible: checked }
      )
    );
  };

  const visibleCount = columns.filter((c) => c.is_visible).length;
  const totalCount = columns.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings2 className="mr-2 h-4 w-4" />
            컬럼 설정
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>리드 목록 컬럼 설정</DialogTitle>
          <DialogDescription>
            리드 목록에 표시할 컬럼을 선택하고 순서를 변경하세요.
            {` (${visibleCount}/${totalCount}개 선택됨)`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 전체 선택 */}
            <div className="flex items-center justify-between px-2 py-2 bg-muted rounded-md">
              <Label className="font-medium">전체 선택/해제</Label>
              <Switch
                checked={columns.filter((c) => !c.is_system).every((c) => c.is_visible)}
                onCheckedChange={handleSelectAll}
              />
            </div>

            {/* 안내 문구 */}
            <p className="text-xs text-muted-foreground px-2">
              드래그하여 컬럼 순서를 변경할 수 있습니다.
            </p>

            {/* 컬럼 목록 */}
            <div className="max-h-[400px] overflow-y-auto space-y-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={columns.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columns.map((column) => (
                    <SortableColumnItem
                      key={column.id}
                      column={column}
                      onVisibilityToggle={handleVisibilityToggle}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
