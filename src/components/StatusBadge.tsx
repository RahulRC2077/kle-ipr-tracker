import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getVariant = (status: string) => {
    const normalized = status.toLowerCase();
    
    if (normalized.includes('granted')) {
      return 'bg-success text-success-foreground';
    }
    if (normalized.includes('examination') || normalized.includes('ae')) {
      return 'bg-primary text-primary-foreground';
    }
    if (normalized.includes('filed') || normalized.includes('published')) {
      return 'bg-accent text-accent-foreground';
    }
    if (normalized.includes('abandoned') || normalized.includes('ceased') || 
        normalized.includes('withdrawn') || normalized.includes('expired')) {
      return 'bg-danger text-danger-foreground';
    }
    if (normalized.includes('renewal')) {
      return 'bg-warning text-warning-foreground';
    }
    
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Badge className={cn(getVariant(status), className)}>
      {status}
    </Badge>
  );
}
