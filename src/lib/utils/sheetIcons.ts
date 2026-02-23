import {
  Table2,
  List,
  CheckSquare,
  Target,
  BarChart3,
  TrendingUp,
  Database,
  Layers,
  Calendar,
  Clock,
  Users,
  FileText,
  ClipboardList,
  Star,
  Heart,
  Flag,
  Briefcase,
  DollarSign,
  MapPin,
  Activity,
  AlertCircle,
  BookOpen,
  Settings,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const SHEET_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: 'Table2', icon: Table2 },
  { name: 'List', icon: List },
  { name: 'CheckSquare', icon: CheckSquare },
  { name: 'ClipboardList', icon: ClipboardList },
  { name: 'Target', icon: Target },
  { name: 'BarChart3', icon: BarChart3 },
  { name: 'TrendingUp', icon: TrendingUp },
  { name: 'Database', icon: Database },
  { name: 'Layers', icon: Layers },
  { name: 'Calendar', icon: Calendar },
  { name: 'Clock', icon: Clock },
  { name: 'Users', icon: Users },
  { name: 'FileText', icon: FileText },
  { name: 'Star', icon: Star },
  { name: 'Heart', icon: Heart },
  { name: 'Flag', icon: Flag },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'DollarSign', icon: DollarSign },
  { name: 'MapPin', icon: MapPin },
  { name: 'Activity', icon: Activity },
  { name: 'AlertCircle', icon: AlertCircle },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Settings', icon: Settings },
  { name: 'Zap', icon: Zap },
];

const iconMap = new Map(SHEET_ICONS.map(i => [i.name, i.icon]));

export function getSheetIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Table2;
  return iconMap.get(name) ?? Table2;
}
