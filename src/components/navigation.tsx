"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  Plus,
  GraduationCap,
  Settings,
  Moon,
  Sun,
  Download,
  Upload,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

const navItems = [
  { href: "/", label: "Library", icon: BookOpen },
  { href: "/dua/new", label: "Add Dua", icon: Plus },
  { href: "/practice", label: "Practice", icon: GraduationCap },
];

export function Navigation() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSettings]);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/duas/export");
      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `duavault-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data");
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        const response = await fetch("/api/duas/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          alert("Import successful! Refreshing...");
          window.location.reload();
        } else {
          const error = await response.json();
          alert(`Import failed: ${error.message}`);
        }
      } catch (error) {
        console.error("Import failed:", error);
        alert("Failed to import data. Make sure the file is valid JSON.");
      }
    };
    input.click();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">DuaVault</span>
          </Link>

          {/* Nav Items */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", duration: 0.5 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Settings */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>

            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-2 z-50"
              >
                {mounted && (
                  <button
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-secondary transition-colors text-sm"
                  >
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </button>
                )}
                <button
                  onClick={handleExport}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-secondary transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
                <button
                  onClick={handleImport}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-secondary transition-colors text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Import Data
                </button>
                <div className="my-2 border-t border-border" />
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-secondary transition-colors text-sm text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  Lock App
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-lg border-t border-border z-40 pb-safe">
        <div className="h-full flex items-center justify-around px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
                <item.icon className="relative w-6 h-6" />
                <span className="relative text-xs font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Mobile Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground"
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>

        {/* Mobile Settings Menu */}
        {showSettings && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl z-50 pb-safe"
            >
              <div className="p-4 space-y-2">
                <div className="w-12 h-1 bg-border rounded-full mx-auto mb-4" />
                {mounted && (
                  <button
                    onClick={() => {
                      setTheme(theme === "dark" ? "light" : "dark");
                      setShowSettings(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary rounded-xl transition-colors"
                  >
                    {theme === "dark" ? (
                      <Sun className="w-5 h-5" />
                    ) : (
                      <Moon className="w-5 h-5" />
                    )}
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </button>
                )}
                <button
                  onClick={() => {
                    handleExport();
                    setShowSettings(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary rounded-xl transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Export Data
                </button>
                <button
                  onClick={() => {
                    handleImport();
                    setShowSettings(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary rounded-xl transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  Import Data
                </button>
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary rounded-xl transition-colors text-destructive"
                  >
                    <LogOut className="w-5 h-5" />
                    Lock App
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </nav>
    </>
  );
}
