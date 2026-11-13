'use client';

import Image from 'next/image';

interface ActionCardProps {
  topText: string | React.ReactNode;
  bottomText: string;
  imageUrl: string;
  imageAlt?: string;
  imageSize?: number;
  onClick?: () => void;
  className?: string;
}

export function ActionCard({
  topText,
  bottomText,
  imageUrl,
  imageAlt = 'Action illustration',
  imageSize = 100,
  onClick,
  className = ''
}: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-3 w-full p-10 text-left bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer ${className}`}
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="text-center text-gray-900">
          {typeof topText === 'string' ? (
            topText.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < topText.split('\n').length - 1 && <br />}
              </span>
            ))
          ) : (
            topText
          )}
        </div>
        <Image 
          src={imageUrl} 
          alt={imageAlt} 
          width={imageSize} 
          height={imageSize} 
          className="h-auto w-auto"
        />
        <p className="text-4xl font-bold text-gray-500">{bottomText}</p>
      </div>
    </button>
  );
} 