import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DivineName } from '@/data/names';
import { useSettings } from '@/hooks/useSettings';
import { CheckCircle2, Circle } from 'lucide-react';

interface NameCardProps {
  name: DivineName;
  isFound?: boolean;
  showProgress?: boolean;
  onClick?: () => void;
  className?: string;
}

export function NameCard({ 
  name, 
  isFound = false, 
  showProgress = false,
  onClick,
  className = ""
}: NameCardProps) {
  const { settings } = useSettings();

  return (
    <Card 
      className={`
        transition-all duration-300 hover:shadow-medium cursor-pointer
        ${isFound ? 'bg-success/10 border-success' : 'hover:shadow-soft'}
        ${className}
      `}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {settings.showArabic && (
              <div className="text-right mb-2">
                <p className="text-xl font-bold text-primary font-arabic">
                  {name.arabic}
                </p>
              </div>
            )}
            
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {name.englishName}
            </h3>
            
            {settings.showMeaning && name.meanings && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {name.meanings}
              </p>
            )}
          </div>
          
          {showProgress && (
            <div className="ml-3 flex-shrink-0">
              {isFound ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Badge 
            variant="secondary" 
            className="text-xs font-medium"
          >
            #{name.id}
          </Badge>
          
          {name.aliases && name.aliases.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Also: {name.aliases.slice(0, 2).join(', ')}
              {name.aliases.length > 2 && '...'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}