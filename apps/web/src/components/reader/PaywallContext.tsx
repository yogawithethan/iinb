"use client";

import { createContext, useContext, type ReactNode } from "react";

type Ctx = { openPaywall: () => void };

const PaywallCtx = createContext<Ctx | null>(null);

export function PaywallProvider({
  value,
  children,
}: {
  value: Ctx;
  children: ReactNode;
}) {
  return <PaywallCtx.Provider value={value}>{children}</PaywallCtx.Provider>;
}

export function usePaywall(): Ctx | null {
  return useContext(PaywallCtx);
}
