import { CheckCircle2 } from "lucide-react";

interface Step {
  id:    number;
  label: string;
  icon:  React.ElementType;
}

interface StepBarProps {
  steps:       Step[];
  currentStep: number;
}

export function StepBar({ steps, currentStep }: StepBarProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 right-5 left-5 h-0.5 bg-border -z-0" />
        <div
          className="absolute top-5 right-5 h-0.5 bg-teal-600 transition-all duration-500 -z-0"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            left: "auto",
          }}
        />
        {steps.map((s) => {
          const Icon   = s.icon;
          const done   = currentStep > s.id;
          const active = currentStep === s.id;
          return (
            <div key={s.id} className="flex flex-col items-center gap-2 z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                done   ? "bg-teal-600 border-teal-600 text-white" :
                active ? "bg-white border-teal-600 text-teal-600 shadow-md shadow-teal-100" :
                         "bg-background border-border text-muted-foreground"
              }`}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block text-center leading-tight max-w-[58px] ${
                active ? "text-teal-600" : done ? "text-teal-600/70" : "text-muted-foreground"
              }`}>{s.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 sm:hidden text-center">
        <span className="text-xs font-semibold text-teal-600">{steps[currentStep - 1]?.label}</span>
        <span className="text-xs text-muted-foreground mx-1">—</span>
        <span className="text-xs text-muted-foreground">
          الخطوة {currentStep} من {steps.length}
        </span>
      </div>
    </div>
  );
}
