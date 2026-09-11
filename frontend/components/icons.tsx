'use client';

import {
  Home,
  SquarePen,
  LogIn,
  UserPlus,
  ArrowRight,
  User,
  Search,
  Bell,
  Mail,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Image as ImageIcon,
  X,
  Compass,
  Check,
  TrendingUp,
  LogOut,
  Trees,
  Leaf,
  Globe,
  Settings,
  Flame,
  MessageSquare,
  Maximize2,
  Send,
  LucideProps,
} from 'lucide-react';

export type IconName =
  | 'home'
  | 'write'
  | 'login'
  | 'register'
  | 'spark'
  | 'arrow'
  | 'user'
  | 'search'
  | 'bell'
  | 'mail'
  | 'heart'
  | 'comment'
  | 'bookmark'
  | 'share'
  | 'image'
  | 'close'
  | 'compass'
  | 'check'
  | 'trending'
  | 'logout'
  | 'trees'
  | 'leaf'
  | 'globe'
  | 'settings'
  | 'flame'
  | 'message-square'
  | 'maximize'
  | 'send';

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 18, className = '', strokeWidth = 1.8 }: IconProps) {
  const iconMap: Record<IconName, React.ComponentType<LucideProps>> = {
    home: Home,
    write: SquarePen,
    login: LogIn,
    register: UserPlus,
    spark: Compass,
    arrow: ArrowRight,
    user: User,
    search: Search,
    bell: Bell,
    mail: Mail,
    heart: Heart,
    comment: MessageCircle,
    bookmark: Bookmark,
    share: Share2,
    image: ImageIcon,
    close: X,
    compass: Compass,
    check: Check,
    trending: TrendingUp,
    logout: LogOut,
    trees: Trees,
    leaf: Leaf,
    globe: Globe,
    settings: Settings,
    flame: Flame,
    'message-square': MessageSquare,
    maximize: Maximize2,
    send: Send,
  };

  const Component = iconMap[name] || SquarePen;
  return <Component size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}

export {
  Home,
  SquarePen,
  LogIn,
  UserPlus,
  ArrowRight,
  User,
  Search,
  Bell,
  Mail,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  ImageIcon,
  X,
  Compass,
  Check,
  TrendingUp,
  LogOut,
  Trees,
  Leaf,
  Globe,
  Settings,
  Flame,
  MessageSquare,
  Maximize2,
  Send,
};
