import React, { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, Check, X, Github } from 'lucide-react';
import { LoadingButton } from './LoadingButton';
import { githubSync } from '../services/githubSync';
import toast from 'react-hot-toast';

interface AuthSettingsProps {
  onConfigured: () => void;
}

export const AuthSettings: React.FC<AuthSettingsProps> = ({ onConfigured }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Load auth settings from localStorage
    const savedAuth = localStorage.getItem('githubAuth');
    if (savedAuth) {
      try {
        const { token, owner, repo } = JSON.parse(savedAuth);
        setToken(token || '');
        setOwner(owner || '');
        setRepo(repo || '');
        if (token && owner && repo) {
          setIsConfigured(true);
        }
      } catch (error) {
        console.error('Failed to load GitHub auth:', error);
      }
    }
  }, []);

  const handleSave = async () => {
    if (!token || !owner || !repo) {
      toast.error('Please fill in all fields');
      return;
    }

    setTesting(true);

    try {
      const connected = await githubSync.initialize(token, owner, repo, 'data.json');

      if (!connected) {
        toast.error('Failed to connect to GitHub. Please check your credentials.');
        setTesting(false);
        return;
      }

      // Save auth only (no data in localStorage)
      localStorage.setItem('githubAuth', JSON.stringify({ token, owner, repo, path: 'data.json' }));
      setIsConfigured(true);
      toast.success('GitHub connected successfully!');
      setIsOpen(false);
      onConfigured();
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect to GitHub');
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to disconnect GitHub?')) {
      localStorage.removeItem('githubAuth');
      githubSync.disconnect();
      setToken('');
      setOwner('');
      setRepo('');
      setIsConfigured(false);
      toast.success('GitHub disconnected');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-4 right-4 p-3 rounded-full shadow-lg transition-all hover:scale-110 ${
          isConfigured
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-600 text-white hover:bg-gray-700'
        }`}
        title={isConfigured ? 'GitHub Connected' : 'Configure GitHub'}
      >
        {isConfigured ? <Check className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Github className="h-6 w-6" />
                <h2 className="text-xl font-semibold">GitHub Settings</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
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
                onClick={handleSave}
                loading={testing}
                variant="primary"
                className="flex-1"
              >
                {testing ? 'Testing Connection...' : 'Save & Connect'}
              </LoadingButton>
              {isConfigured && (
                <LoadingButton
                  onClick={handleClear}
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