"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type SplashScreenProps = {
  children: React.ReactNode;
};

export function SplashScreen({ children }: SplashScreenProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Start exit animation after 2.5s, then hide after animation completes
    const exitTimer = setTimeout(() => setIsExiting(true), 2500);
    const hideTimer = setTimeout(() => setShowSplash(false), 3200);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="fixed inset-0 z-9999 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: "var(--background)" }}
            initial={{ opacity: 1 }}
            animate={{ opacity: isExiting ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          >
            {/* Themed mosque silhouette background */}
            <motion.div
              className="pointer-events-none absolute inset-0 splash-bg"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{
                opacity: isExiting ? 0 : 0.25,
                scale: isExiting ? 1.15 : 1,
                y: isExiting ? -20 : 0,
              }}
              transition={{ duration: isExiting ? 0.7 : 1.2, ease: "easeOut" }}
            />

            <motion.div
              className="relative flex flex-col items-center gap-4"
              initial={{ scale: 0.95, y: 10 }}
              animate={{
                opacity: isExiting ? 0 : 1,
                scale: isExiting ? 0.9 : 1,
                y: isExiting ? -20 : 0,
              }}
              transition={{
                duration: isExiting ? 0.5 : 0.6,
                ease: "easeOut",
                delay: isExiting ? 0 : 0.2,
              }}
            >
              <img
                src="/bismillah.svg"
                alt="Bismillah calligraphy"
                className="splash-logo h-auto w-[420px] max-w-[80vw] drop-shadow-lg"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show children with fade-in when splash is done */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showSplash ? 0 : 1 }}
        transition={{ duration: 0.5, delay: showSplash ? 0 : 0.1 }}
      >
        {children}
      </motion.div>
    </>
  );
}
