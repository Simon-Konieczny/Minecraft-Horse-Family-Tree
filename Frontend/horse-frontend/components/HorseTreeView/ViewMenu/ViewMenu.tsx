import { Dispatch, SetStateAction, useState } from "react";
import { ViewMode } from "../HorseTreeView";
import * as styles from "./ViewMenu.css";
import { setCookie } from "cookies-next";
import { useReactFlow } from "@xyflow/react";
import Button from "@/components/Common/Button/Button";
import Switch from "@/components/Common/Switch/Switch";

interface ViewMenuProps {
  setView: Dispatch<SetStateAction<ViewMode>>;
  view: ViewMode;
  statusView: boolean;
  setStatusView: Dispatch<SetStateAction<boolean>>;
  compactView: boolean;
  setCompactView: Dispatch<SetStateAction<boolean>>;
}

export default function ViewMenu({ 
  setView, 
  view, 
  statusView, 
  setStatusView,
  compactView,
  setCompactView
}: ViewMenuProps) {
  const { fitView } = useReactFlow();
  const [isOpen, setIsOpen] = useState(true);

  const toggleView = (mode: ViewMode) => {
    setView(mode);
    setCookie("horse-tree-view", mode, { maxAge: 60 * 60 * 24 * 30 }); // Save for 30 days

    setTimeout(() => fitView({ duration: 800 }), 50);
  };

  const handleStatusToggle = (checked: boolean) => {
    setStatusView(checked);
    setCookie("horse-status-view", checked ? "true" : "false", { maxAge: 60 * 60 * 24 * 30 });
  };

  const handleCompactToggle = (checked: boolean) => {
    setCompactView(checked);
    setCookie("horse-compact-view", checked ? "true" : "false", { maxAge: 60 * 60 * 24 * 30 });
  };

  return (
    <>
      <button 
        className={styles.toggleButton} 
        onClick={() => setIsOpen(true)}
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <span>⚙️</span> View Options
      </button>

      <div className={`${styles.menuWrapper} ${!isOpen ? styles.menuClosed : ''}`}>
        <div className={styles.menuHeader}>
          <p className={styles.menuLabel} style={{ marginBottom: 0 }}>Layout & View</p>
          <button className={styles.closeButton} onClick={() => setIsOpen(false)}>×</button>
        </div>

        <p className={styles.menuLabel} style={{ marginTop: "8px" }}>Layout Mode</p>

      <Button
        onClick={() => toggleView("base")}
        className={
          view === "base"
            ? styles.baseButtonActive
            : styles.baseButtonInactive
        }
        text="Traditional Lineage Tree"
      />

      <p className={styles.menuLabel} style={{ marginTop: "16px" }}>
        View Filters
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Switch 
          label="Classic Node Style" 
          checked={compactView} 
          onChange={handleCompactToggle} 
        />
        <Switch 
          label="Deceased Highlight" 
          checked={statusView} 
          onChange={handleStatusToggle} 
        />      </div>

      <p className={styles.menuLabel} style={{ marginTop: "8px" }}>
        Rank by Stat (Left to Right)
      </p>
      <div className={styles.statGrid}>
        {(["speed", "jump", "health"] as const).map((stat) => (
          <Button
            key={stat}
            onClick={() => toggleView(stat)}
            className={
              view === stat
                ? styles.statButtonActive
                : styles.statButtonInactive
            }
            text={stat}
          />
        ))}
      </div>

      <Button
        onClick={() => fitView({ duration: 800, padding: 0.2 })}
        className={styles.resetButton}
        text="🔍 Reset Zoom"
      />
    </div>
    </>
  );
}
