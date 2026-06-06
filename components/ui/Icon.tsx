import {
  Utensils,
  ShoppingCart,
  Bus,
  Beer,
  HeartPulse,
  Home,
  Plug,
  Shirt,
  GraduationCap,
  Repeat,
  Gift,
  MoreHorizontal,
  Banknote,
  Tag,
  Laptop,
  RotateCcw,
  Circle,
  Wallet,
  Landmark,
  Bitcoin,
  TrendingUp,
  CreditCard,
  PiggyBank,
  Coins,
  type LucideIcon,
} from "lucide-react";

// Mapa: clave guardada en la base (texto) -> componente de ícono.
const MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  bus: Bus,
  beer: Beer,
  "heart-pulse": HeartPulse,
  house: Home,
  plug: Plug,
  shirt: Shirt,
  "graduation-cap": GraduationCap,
  repeat: Repeat,
  gift: Gift,
  ellipsis: MoreHorizontal,
  banknote: Banknote,
  tag: Tag,
  laptop: Laptop,
  "rotate-ccw": RotateCcw,
  circle: Circle,
  wallet: Wallet,
  landmark: Landmark,
  bitcoin: Bitcoin,
  "trending-up": TrendingUp,
  "credit-card": CreditCard,
  "piggy-bank": PiggyBank,
  coins: Coins,
};

export function Icon({
  name,
  className,
  strokeWidth = 2,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Cmp = MAP[name] ?? Circle;
  return <Cmp className={className} strokeWidth={strokeWidth} />;
}
