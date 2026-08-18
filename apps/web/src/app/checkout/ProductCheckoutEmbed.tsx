"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./checkout.module.css";

const LIVE_CHECKOUT_ORIGIN = "https://live.yogawithethan.com";
const LOCAL_CHECKOUT_ORIGIN = "http://127.0.0.1:4174";

export function ProductCheckoutEmbed({ preview = false }: { preview?: boolean }) {
  const [height, setHeight] = useState(1280);
  const src = useMemo(() => {
    const origin = preview ? LOCAL_CHECKOUT_ORIGIN : LIVE_CHECKOUT_ORIGIN;
    const path = preview ? "/register.html" : "/register";
    return `${origin}${path}?product=iinb&review=1&embed=1`;
  }, [preview]);

  useEffect(() => {
    const expectedOrigin = preview ? LOCAL_CHECKOUT_ORIGIN : LIVE_CHECKOUT_ORIGIN;
    const hideHeader = () => {
      const header = document.querySelector<HTMLElement>("ywe-header");
      if (header) header.hidden = true;
    };
    hideHeader();
    const observer = new MutationObserver(hideHeader);
    observer.observe(document.body, { childList: true, subtree: true });
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin || event.data?.type !== "ywe-product-checkout-height") return;
      const nextHeight = Number(event.data.height);
      if (Number.isFinite(nextHeight)) setHeight(Math.max(720, Math.ceil(nextHeight)));
    };
    window.addEventListener("message", onMessage);
    return () => {
      observer.disconnect();
      window.removeEventListener("message", onMessage);
      const header = document.querySelector<HTMLElement>("ywe-header");
      if (header) header.hidden = false;
    };
  }, [preview]);

  return (
    <main className={styles.page}>
      <iframe
        className={styles.checkout}
        src={src}
        style={{ height }}
        title="Ignorance Is Not Bliss checkout"
        allow="payment *"
      />
    </main>
  );
}
