import React, { useState } from 'react';
import bundledLogo from '../assets/logo.png';

/**
 * Nai Agent Logo Component
 * Carga automáticamente el asset empaquetado por Vite o customSrc.
 * Si falla, muestra el logo vectorial estilizado "N" de Nai Agent.
 */
export default function Logo({ className = "w-8 h-8", customSrc = null }) {
  const [imgError, setImgError] = useState(false);
  const srcToUse = customSrc || bundledLogo;

  if (!imgError && srcToUse) {
    return (
      <img
        src={srcToUse}
        alt="Nai Agent Logo"
        onError={() => setImgError(true)}
        className={`${className} object-contain rounded-xl shadow-sm flex-shrink-0`}
      />
    );
  }

  // Fallback: Logo vectorial estilizado "N" (Nai Agent)
  return (
    <div
      className={`${className} rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0 relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
      >
        <path
          d="M8 24V8L24 24V8"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="8" r="2.5" fill="#38bdf8" />
        <circle cx="8" cy="24" r="2.5" fill="#c084fc" />
      </svg>
    </div>
  );
}
