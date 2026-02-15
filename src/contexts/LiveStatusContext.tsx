import { createContext, useContext, ReactNode } from 'react';
import { useLiveStatus } from '@/hooks/useLiveStatus';

const LiveStatusContext = createContext<ReturnType<typeof useLiveStatus> | null>(null);

export const LiveStatusProvider = ({ children }: { children: ReactNode }) => {
  const liveStatus = useLiveStatus("masjidirshad");
  return (
    <LiveStatusContext.Provider value={liveStatus}>
      {children}
    </LiveStatusContext.Provider>
  );
};

export const useSharedLiveStatus = () => {
  const context = useContext(LiveStatusContext);
  if (!context) {
    throw new Error('useSharedLiveStatus must be used within LiveStatusProvider');
  }
  return context;
};
