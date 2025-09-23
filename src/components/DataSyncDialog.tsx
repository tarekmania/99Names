import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Cloud, Smartphone, ArrowUpDown } from 'lucide-react';
import { 
  migrateLocalDataToCloud, 
  syncCloudDataToLocal, 
  hasCloudData, 
  hasLocalData,
  type MigrationResult 
} from '@/utils/dataMigration';

interface DataSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type SyncStep = 'checking' | 'choosing' | 'syncing' | 'complete' | 'error';
type SyncDirection = 'upload' | 'download' | 'merge';

export function DataSyncDialog({ isOpen, onClose, onComplete }: DataSyncDialogProps) {
  const [step, setStep] = useState<SyncStep>('checking');
  const [syncDirection, setSyncDirection] = useState<SyncDirection>('upload');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [hasLocal, setHasLocal] = useState(false);
  const [hasCloud, setHasCloud] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkDataStatus();
    }
  }, [isOpen]);

  const checkDataStatus = async () => {
    setStep('checking');
    setProgress(20);
    
    try {
      const [localData, cloudData] = await Promise.all([
        hasLocalData(),
        hasCloudData()
      ]);
      
      setHasLocal(localData);
      setHasCloud(cloudData);
      setProgress(100);
      
      // Determine next step based on data presence
      if (!localData && !cloudData) {
        // No data anywhere, just close
        onComplete();
        return;
      } else if (localData && !cloudData) {
        // Only local data, suggest upload
        setSyncDirection('upload');
        setStep('choosing');
      } else if (!localData && cloudData) {
        // Only cloud data, suggest download
        setSyncDirection('download');
        setStep('choosing');
      } else {
        // Both have data, let user choose
        setSyncDirection('merge');
        setStep('choosing');
      }
    } catch (err) {
      setError(`Failed to check data status: ${err}`);
      setStep('error');
    }
  };

  const performSync = async () => {
    setStep('syncing');
    setProgress(0);
    setError(null);

    try {
      let migrationResult: MigrationResult;

      if (syncDirection === 'upload') {
        setProgress(25);
        migrationResult = await migrateLocalDataToCloud();
      } else if (syncDirection === 'download') {
        setProgress(25);
        migrationResult = await syncCloudDataToLocal();
      } else {
        // Merge: upload local data first, then download any missing cloud data
        setProgress(10);
        const uploadResult = await migrateLocalDataToCloud();
        setProgress(60);
        const downloadResult = await syncCloudDataToLocal();
        setProgress(90);
        
        migrationResult = {
          success: uploadResult.success && downloadResult.success,
          gameResults: uploadResult.gameResults + downloadResult.gameResults,
          dailyResults: uploadResult.dailyResults + downloadResult.dailyResults,
          spacedRepetitionItems: uploadResult.spacedRepetitionItems + downloadResult.spacedRepetitionItems,
          errors: [...uploadResult.errors, ...downloadResult.errors]
        };
      }

      setProgress(100);
      setResult(migrationResult);
      
      if (migrationResult.success) {
        setStep('complete');
      } else {
        setError(migrationResult.errors.join(', '));
        setStep('error');
      }
    } catch (err) {
      setError(`Sync failed: ${err}`);
      setStep('error');
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const getSyncDescription = () => {
    switch (syncDirection) {
      case 'upload':
        return 'Upload your local progress to the cloud for cross-device access';
      case 'download':
        return 'Download your cloud progress to this device';
      case 'merge':
        return 'Merge local and cloud data for complete synchronization';
      default:
        return '';
    }
  };

  const getSyncIcon = () => {
    switch (syncDirection) {
      case 'upload':
        return <Cloud className="w-6 h-6" />;
      case 'download':
        return <Smartphone className="w-6 h-6" />;
      case 'merge':
        return <ArrowUpDown className="w-6 h-6" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getSyncIcon()}
            Data Synchronization
          </DialogTitle>
          <DialogDescription>
            {step === 'checking' && 'Checking your data across devices...'}
            {step === 'choosing' && 'Choose how to sync your progress'}
            {step === 'syncing' && 'Synchronizing your data...'}
            {step === 'complete' && 'Synchronization complete!'}
            {step === 'error' && 'Synchronization failed'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'checking' && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Analyzing your data...
              </p>
            </div>
          )}

          {step === 'choosing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 border rounded-lg">
                  <Smartphone className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="font-medium">Local Device</div>
                  <div className="text-muted-foreground">
                    {hasLocal ? 'Has progress data' : 'No data'}
                  </div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <Cloud className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="font-medium">Cloud Storage</div>
                  <div className="text-muted-foreground">
                    {hasCloud ? 'Has progress data' : 'No data'}
                  </div>
                </div>
              </div>

              {hasLocal && hasCloud && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sync Options:</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="syncDirection"
                        value="merge"
                        checked={syncDirection === 'merge'}
                        onChange={(e) => setSyncDirection(e.target.value as SyncDirection)}
                      />
                      <span>Merge both (recommended)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="syncDirection"
                        value="upload"
                        checked={syncDirection === 'upload'}
                        onChange={(e) => setSyncDirection(e.target.value as SyncDirection)}
                      />
                      <span>Use local data only</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="syncDirection"
                        value="download"
                        checked={syncDirection === 'download'}
                        onChange={(e) => setSyncDirection(e.target.value as SyncDirection)}
                      />
                      <span>Use cloud data only</span>
                    </label>
                  </div>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {getSyncDescription()}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 'syncing' && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {progress < 50 ? 'Preparing data...' : 'Synchronizing...'}
              </p>
            </div>
          )}

          {step === 'complete' && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Sync completed successfully!</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-medium">{result.gameResults}</div>
                  <div className="text-muted-foreground">Game Results</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-medium">{result.dailyResults}</div>
                  <div className="text-muted-foreground">Daily Results</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-medium">{result.spacedRepetitionItems}</div>
                  <div className="text-muted-foreground">Learning Items</div>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your progress is now synced across all your devices!
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {step === 'choosing' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Skip for now
              </Button>
              <Button onClick={performSync}>
                Start Sync
              </Button>
            </>
          )}
          
          {(step === 'complete' || step === 'error') && (
            <Button onClick={handleComplete}>
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
