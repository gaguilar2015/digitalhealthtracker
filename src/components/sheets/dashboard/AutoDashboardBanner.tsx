import { Sparkles } from 'lucide-react';

export function AutoDashboardBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg bg-teal-50 border border-teal-200">
      <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
      <p className="text-sm text-teal-700">
        Auto-generated from your data. Add or customize charts to make it yours.
      </p>
    </div>
  );
}
