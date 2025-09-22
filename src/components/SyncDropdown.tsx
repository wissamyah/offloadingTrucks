import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, Check, Wifi, WifiOff, Settings, Github, Eye, EyeOff, X } from 'lucide-react';
import { getSyncQueue, SyncStatus } from '../services/syncQueue';
import { dataSyncService } from '../services/dataSync';
import { githubService } from '../services/githubService';
import { LoadingButton } from './LoadingButton';
import toast from 'react-hot-toast';

interface SyncDropdownProps {
  onConfigured?: () => void;
}

export const SyncDropdown: React.FC<SyncDropdownProps> = ({ onConfigured }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    getSyncQueue().getStatus()
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [showGitHubSettings, setShowGitHubSettings] = useState(false);
  const [animatedCount, setAnimatedCount] = useState(0);

  // GitHub settings state
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const unsubscribe = getSyncQueue().subscribe(setSyncStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Load GitHub settings from localStorage
    const savedSettings = localStorage.getItem('githubSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setToken(settings.token || '');
        setOwner(settings.owner || '');
        setRepo(settings.repo || '');
        if (settings.token && settings.owner && settings.repo) {
          githubService.initialize(settings.token, settings.owner, settings.repo);
          setIsConfigured(true);
        }
      } catch (error) {
        console.error('Failed to load GitHub settings:', error);
      }
    }
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

    if (!isConfigured) {
      return <CloudOff className="h-4 w-4 text-gray-500" />;
    }

    return <Check className="h-4 w-4 text-green-500" />;
  };

  const getSyncText = () => {
    if (!isConfigured) {
      return 'Not Connected';
    }

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
    if (!isConfigured) return 'text-gray-500';
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
    setShowDropdown(false);
  };

  const handleSaveGitHub = async () => {
    if (!token || !owner || !repo) {
      toast.error('Please fill in all fields');
      return;
    }

    setTesting(true);

    try {
      githubService.initialize(token, owner, repo);
      const connected = await githubService.testConnection();

      if (!connected) {
        toast.error('Failed to connect to GitHub. Please check your credentials.');
        setTesting(false);
        return;
      }

      // Save settings
      localStorage.setItem('githubSettings', JSON.stringify({ token, owner, repo }));
      setIsConfigured(true);
      toast.success('GitHub settings saved successfully!');
      setShowGitHubSettings(false);
      if (onConfigured) onConfigured();
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect to GitHub');
    } finally {
      setTesting(false);
    }
  };

  const handleClearGitHub = () => {
    if (window.confirm('Are you sure you want to clear GitHub settings?')) {
      localStorage.removeItem('githubSettings');
      setToken('');
      setOwner('');
      setRepo('');
      setIsConfigured(false);
      toast.success('GitHub settings cleared');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.sync-dropdown-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <>
      <div className="relative sync-dropdown-container">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
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

        {showDropdown && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 z-50">
            <div className="space-y-3">
              {/* GitHub Connection Status */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-400">GitHub</span>
                </div>
                <button
                  onClick={() => setShowGitHubSettings(true)}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                    isConfigured
                      ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {isConfigured ? (
                    <>
                      <Check className="h-3 w-3" />
                      Connected
                    </>
                  ) : (
                    <>
                      <Settings className="h-3 w-3" />
                      Configure
                    </>
                  )}
                </button>
              </div>

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
              {isConfigured && (
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
              )}

              {/* Warning for pending operations */}
              {syncStatus.pendingOperations > 5 && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded p-2 animate-pulse">
                  <p className="text-xs text-yellow-400">
                    {syncStatus.pendingOperations} operations pending. Consider checking your connection or forcing a sync.
                  </p>
                </div>
              )}

              {/* Not configured warning */}
              {!isConfigured && (
                <div className="bg-gray-900 border border-gray-700 rounded p-3">
                  <p className="text-xs text-gray-400 mb-2">
                    GitHub is not configured. Click Configure above to connect your repository for data synchronization.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* GitHub Settings Modal */}
      {showGitHubSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Github className="h-6 w-6" />
                <h2 className="text-xl font-semibold">GitHub Settings</h2>
              </div>
              <button
                onClick={() => setShowGitHubSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isConfigured && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  GitHub is configured and connected
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="github-token" className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Access Token
                </label>
                <div className="relative">
                  <input
                    id="github-token"
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ghp_xxxxxxxxxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Token needs repo scope. <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Create token
                  </a>
                </p>
              </div>

              <div>
                <label htmlFor="github-owner" className="block text-sm font-medium text-gray-700 mb-2">
                  Repository Owner (username or org)
                </label>
                <input
                  id="github-owner"
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your-username"
                />
              </div>

              <div>
                <label htmlFor="github-repo" className="block text-sm font-medium text-gray-700 mb-2">
                  Repository Name
                </label>
                <input
                  id="github-repo"
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="offloadingTrucks"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LoadingButton
                onClick={handleSaveGitHub}
                loading={testing}
                variant="primary"
                className="flex-1"
              >
                {testing ? 'Testing Connection...' : 'Save & Connect'}
              </LoadingButton>
              {isConfigured && (
                <LoadingButton
                  onClick={handleClearGitHub}
                  variant="danger"
                >
                  Clear
                </LoadingButton>
              )}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Your credentials are stored locally in your browser and never shared.
                Data is synced directly with your GitHub repository.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};