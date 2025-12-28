"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  /** Callback when resize occurs, receives delta in pixels */
  onResize: (deltaX: number) => void;
  /** Callback when resize ends */
  onResizeEnd?: () => void;
  /** Reset handler for double-click */
  onReset?: () => void;
  /** Additional class names */
  className?: string;
}

export function ResizeHandle({
  onResize,
  onResizeEnd,
  onReset,
  className,
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
  }, []);

  const handleDoubleClick = useCallback(() => {
    onReset?.();
  }, [onReset]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onResize(deltaX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd?.();
    };

    // Add listeners to document to catch mouse events outside the handle
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Prevent text selection while dragging
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, onResize, onResizeEnd]);

  return (
    <div
      className={cn(
        "w-1 flex-shrink-0 cursor-col-resize transition-colors duration-150",
        "hover:bg-primary/30 active:bg-primary/50",
        "group relative",
        isDragging && "bg-primary/50",
        className,
      )}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title="Glisser pour redimensionner, double-clic pour réinitialiser"
    >
      {/* Visual indicator - dots in the middle */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-1 h-8 rounded-full",
          "bg-border group-hover:bg-primary/50 transition-colors",
          isDragging && "bg-primary",
        )}
      />
    </div>
  );
}
