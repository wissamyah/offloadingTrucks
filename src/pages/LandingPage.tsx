import React from "react";
import { useNavigate } from "react-router-dom";
import { Truck, PackageOpen } from "lucide-react";

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 shadow-xl border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Truck className="h-10 w-10 text-blue-500" />
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">
                Paddy Truck Monitoring System
              </h1>
            </div>
            <p className="text-gray-400 text-lg">
              Select a module to get started
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-5xl w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Loadings Module Card */}
            <button
              onClick={() => navigate("/loadings")}
              className="group bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-700 hover:border-blue-500 transition-all duration-300 transform hover:scale-105 hover:shadow-blue-500/20 p-8 text-left"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="bg-blue-500/10 p-6 rounded-full group-hover:bg-blue-500/20 transition-colors">
                  <PackageOpen className="h-16 w-16 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-100 mb-3">
                    Loadings
                  </h2>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Manage incoming truck loadings, track arrivals, and monitor
                    loading operations
                  </p>
                </div>
                <div className="flex items-center text-blue-500 font-medium group-hover:translate-x-2 transition-transform">
                  <span>Access Module</span>
                  <svg
                    className="ml-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </button>

            {/* Offloadings Module Card */}
            <button
              onClick={() => navigate("/offloadings")}
              className="group bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-700 hover:border-green-500 transition-all duration-300 transform hover:scale-105 hover:shadow-green-500/20 p-8 text-left"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="bg-green-500/10 p-6 rounded-full group-hover:bg-green-500/20 transition-colors">
                  <Truck className="h-16 w-16 text-green-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-100 mb-3">
                    Offloadings
                  </h2>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Track offloading operations, manage scales, and monitor
                    completed deliveries
                  </p>
                </div>
                <div className="flex items-center text-green-500 font-medium group-hover:translate-x-2 transition-transform">
                  <span>Access Module</span>
                  <svg
                    className="ml-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            Paddy Truck Monitoring System - Manage your operations efficiently
          </p>
        </div>
      </footer>
    </div>
  );
};

