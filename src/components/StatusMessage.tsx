import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusMessageProps {
  type: 'success' | 'error' | 'warning' | null;
  message: string;
  onClear: () => void;
}

export function StatusMessage({ type, message, onClear }: StatusMessageProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (type && message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClear, 300); // Allow fade out animation
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [type, message, onClear]);

  if (!type || !message) return null;

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
  };

  const Icon = icons[type];

  return (
    <div
      className={cn(
        "flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-all duration-300 mt-2",
        "text-sm font-medium",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
        type === 'success' && "bg-success/10 text-success border border-success/20",
        type === 'error' && "bg-destructive/10 text-destructive border border-destructive/20",
        type === 'warning' && "bg-warning/10 text-warning border border-warning/20"
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
}