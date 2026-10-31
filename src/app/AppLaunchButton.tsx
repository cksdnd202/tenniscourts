"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { getAppDestination } from "@/lib/appLaunch";
import { capturePostHogEvent } from "@/lib/posthogClient";
import { AppLaunchPanel } from "./AppLaunchPanel";
import styles from "./AppLaunchPanel.module.css";

export function AppLaunchButton({ className, source }: { className: string; source: string }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const [destination, setDestination] = useState("/");
  return (
    <>
      <button type="button" className={className} onClick={() => {
        const path = getAppDestination(pathname);
        setDestination(path);
        setOpened(true);
        capturePostHogEvent("app_handoff_opened", { destination: path, source });
      }}>앱에서 열기</button>
      {opened && createPortal(
        <dialog ref={(node) => { dialog.current = node; if (node && !node.open) node.showModal(); }} className={styles.dialog}
          aria-label="앱 연결 안내" onClose={() => setOpened(false)}
          onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
          <button type="button" className={styles.close} aria-label="앱 연결 안내 닫기" onClick={() => dialog.current?.close()}>×</button>
          <AppLaunchPanel path={destination} onContinue={() => dialog.current?.close()} />
        </dialog>, document.body
      )}
    </>
  );
}
