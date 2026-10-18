"use client";

import React, { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FULL_WIDTH_WIDGETS,
  GRID_WIDGETS,
  FullWidthId,
  GridId,
  WIDGET_LABELS,
  STORAGE_KEY_FULL,
  STORAGE_KEY_GRID,
  saveOrder,
} from "./dashboard-types";
import {
  MotivationWidget,
  QuickActionsWidget,
  ContinueStudyWidget,
  ReferralCardWidget,
  ReferralsListWidget,
  YourProgressWidget,
  UpcomingExamsWidget,
} from "./DashboardWidgets";
import type { DashboardLayoutProps } from "./StaticDashboardLayout";

// ─── Sortable Widget Wrapper ───────────────────────────────────────────────────
interface SortableWidgetProps {
  id: string;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
  className?: string;
  label?: string;
}

function SortableWidget({ id, children, className, label }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`Drag to reorder ${label ?? id}`}
      className="p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors"
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className={cn("relative group/dnd", className)}>
      {children(dragHandle)}
    </div>
  );
}

// ─── Drag overlay ghost card ───────────────────────────────────────────────────
function WidgetDragGhost({ label }: { label: string }) {
  return (
    <div className="bg-card border-2 border-blue-400 border-dashed rounded-[16px] p-6 shadow-2xl opacity-90 flex items-center gap-3">
      <GripVertical className="w-5 h-5 text-blue-400" />
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

export default function DraggableDashboardLayout({
  fullOrder,
  gridOrder,
  data,
  loading,
  motivation,
  referralData,
  referralHistory,
  isReferralHistoryLoading,
  onFullOrderChange,
  onGridOrderChange,
}: DashboardLayoutProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFullDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over || active.id === over.id) return;

      const oldIdx = fullOrder.indexOf(active.id as FullWidthId);
      const newIdx = fullOrder.indexOf(over.id as FullWidthId);
      if (oldIdx !== -1 && newIdx !== -1) {
        const next = arrayMove(fullOrder, oldIdx, newIdx);
        saveOrder(STORAGE_KEY_FULL, next);
        onFullOrderChange?.(next);
      }
    },
    [fullOrder, onFullOrderChange]
  );

  const handleGridDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over || active.id === over.id) return;

      const oldIdx = gridOrder.indexOf(active.id as GridId);
      const newIdx = gridOrder.indexOf(over.id as GridId);
      if (oldIdx !== -1 && newIdx !== -1) {
        const next = arrayMove(gridOrder, oldIdx, newIdx);
        saveOrder(STORAGE_KEY_GRID, next);
        onGridOrderChange?.(next);
      }
    },
    [gridOrder, onGridOrderChange]
  );

  return (
    <>
      {/* ─── DRAGGABLE FULL-WIDTH SECTIONS ─────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragEnd={handleFullDragEnd}
      >
        <SortableContext items={fullOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-8">
            {fullOrder.map((widgetId) => {
              if (widgetId === "motivation" && motivation) {
                return (
                  <SortableWidget
                    key={widgetId}
                    id={widgetId}
                    label={WIDGET_LABELS[widgetId]}
                  >
                    {(handle) => (
                      <div className="relative">
                        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover/dnd:opacity-100 transition-opacity">
                          {handle}
                        </div>
                        <MotivationWidget motivation={motivation} />
                      </div>
                    )}
                  </SortableWidget>
                );
              }

              if (widgetId === "quick-actions") {
                return (
                  <SortableWidget
                    key={widgetId}
                    id={widgetId}
                    label={WIDGET_LABELS[widgetId]}
                  >
                    {(handle) => (
                      <div className="relative">
                        <div className="absolute -top-3 right-0 z-20 opacity-0 group-hover/dnd:opacity-100 transition-opacity">
                          {handle}
                        </div>
                        <QuickActionsWidget />
                      </div>
                    )}
                  </SortableWidget>
                );
              }

              if (widgetId === "continue-study") {
                if (data?.continueLearning || loading) {
                  return (
                    <SortableWidget
                      key={widgetId}
                      id={widgetId}
                      label={WIDGET_LABELS[widgetId]}
                    >
                      {(handle) => (
                        <div className="relative">
                          <div className="absolute top-3 right-3 z-20 opacity-0 group-hover/dnd:opacity-100 transition-opacity">
                            {handle}
                          </div>
                          <ContinueStudyWidget data={data} loading={loading} />
                        </div>
                      )}
                    </SortableWidget>
                  );
                }
                return null;
              }

              if (
                widgetId === "referral-card" &&
                referralData &&
                referralData.settings?.is_enabled
              ) {
                return (
                  <SortableWidget
                    key={widgetId}
                    id={widgetId}
                    label={WIDGET_LABELS[widgetId]}
                  >
                    {(handle) => (
                      <div className="relative">
                        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover/dnd:opacity-100 transition-opacity">
                          {handle}
                        </div>
                        <ReferralCardWidget referralData={referralData} />
                      </div>
                    )}
                  </SortableWidget>
                );
              }

              return null;
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId && FULL_WIDTH_WIDGETS.includes(activeId as FullWidthId) ? (
            <WidgetDragGhost label={WIDGET_LABELS[activeId as string] ?? String(activeId)} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ─── DRAGGABLE GRID SECTIONS ────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragEnd={handleGridDragEnd}
      >
        <SortableContext items={gridOrder} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {gridOrder.map((widgetId) => {
              if (widgetId === "referrals-list") {
                return (
                  <SortableWidget
                    key={widgetId}
                    id={widgetId}
                    label={WIDGET_LABELS[widgetId]}
                  >
                    {(handle) => (
                      <ReferralsListWidget
                        referralHistory={referralHistory}
                        isLoading={isReferralHistoryLoading}
                        dragHandle={handle}
                      />
                    )}
                  </SortableWidget>
                );
              }

              if (widgetId === "your-progress") {
                return (
                  <SortableWidget
                    key={widgetId}
                    id={widgetId}
                    label={WIDGET_LABELS[widgetId]}
                  >
                    {(handle) => (
                      <YourProgressWidget
                        data={data}
                        loading={loading}
                        dragHandle={handle}
                      />
                    )}
                  </SortableWidget>
                );
              }

              if (widgetId === "upcoming-exams") {
                return (
                  <SortableWidget
                    key={widgetId}
                    id={widgetId}
                    label={WIDGET_LABELS[widgetId]}
                  >
                    {(handle) => (
                      <UpcomingExamsWidget
                        data={data}
                        loading={loading}
                        dragHandle={handle}
                      />
                    )}
                  </SortableWidget>
                );
              }

              return null;
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId && GRID_WIDGETS.includes(activeId as GridId) ? (
            <WidgetDragGhost label={WIDGET_LABELS[activeId as string] ?? String(activeId)} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
