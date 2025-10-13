import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Settings, Github, Eye, EyeOff, X } from 'lucide-react';
import { LoadingButton } from './LoadingButton';
import { githubSync } from '../services/githubSync';
import { useGitHubSync } from '../hooks/useGitHubSync';
import toast from 'react-hot-toast';

interface SyncDropdownProps {
  onConfigured?: () => void;
  lastSync?: Date | null;
}

export const SyncDropdown: React.FC<SyncDropdownProps> = ({ onConfigured, lastSync }) => {
  const { refresh } = useGitHubSync();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showGitHubSettings, setShowGitHubSettings] = useState(false);
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const isConfigured = githubSync.isInitialized();
  const isOnline = navigator.onLine;

  // Load settings on mount
  React.useEffect(() => {
    const savedAuth = localStorage.getItem('githubAuth');
    if (savedAuth) {
      try {
        const auth = JSON.parse(savedAuth);
        setToken(auth.token || '');
        setOwner(auth.owner || '');
        setRepo(auth.repo || '');
      } catch (error) {
        console.error('Failed to load GitHub auth:', error);
      }
    }
  }, []);

  const handleSaveSettings = async () => {
    if (!token || !owner || !repo) {
      toast.error('Please fill in all fields');
      return;
    }

    setTesting(true);
    try {
      const connected = await githubSync.initialize(token, owner, repo, 'data.json');

      if (!connected) {
        toast.error('Failed to connect to GitHub. Please check your credentials.');
        return;
      }

      // Save auth settings
      localStorage.setItem('githubAuth', JSON.stringify({
        token,
        owner,
        repo,
        path: 'data.json'
      }));

      toast.success('GitHub connected successfully!');
      setShowGitHubSettings(false);
      setShowDropdown(false);

      if (onConfigured) {
        onConfigured();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect to GitHub');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect from GitHub?')) {
      localStorage.removeItem('githubAuth');
      githubSync.disconnect();
      setToken('');
      setOwner('');
      setRepo('');
      toast.success('Disconnected from GitHub');
      window.location.reload();
    }
  };

  const handleRefresh = async () => {
    try {
      await refresh();
      if (onConfigured) {
        onConfigured();
      }
    } catch (error) {
      // Error already handled by hook
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
          isConfigured
            ? isOnline
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            : 'bg-gray-600 hover:bg-gray-700 text-white'
        }`}
      >
        {isConfigured ? (
          isOnline ? (
            <Cloud className="h-5 w-5" />
          ) : (
            <CloudOff className="h-5 w-5" />
          )
        ) : (
          <Settings className="h-5 w-5" />
        )}
        <span className="text-sm">
          {isConfigured ? (isOnline ? 'Connected' : 'Offline') : 'Setup'}
        </span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-100">GitHub Sync</h3>
              <button
                onClick={() => setShowDropdown(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className={`font-medium ${
                  isConfigured
                    ? isOnline
                      ? 'text-green-400'
                      : 'text-yellow-400'
                    : 'text-gray-400'
                }`}>
                  {isConfigured ? (isOnline ? 'Connected' : 'Offline') : 'Not configured'}
                </span>
              </div>

              {lastSync && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Last sync</span>
                  <span className="text-gray-300">
                    {lastSync.toLocaleTimeString()}
                  </span>
                </div>
              )}

              {isConfigured && (
                <>
                  <button
                    onClick={handleRefresh}
                    className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Data
                  </button>

                  <button
                    onClick={() => setShowGitHubSettings(true)}
                    className="w-full p-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="w-full p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              )}

              {!isConfigured && (
                <button
                  onClick={() => setShowGitHubSettings(true)}
                  className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  Connect GitHub
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showGitHubSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Github className="h-6 w-6 text-gray-100" />
                <h2 className="text-xl font-semibold text-gray-100">GitHub Settings</h2>
              </div>
              <button
                onClick={() => setShowGitHubSettings(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
                  Personal Access Token
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ghp_xxxxxxxxxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="owner" className="block text-sm font-medium text-gray-300 mb-2">
                  Repository Owner
                </label>
                <input
                  type="text"
                  id="owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="username or organization"
                />
              </div>

              <div>
                <label htmlFor="repo" className="block text-sm font-medium text-gray-300 mb-2">
                  Repository Name
                </label>
                <input
                  type="text"
                  id="repo"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="repository-name"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowGitHubSettings(false)}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <LoadingButton
                  onClick={handleSaveSettings}
                  loading={testing}
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                >
                  {testing ? 'Testing...' : 'Save & Connect'}
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};