import React, { useState } from 'react';

/**
 * Nai Agent Logo Component
 * Carga automáticamente tu archivo de logo si existe en 'public/logo.png' o 'public/logo.svg'.
 * Si aún no has colocado una imagen, muestra el logo vectorial predeterminado.
 */
export default function Logo({ className = "w-8 h-8", customSrc = "/logo.png" }) {
  const [imgError, setImgError] = useState(false);

  // Si existe una imagen de logo en public/logo.png o public/logo.svg, la muestra directamente:
  if (!imgError) {
    return (
      <img
        src={customSrc}
        alt="Nai Agent Logo"
        onError={() => setImgError(true)}
        className={`${className} object-contain rounded-xl shadow-md flex-shrink-0`}
      />
    );
  }

  // Fallback: Logo vectorial estilizado si no hay imagen en public/
  return (
    <div
      className={`${className} rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0 relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
      >
        <path
          d="M7 25V7L16 18L25 7V25"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="18" r="2.5" fill="#38bdf8" />
      </svg>
    </div>
  );
}
