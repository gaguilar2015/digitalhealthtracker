interface KpiStatWidgetProps {
  value: number;
  label: string;
  title: string;
}

export function KpiStatWidget({ value, label, title }: KpiStatWidgetProps) {
  const formatted = Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-4xl font-bold text-gray-900">{formatted}</p>
      <p className="text-xs text-gray-400">{label}</p>
      <div
        className="mt-2 h-1.5 w-24 rounded-full"
        style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf)' }}
      />
    </div>
  );
}
