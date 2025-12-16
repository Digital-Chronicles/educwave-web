import { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  onClick: () => void;
  label: string;
  icon: LucideIcon;
  color: 'gray' | 'green' | 'purple' | 'blue' | 'orange';
  compact?: boolean;
}

export function ActionButton({ onClick, label, icon: Icon, color, compact = false }: ActionButtonProps) {
  const colors = {
    gray: 'bg-gray-900 hover:bg-gray-800',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
  }[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${colors} text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
        compact ? 'px-4 py-2.5 text-sm' : 'px-5 py-3 font-medium'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}