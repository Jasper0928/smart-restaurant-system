import React, { createContext, useContext, useEffect, useState } from "react";

// @ts-ignore
const getLiff = () => (typeof window !== "undefined" ? window.liff : null);

interface LiffContextType {
  liff: any;
  liffError: string | null;
  isReady: boolean;
  isLoggedIn: boolean;
  profile: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  } | null;
  login: () => void;
  logout: () => void;
}

const LiffContext = createContext<LiffContextType | undefined>(undefined);

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [liffObject, setLiffObject] = useState<any>(null);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<LiffContextType["profile"]>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = getLiff();
        if (!liff) {
          console.warn("LIFF SDK not loaded from window");
          setIsReady(true);
          return;
        }

        const liffId = import.meta.env.VITE_LIFF_ID || "1655754910-mockliffid";

        await liff.init({ liffId });
        setLiffObject(liff);
        setIsReady(true);

        if (liff.isLoggedIn()) {
          setIsLoggedIn(true);
          const userProfile = await liff.getProfile();
          setProfile({
            userId: userProfile.userId,
            displayName: userProfile.displayName,
            pictureUrl: userProfile.pictureUrl,
          });
        }
      } catch (err: any) {
        console.error("LIFF init failed", err);
        setLiffError(err.message || "Failed to initialize LIFF");
        setIsReady(true); // Still mark as ready so app can fallback
      }
    };

    // Give the CDN a tiny bit of time to load just in case
    setTimeout(initLiff, 100);
  }, []);

  const login = () => {
    if (liffObject && !liffObject.isLoggedIn()) {
      liffObject.login();
    }
  };

  const logout = () => {
    if (liffObject && liffObject.isLoggedIn()) {
      liffObject.logout();
      setIsLoggedIn(false);
      setProfile(null);
    }
  };

  return (
    <LiffContext.Provider
      value={{
        liff: liffObject,
        liffError,
        isReady,
        isLoggedIn,
        profile,
        login,
        logout,
      }}
    >
      {children}
    </LiffContext.Provider>
  );
}

export function useLiff() {
  const context = useContext(LiffContext);
  if (context === undefined) {
    throw new Error("useLiff must be used within a LiffProvider");
  }
  return context;
}
