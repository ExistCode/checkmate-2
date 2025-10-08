"use client";

import { SearchCheck, Newspaper, Menu, Sun, Moon, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "next-themes";
import { GlobalTranslationToggle, MobileGlobalTranslationToggle } from "@/components/global-translation-toggle";
import { useGlobalTranslation } from "@/components/global-translation-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/lib/better-auth-client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import React from "react";
import { useDiagramExpansion } from "@/lib/hooks/useDiagramExpansion";
import { useAuth } from "@/lib/hooks/use-auth";

export function Header() {
  const pathname = usePathname();
  const { t } = useGlobalTranslation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { isExpanded } = useDiagramExpansion();

  // Inline LanguageToggle for mobile
  const MobileLanguageToggle = () => {
    const { language, setLanguage, t } = useGlobalTranslation();
    const languages = [
      { code: "en" as const, label: t.english, flag: "🇺🇸" },
      { code: "ms" as const, label: t.malay, flag: "🇲🇾" },
      { code: "zh" as const, label: t.chinese, flag: "🇨🇳" },
    ];
    return (
      <div className="w-full">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          asChild
        >
          <div>
            <span className="inline-block mr-2 align-middle">🌐</span>
            <span className="align-middle mr-2">{t.language}</span>
            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as "en" | "ms" | "zh")
              }
              className="ml-2 bg-transparent outline-none border-none text-primary"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>
        </Button>
      </div>
    );
  };

  // Inline ThemeToggle for mobile
  const MobileThemeToggle = () => {
    const { theme, setTheme } = useTheme();
    const { t } = useGlobalTranslation();
    const [mounted, setMounted] = React.useState(false);

    // Prevent hydration mismatch by only rendering after mount
    React.useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted) {
      // Return a placeholder that matches the button structure but without theme-dependent content
      return (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          disabled
        >
          <span className="inline-flex items-center">
            <div className="h-4 w-4 mr-2" />
            {t.toggleTheme}
          </span>
        </Button>
      );
    }

    const nextTheme = theme === "dark" ? "light" : "dark";
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start"
        onClick={() => setTheme(nextTheme)}
      >
        {theme === "dark" ? (
          <span className="inline-flex items-center">
            <Sun className="h-4 w-4 mr-2" />
            {t.toggleTheme}
          </span>
        ) : (
          <span className="inline-flex items-center">
            <Moon className="h-4 w-4 mr-2" />
            {t.toggleTheme}
          </span>
        )}
      </Button>
    );
  };

  // Controls to show in both desktop and mobile menu
  // Accepts optional closeMenu function for mobile
  const Controls = ({
    closeMenu,
    mobile,
  }: { closeMenu?: () => void; mobile?: boolean } = {}) => (
    <>
      {pathname !== "/news" && (
        <Button
          variant="outline"
          size="sm"
          className={
            mobile ? "w-full justify-start cursor-pointer" : "cursor-pointer"
          }
          asChild
        >
          <Link href="/news" className="inline-flex items-center">
            <Newspaper className="h-4 w-4 mr-2" />
            {t.getNews}
          </Link>
        </Button>
      )}
      {pathname !== "/crowdsource" && (
        <Button
          variant="outline"
          size="sm"
          className={
            mobile ? "w-full justify-start cursor-pointer" : "cursor-pointer"
          }
          asChild
        >
          <Link href="/crowdsource" className="inline-flex items-center">
            <Users className="h-4 w-4 mr-2" />
            {t.voteOnNews}
          </Link>
        </Button>
      )}
      {mobile ? (
        <>
          <MobileGlobalTranslationToggle />
          <MobileThemeToggle />
        </>
      ) : (
        <>
          <GlobalTranslationToggle />
          <ThemeToggle />
        </>
      )}
      <AuthButtons onClickDone={closeMenu} mobile={mobile} />
    </>
  );

  return (
    <header className={`border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 transition-all duration-400 ${isExpanded ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'}`}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <SearchCheck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Checkmate</span>
          </Link>
          {/* Desktop controls */}
          <div className="hidden sm:flex items-center gap-3">
            <Controls />
            {/* Show signed-in email on desktop */}
            <SignedInEmailBadge />
          </div>
          {/* Mobile menu */}
          <div className="sm:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex flex-col gap-4 w-56 pt-8"
              >
                <Controls closeMenu={() => setMenuOpen(false)} mobile />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

function AuthButtons({
  onClickDone,
  mobile,
}: {
  onClickDone?: () => void;
  mobile?: boolean;
}) {
  const { t } = useGlobalTranslation();
  const { user, signOut: authSignOut } = useAuth();

  const goSignOut = async () => {
    await signOut();
    await authSignOut();
    onClickDone?.();
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" className=" justify-start" asChild>
          <Link href="/sign-in">{t.signIn}</Link>
        </Button>
      </div>
    );
  }

  return mobile ? (
    <div className="w-full flex items-center justify-between">
      <span className="truncate max-w-[10rem]">{user.email || t.checkmate}</span>
      <Button variant="outline" size="sm" onClick={goSignOut} className="ml-2">
        Sign out
      </Button>
    </div>
  ) : (
    <Button variant="outline" size="sm" onClick={goSignOut}>
      Sign out
    </Button>
  );
}

function SignedInEmailBadge() {
  const { user } = useAuth();
  if (!user?.email) return null;
  return (
    <span className="text-sm text-muted-foreground truncate max-w-[16rem]">
      {user.email}
    </span>
  );
}
