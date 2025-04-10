import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StepIndicatorProps {
  label: string;
  active: boolean;
  completed: boolean;
  icon: React.ReactElement<LucideIcon>;
  onClick?: () => void; // Optionnel pour rendre le step cliquable
  ariaLabel?: string; // Accessibilité
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  label,
  active,
  completed,
  icon,
  onClick,
  ariaLabel
}) => {
  return (
    <button
      className={`flex items-center space-x-2 ${
        active ? 'text-blue-600 font-semibold' : 'text-gray-600'
      } ${completed ? 'opacity-75' : ''} ${onClick ? 'cursor-pointer hover:text-blue-800' : 'cursor-default'}`}
      onClick={onClick}
      disabled={!onClick}
      aria-label={ariaLabel || `${label} step, ${active ? 'active' : completed ? 'completed' : 'pending'}`}
    >
      <span
        className={`w-8 h-8 flex items-center justify-center rounded-full ${
          completed
            ? 'bg-green-100 text-green-600'
            : active
            ? 'bg-blue-100 text-blue-600'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        {completed ? '✓' : icon}
      </span>
      <span className="hidden md:block text-sm whitespace-nowrap">{label}</span>
    </button>
  );
};