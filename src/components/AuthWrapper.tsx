import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DataSyncDialog } from '@/components/DataSyncDialog';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, loading } = useAuth();
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [hasShownSyncDialog, setHasShownSyncDialog] = useState(false);

  useEffect(() => {
    // Show sync dialog when user first logs in (and we haven't shown it yet)
    if (user && !loading && !hasShownSyncDialog) {
      setShowSyncDialog(true);
      setHasShownSyncDialog(true);
    }
  }, [user, loading, hasShownSyncDialog]);

  const handleSyncComplete = () => {
    setShowSyncDialog(false);
  };

  const handleSyncClose = () => {
    setShowSyncDialog(false);
  };

  return (
    <>
      {children}
      <DataSyncDialog
        isOpen={showSyncDialog}
        onClose={handleSyncClose}
        onComplete={handleSyncComplete}
      />
    </>
  );
}
