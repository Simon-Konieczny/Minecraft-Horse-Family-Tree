import * as styles from "./Button.css";

interface ButtonProps {
  onClick?: () => void;
  text: string;
  className?: string;
  variant?: 'default' | 'danger';
}

export default function Button({ onClick, text, className, variant }: ButtonProps) {
  return (
    <button className={`${styles.Button} ${variant === 'danger' ? styles.danger : ''} ${className || ""}`} onClick={onClick}>
      {text}
    </button>
  );
}
