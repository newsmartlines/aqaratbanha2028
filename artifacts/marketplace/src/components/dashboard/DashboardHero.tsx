/**
 * DashboardHero — Shared hero banner for the dashboard overview page.
 *
 * ONE component tree used by both "user" and "provider" roles.
 * Structural changes (layout, spacing, avatar size) affect all roles at once.
 * Role-specific differences (gradient, subtitle, extra CTA) are handled via props.
 */

import { Link } from "wouter";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mediaUrl } from "@/lib/api";

interface DashboardHeroProps {
  isProvider: boolean;
  name?: string | null;
  avatar?: string | null;
}

export function DashboardHero({ isProvider, name, avatar }: DashboardHeroProps) {
  const displayName = name ?? (isProvider ? "الشركة العقارية" : "المستخدم");
  const seed = encodeURIComponent(displayName);
  const avatarSrc = avatar
    ? mediaUrl(avatar)
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  const gradientStyle = isProvider
    ? { background: "linear-gradient(135deg, #0f4c75 0%, #1b6ca8 60%, #12B5D0 100%)" }
    : undefined;
  const gradientClass = !isProvider ? "bg-gradient-to-l from-teal-700 to-[#0a1628]" : "";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-lg ${gradientClass}`}
      style={gradientStyle}
    >
      {/* Decorative background circles — shared structure */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-6 right-10 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute top-4 left-8 w-24 h-24 rounded-full border-4 border-white/10" />
      </div>

      {/* Main content row — same flex layout for both roles */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5">

        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <div
            className={`shrink-0 overflow-hidden border-2 border-white/25 shadow-md ${
              isProvider ? "w-14 h-14 rounded-2xl" : "w-14 h-14 rounded-full"
            }`}
          >
            <img
              src={avatarSrc}
              alt={displayName}
              className="w-full h-full object-cover bg-white/10"
            />
          </div>

          <div>
            <p className="text-white/70 text-sm font-medium">
              {isProvider ? "مرحباً بعودتك 👋" : "مرحباً،"}
            </p>
            <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">
              {displayName}
            </h2>
            <p className="text-white/60 text-xs mt-0.5">
              {isProvider
                ? "لوحة تحكم المعلن العقاري"
                : "ابحث عن عقار أحلامك أو أعلن عن عقارك بسهولة"}
            </p>
          </div>
        </div>

        {/* CTAs — user gets an extra "Browse" button */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isProvider && (
            <Link href="/properties">
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent rounded-xl gap-2 text-sm"
              >
                <Search className="w-4 h-4" />
                تصفح العقارات
              </Button>
            </Link>
          )}
          <Link href="/add-property">
            <Button className="bg-white text-teal-700 hover:bg-white/95 rounded-xl gap-2 text-sm font-bold shadow-lg shadow-black/15 transition-all hover:scale-105 active:scale-100">
              <Plus className="w-4 h-4" />
              أضف عقارك
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
