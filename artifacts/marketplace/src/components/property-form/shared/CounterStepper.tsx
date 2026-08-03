import { Minus, Plus } from "lucide-react";

interface CounterStepperProps {
  label:    string;
  value:    string;
  onChange: (val: string) => void;
  min?:     number;
  max?:     number;
  icon?:    string;
}

/**
 * Airbnb-style stepper row: label on the right (RTL), − / value / + on the left.
 * Value "0" renders as "—" to indicate "not set".
 */
export function CounterStepper({
  label, value, onChange, min = 0, max = 50, icon,
}: CounterStepperProps) {
  const num = parseInt(value) || 0;

  const decrement = () => {
    if (num > min) onChange(String(num - 1));
  };

  const increment = () => {
    if (num < max) onChange(String(num + 1));
  };

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border/60 last:border-b-0">
      {/* Label */}
      <span className="text-sm font-medium text-foreground flex items-center gap-2">
        {icon && <span className="text-base leading-none">{icon}</span>}
        {label}
      </span>

      {/* Stepper control */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={decrement}
          disabled={num <= min}
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all
            ${num <= min
              ? "border-border/40 text-muted-foreground/40 cursor-not-allowed"
              : "border-border text-foreground hover:border-teal-500 hover:text-teal-600 active:scale-95"
            }`}
          aria-label={`تقليل ${label}`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span className={`w-8 text-center text-base font-semibold tabular-nums select-none
          ${num === 0 ? "text-muted-foreground/50" : "text-foreground"}`}
        >
          {num === 0 ? "—" : num}
        </span>

        <button
          type="button"
          onClick={increment}
          disabled={num >= max}
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all
            ${num >= max
              ? "border-border/40 text-muted-foreground/40 cursor-not-allowed"
              : "border-border text-foreground hover:border-teal-500 hover:text-teal-600 active:scale-95"
            }`}
          aria-label={`زيادة ${label}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
