import Button from "@/components/Common/Button/Button";
import * as modalStyles from "../Modals.css";
import * as styles from "./HorseCreateModal.css";
import CreateHorseForm from "./CreateHorseForm/CreateHorseForm";
import { Horse, HorseStatus } from "@/types/horse";
import { useState, useEffect } from "react";
import createHorseAction from "@/actions/createHorseAction";
import getAllHorsesAction from "@/actions/getAllHorsesAction";
import { useRouter } from "next/navigation";

interface HorseCreateModalProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

export interface createHorseData {
  firstName: string;
  familyName: string;
  parentId1: string;
  parentId2: string;
  status: HorseStatus;
  speed: number;
  health: number;
  jump: number;
  variant: number;
}
export default function HorseCreateModal({
  isOpen,
  setIsOpen,
}: HorseCreateModalProps) {
  const router = useRouter();

  const [horses, setHorses] = useState<Horse[]>([]);
  const [formData, setFormData] = useState<createHorseData>({
    firstName: "",
    familyName: "",
    parentId1: "",
    parentId2: "",
    status: "Alive",
    speed: 0,
    health: 0,
    jump: 0,
    variant: 1,
  });
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("An Error Occured");

  useEffect(() => {
    if (isOpen) {
      const fetchHorses = async () => {
        const data = await getAllHorsesAction();
        setHorses(data);
      };
      fetchHorses();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onClose = () => {
    setIsOpen(false);
  };

  const onCreate = async () => {
    try {
      if (!formData.firstName?.trim()) {
        setErrorMessage("First name is required.");
        setError(true);
        return;
      }

      const newHorse = await createHorseAction(formData);
      if (!newHorse?.id) {
        setErrorMessage("Horse was not saved. Is MongoDB running?");
        setError(true);
        return;
      }

      setError(false);

      // Update local storage for recent activity
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("recently-viewed-horses");
        let viewed: string[] = stored ? JSON.parse(stored) : [];
        viewed = viewed.filter(id => id !== newHorse.id);
        viewed.unshift(newHorse.id);
        localStorage.setItem("recently-viewed-horses", JSON.stringify(viewed.slice(0, 10)));
        window.dispatchEvent(new Event("storage"));
      }

      setIsOpen(false);
      router.refresh();
      router.push("/horses");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An Error Occured");
      setError(true);
      console.error(err);
    }
  };

  return (
    <div className={modalStyles.overlay}>
      <div className={modalStyles.modal}>
        <h2>Create New Horse</h2>
        <CreateHorseForm
          horses={horses}
          setError={setError}
          formData={formData}
          setFormData={setFormData}
        />
        <div className={styles.buttonRow}>
          <Button text="Close" onClick={onClose} />
          <Button text="Create" onClick={onCreate} />
        </div>
        {error && <div>{errorMessage}</div>}
      </div>
    </div>
  );
}
