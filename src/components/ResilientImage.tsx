import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-400 p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <ShieldAlert className="h-8 w-8 text-amber-400/80 mb-2" />
        <span className="text-xs font-medium text-center text-slate-300">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
