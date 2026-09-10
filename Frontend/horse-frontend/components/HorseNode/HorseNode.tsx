import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Horse } from '@/types/horse';
import { translateStatsForDisplay } from '@/utils/translateRawStats';
import { getHorseVariantImage } from '@/utils/variant';
import { getHorseFullName } from '@/utils/horseNames';
import * as styles from './HorseNode.css';
import { CSSProperties } from 'react';
import Image from 'next/image';

export type HorseNodeData = {
  horse: Horse;
  label?: string;
  activeView?: 'speed' | 'jump' | 'health' | 'base';
  statusView?: boolean;
  compactView?: boolean;
};

// 2. Define the specialized Node type for this component
export type HorseNode = Node<HorseNodeData, 'horseNode'>;

function getContrastColor(hex: string): string {
  if (!hex || hex.length < 7) return '#ffffff';
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

function darkenColor(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  const r = Math.max(0, Math.floor(parseInt(hex.substring(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(parseInt(hex.substring(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.floor(parseInt(hex.substring(4, 6), 16) * (1 - amount)));
  
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function CustomHorseNode({ data }: NodeProps<HorseNode>) {
  const { horse, activeView, statusView, compactView } = data;
  const {jump, health, speed, variant} = horse;
  const processedStats = translateStatsForDisplay({jump, health, speed, variant})
  const dnaColor = horse.hexColor || '#444444';

  const isDead = horse.status === "Deceased";
  const useShade = statusView && isDead;

  // Calculate a darker version of the dnaColor for the background when dead
  // Restore the "color things" by using dnaColor as background even in modern view
  const backgroundColor = useShade ? darkenColor(dnaColor, 0.7) : dnaColor;
  const borderColor = useShade ? dnaColor : darkenColor(dnaColor, 0.2);
  const textColor = getContrastColor(backgroundColor);

  const containerStyle: CSSProperties = {
    backgroundColor: backgroundColor,
    borderColor: borderColor,
    borderStyle: 'solid',
    borderTopWidth: '2px',
    borderRightWidth: '2px',
    borderBottomWidth: '2px',
    borderLeftWidth: compactView ? '2px' : '6px',
  };

  const getDisplayStat = () => {
    switch (activeView) {
      case 'jump':
        return { label: 'Jump', value: `${processedStats.jump?.toFixed(2)}` };
      case 'health':
        return { label: 'HP', value: `${processedStats.health?.toFixed(2)}` };
      case 'speed':
      case 'base':
      default:
        return { label: 'Speed', value: `${processedStats.speed?.toFixed(2)}` };
    }
  };

  const display = getDisplayStat();
  const horseImage = getHorseVariantImage(horse.variant);

  if (compactView) {
    return (
      <div className={styles.nodeContainer} style={{ ...containerStyle, minWidth: '140px' }}>
        <Handle type="target" position={Position.Top} className={styles.handleStyle} />
        <div className={styles.contentWrapper} style={{ flexDirection: 'column', gap: '2px' }}>
          <div className={styles.horseName} style={{ color: textColor, fontSize: '13px' }}>
            {getHorseFullName(horse)}
          </div>
          <div className={styles.statText} style={{ color: textColor, opacity: 0.9 }}>
            {display.label}: {display.value}
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className={styles.handleStyle} />
      </div>
    );
  }

  return (
    <div className={styles.nodeContainer} style={containerStyle}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className={styles.handleStyle} 
      />

      <div className={styles.contentWrapper}>
        <div className={styles.imageContainer} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <Image 
            src={horseImage} 
            alt={getHorseFullName(horse)} 
            width={48} 
            height={48} 
            className={styles.horseImage}
          />
        </div>
        <div className={styles.textDetails}>
          <div className={styles.horseName} style={{ color: textColor }}>
            {getHorseFullName(horse)}
          </div>
          <div className={styles.statText} style={{ color: textColor, opacity: 0.8 }}>
            <span className={styles.statLabel} style={{ color: 'inherit' }}>{display.label}:</span>
            <span className={styles.statValue} style={{ color: 'inherit' }}>{display.value}</span>
          </div>
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className={styles.handleStyle} 
      />
    </div>
  );
}