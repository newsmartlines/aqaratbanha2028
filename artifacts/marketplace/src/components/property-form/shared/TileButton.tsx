import { CheckCircle2 } from "lucide-react";

interface TileButtonProps {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}

export function TileButton({ active, onClick, className = "", children }: TileButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-2xl border-2 transition-all text-right ${
        active
          ? "border-teal-600 bg-teal-50 shadow-sm"
          : "border-border hover:border-teal-300 hover:bg-secondary/40"
      } ${className}`}
    >
      {active && (
        <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center z-10">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </span>
      )}
      {children}
    </button>
  );
}
