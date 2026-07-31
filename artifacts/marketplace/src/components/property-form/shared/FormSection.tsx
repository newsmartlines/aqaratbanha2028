interface FormSectionProps {
  title:    string;
  children: React.ReactNode;
  required?: boolean;
}

export function FormSection({ title, children, required }: FormSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 bg-gray-50/60">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-1.5">
          {title}
          {required && <span className="text-red-500 text-sm">*</span>}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
