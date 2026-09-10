"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as styles from "./Sidebar.css";
import { useState, useEffect } from "react";
import HorseCreateModal from "@/components/Modals/HorseCreateModal/HorseCreateModal";
import { Horse } from "@/types/horse";
import Image from "next/image";
import { getHorseVariantImage } from "@/utils/variant";
import getHorsesByIdsAction from "@/actions/getHorsesByIdsAction";
import { getHorseFullName } from "@/utils/horseNames";
import updateBreedingSettingsAction from "@/actions/updateBreedingSettingsAction";
import Switch from "@/components/Common/Switch/Switch";

interface SidebarProps {
  fallbackHorses: Horse[];
  initialAllowCloseRelativeBreeding: boolean;
}

export default function Sidebar({ fallbackHorses, initialAllowCloseRelativeBreeding }: SidebarProps) {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recentViewed, setRecentViewed] = useState<Horse[]>([]);
  const [allowCloseRelativeBreeding, setAllowCloseRelativeBreeding] = useState(
    initialAllowCloseRelativeBreeding,
  );
  const [breedingError, setBreedingError] = useState<string | null>(null);

  useEffect(() => {
    const updateRecent = async () => {
      const stored = localStorage.getItem("recently-viewed-horses");
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        const viewedHorses = await getHorsesByIdsAction(ids);
        setRecentViewed(viewedHorses.slice(0, 5));
      } else {
        setRecentViewed(fallbackHorses);
      }
    };

    updateRecent();
    window.addEventListener("storage", updateRecent);
    return () => window.removeEventListener("storage", updateRecent);
  }, [fallbackHorses]);

  const navItems = [
    { label: "Dashboard", href: "/", icon: "📊" },
    { label: "Lineage Tree", href: "/horses", icon: "🌳" },
    { label: "Bloodlines", href: "/bloodlines", icon: "🧬" },
  ];

  const onBreedingToggle = async (blockCloseRelatives: boolean) => {
    const previous = allowCloseRelativeBreeding;
    setAllowCloseRelativeBreeding(!blockCloseRelatives);
    setBreedingError(null);
    try {
      await updateBreedingSettingsAction(!blockCloseRelatives);
    } catch (err) {
      setAllowCloseRelativeBreeding(previous);
      setBreedingError("Could not save breeding rule.");
      console.error(err);
    }
  };

  return (
    <>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoEmoji}>🐴</span> 
          <span className={styles.logoText}>HorseTree</span>
        </Link>

        <nav className={styles.nav}>
          <div className={styles.navSection}>
            <span className={styles.sectionLabel}>Navigation</span>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  pathname === item.href ? styles.navLinkActive : styles.navLink
                }
              >
                <span className={styles.navIcon}>{item.icon}</span> {item.label}
              </Link>
            ))}
          </div>

          <div className={styles.navSection}>
            <span className={styles.sectionLabel}>Recent Activity</span>
            <div className={styles.recentList}>
              {recentViewed.map((horse) => (
                <Link 
                  key={horse.id} 
                  href={`/horses/${horse.id}`} 
                  className={styles.recentItem}
                >
                  <div className={styles.recentImageContainer}>
                    <Image 
                      src={getHorseVariantImage(horse.variant)} 
                      alt={getHorseFullName(horse)} 
                      width={24} 
                      height={24}
                    />
                  </div>
                  <span className={styles.recentName}>{getHorseFullName(horse)}</span>
                </Link>
              ))}
              {recentViewed.length === 0 && (
                <div className={styles.recentItem} style={{ opacity: 0.5, pointerEvents: 'none' }}>
                  No recent activity
                </div>
              )}
            </div>
          </div>

          <div
            className={styles.navSection}
            title="When ON: blocks sibling, parent-child and shared-blood pairings within 3 generations."
          >
            <span className={styles.sectionLabel}>Breeding Rules</span>
            <Switch
              label="Block close-relative breeding"
              checked={!allowCloseRelativeBreeding}
              onChange={onBreedingToggle}
              labelLeft={false}
            />
            {breedingError && (
              <div style={{ opacity: 0.7, fontSize: 12 }}>{breedingError}</div>
            )}
          </div>
        </nav>

        <div className={styles.footer}>
          <button
            className={styles.createButton}
            onClick={() => setIsModalOpen(true)}
          >
            <span>+</span> New Horse
          </button>
        </div>
      </aside>

      <HorseCreateModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
      />
    </>
  );
}
