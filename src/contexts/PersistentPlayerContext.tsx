import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface PersistentPlayerContextType {
  isExpanded: boolean;
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
}

const PersistentPlayerContext = createContext<PersistentPlayerContextType | null>(null);

export const PersistentPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const setExpanded = useCallback((expanded: boolean) => {
    setIsExpanded(expanded);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <PersistentPlayerContext.Provider value={{ isExpanded, setExpanded, toggleExpanded }}>
      {children}
    </PersistentPlayerContext.Provider>
  );
};

export const usePersistentPlayer = () => {
  const context = useContext(PersistentPlayerContext);
  if (!context) {
    throw new Error("usePersistentPlayer must be used within PersistentPlayerProvider");
  }
  return context;
};
