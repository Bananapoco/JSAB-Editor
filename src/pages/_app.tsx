import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { buildCSSVars } from "@/styles/theme";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* Inject all theme colors as CSS custom properties so every
          component can reference var(--color-*) in class strings */}
      <style>{`:root { ${buildCSSVars()} }`}</style>
      <Component {...pageProps} />
    </>
  );
}
