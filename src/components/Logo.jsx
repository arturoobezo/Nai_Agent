import React, { useState } from 'react';
import bundledLogo from '../assets/logo.png';
import { OFFICIAL_LOGO_BASE64 } from '../assets/logoBase64';

/**
 * Nai Agent Logo Component
 * Carga el logo oficial "Fácil con AI" empaquetado o en Base64 garantizado.
 */
export default function Logo({ className = "w-8 h-8", customSrc = null }) {
  const [useBase64, setUseBase64] = useState(false);
  const srcToUse = customSrc || (useBase64 ? OFFICIAL_LOGO_BASE64 : bundledLogo);

  return (
    <img
      src={srcToUse}
      alt="Nai Agent Logo"
      onError={() => {
        if (!useBase64) setUseBase64(true);
      }}
      className={`${className} object-contain rounded-xl shadow-sm flex-shrink-0`}
    />
  );
}

