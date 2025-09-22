import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, Check, Wifi, WifiOff } from 'lucide-react';
import { getSyncQueue, SyncStatus } from '../services/syncQueue';
import { dataSyncService } from '../services/dataSync';

export const SyncStatusIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    getSyncQueue().getStatus()
  );
  const [showDetails, setShowDetails] = useState(false);
  const [animatedCount, setAnimatedCount] = useState(0);

  useEffect(() => {
    const unsubscribe = getSyncQueue().subscribe(setSyncStatus);
    return unsubscribe;
  }, []);

  // Animate pending operations counter
  useEffect(() => {
    const targetCount = syncStatus.pendingOperations;
    const duration = 300;
    const startTime = Date.now();
    const startCount = animatedCount;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);

      const currentCount = Math.round(startCount + (targetCount - startCount) * easedProgress);
      setAnimatedCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    if (targetCount !== animatedCount) {
      requestAnimationFrame(animate);
    }
  }, [syncStatus.pendingOperations]);

  const getSyncIcon = () => {
    if (!syncStatus.isOnline) {
      return <WifiOff className="h-4 w-4 text-gray-500" />;
    }

    if (syncStatus.hasConflicts) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500 animate-pulse" />;
    }

    if (syncStatus.isSyncing) {
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }

    if (syncStatus.pendingOperations > 0) {
      return <Cloud className="h-4 w-4 text-orange-500" />;
    }

    return <Check className="h-4 w-4 text-green-500" />;
  };

  const getSyncText = () => {
    if (!syncStatus.isOnline) {
      return 'Offline';
    }

    if (syncStatus.hasConflicts) {
      return 'Sync Conflict';
    }

    if (syncStatus.isSyncing) {
      return 'Syncing...';
    }

    if (syncStatus.pendingOperations > 0) {
      return `${animatedCount} pending`;
    }

    return 'Synced';
  };

  const getSyncColor = () => {
    if (!syncStatus.isOnline) return 'text-gray-500';
    if (syncStatus.hasConflicts) return 'text-yellow-500';
    if (syncStatus.isSyncing) return 'text-blue-500';
    if (syncStatus.pendingOperations > 0) return 'text-orange-500';
    return 'text-green-500';
  };

  const handleForceSync = async () => {
    try {
      await dataSyncService.forceSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  const resolveConflict = (operationId: string, resolution: 'keep-local' | 'use-remote') => {
    getSyncQueue().resolveConflict(operationId, resolution);
    setShowDetails(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors ${getSyncColor()} relative`}
        title={`Sync Status: ${getSyncText()}`}
      >
        {getSyncIcon()}
        <span className="text-xs font-medium hidden sm:inline">{getSyncText()}</span>
        {syncStatus.pendingOperations > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
          </span>
        )}
      </button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 z-50">
          <div className="space-y-3">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Connection</span>
              <div className="flex items-center gap-2">
                {syncStatus.isOnline ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Offline</span>
                  </>
                )}
              </div>
            </div>

            {/* Sync Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Sync Queue</span>
              <span className="text-sm text-gray-200 font-mono transition-all duration-200">
                <span className={`inline-block ${animatedCount !== syncStatus.pendingOperations ? 'scale-110' : 'scale-100'}`}>
                  {animatedCount}
                </span> pending
              </span>
            </div>

            {/* Last Sync */}
            {syncStatus.lastSyncTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Last Sync</span>
                <span className="text-sm text-gray-200">
                  {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}
                </span>
              </div>
            )}

            {/* Conflicts */}
            {syncStatus.hasConflicts && syncStatus.conflictDetails && (
              <div className="border-t border-gray-700 pt-3">
                <p className="text-sm font-medium text-yellow-500 mb-2">
                  Sync Conflicts Detected
                </p>
                {syncStatus.conflictDetails.map((conflict: any) => (
                  <div key={conflict.operation.id} className="bg-gray-900 rounded p-2 mb-2">
                    <p className="text-xs text-gray-400 mb-2">
                      {conflict.error?.message || 'Conflict detected'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveConflict(conflict.operation.id, 'keep-local')}
                        className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                      >
                        Keep Local
                      </button>
                      <button
                        onClick={() => resolveConflict(conflict.operation.id, 'use-remote')}
                        className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                      >
                        Use Remote
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-gray-700 pt-3">
              <button
                onClick={handleForceSync}
                disabled={syncStatus.isSyncing || syncStatus.pendingOperations === 0}
                className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Force Sync Now
              </button>
            </div>

            {/* Warning for pending operations */}
            {syncStatus.pendingOperations > 5 && (
              <div className="bg-yellow-900/20 border border-yellow-700 rounded p-2 animate-pulse">
                <p className="text-xs text-yellow-400">
                  {syncStatus.pendingOperations} operations pending. Consider checking your connection or forcing a sync.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};