import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PackageOpen, Truck } from "lucide-react";

export const ModuleNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isLoadingsActive = location.pathname === "/loadings";
  const isOffloadingsActive = location.pathname === "/offloadings";

  return (
    <div className="flex items-center gap-2">
      {/* Loadings Module Button */}
      <button
        onClick={() => navigate("/loadings")}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
          isLoadingsActive
            ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
            : "bg-gray-700 hover:bg-gray-600 text-gray-300"
        }`}
        disabled={isLoadingsActive}
      >
        <PackageOpen className="h-4 w-4" />
        <span className="hidden sm:inline">Loadings</span>
      </button>

      {/* Offloadings Module Button */}
      <button
        onClick={() => navigate("/offloadings")}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
          isOffloadingsActive
            ? "bg-green-500/20 text-green-400 border border-green-500/50"
            : "bg-gray-700 hover:bg-gray-600 text-gray-300"
        }`}
        disabled={isOffloadingsActive}
      >
        <Truck className="h-4 w-4" />
        <span className="hidden sm:inline">Offloadings</span>
      </button>
    </div>
  );
};

