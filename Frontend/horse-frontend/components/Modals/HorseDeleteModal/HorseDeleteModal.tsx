import Button from "@/components/Common/Button/Button";
import * as modalStyles from "../Modals.css";

interface HorseDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function HorseDeleteModal({ isOpen, onClose, onConfirm }: HorseDeleteModalProps) {
    if (!isOpen) return null;

    return(
        <div className={modalStyles.overlay}>
            <div className={modalStyles.modal}>
                <h2>Are you sure you want to delete this horse?</h2>
                <p>This action cannot be undone.</p>
                <div style={{display: "flex", justifyContent: "flex-end", gap: "10px"}}>
                    <Button onClick={onClose} text="Cancel" />
                    <Button onClick={onConfirm} text="Delete" variant="danger" />
                </div>
            </div>
        </div>
    )
}