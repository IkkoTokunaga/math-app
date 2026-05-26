"use client";

import type { Operation } from "@/lib/operations";

type OperationTabsPanelProps = {
  operation: Operation;
  onSelectOperation: (operation: Operation) => void;
  children: React.ReactNode;
  tabPanelId?: string;
};

export function OperationTabsPanel({
  operation,
  onSelectOperation,
  children,
  tabPanelId = "operation-tabpanel",
}: OperationTabsPanelProps) {
  return (
    <div className="play-board operation-tabs">
      <div className="operation-tabs__list" role="tablist" aria-label="演算を選ぶ">
        <button
          type="button"
          role="tab"
          id="operation-tab-addition"
          aria-selected={operation === "addition"}
          aria-controls={tabPanelId}
          onClick={() => onSelectOperation("addition")}
          className={`operation-tabs__tab ${operation === "addition" ? "operation-tabs__tab--active" : ""}`}
        >
          足し算
        </button>
        <button
          type="button"
          role="tab"
          id="operation-tab-subtraction"
          aria-selected={operation === "subtraction"}
          aria-controls={tabPanelId}
          onClick={() => onSelectOperation("subtraction")}
          className={`operation-tabs__tab ${operation === "subtraction" ? "operation-tabs__tab--active" : ""}`}
        >
          引き算
        </button>
      </div>
      <div
        id={tabPanelId}
        role="tabpanel"
        aria-labelledby={
          operation === "addition" ? "operation-tab-addition" : "operation-tab-subtraction"
        }
        className="operation-tabs__panel"
      >
        {children}
      </div>
    </div>
  );
}
