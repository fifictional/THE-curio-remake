'use client';

export const CurioLoading = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
      <div className="relative">
        {/* Shadow */}
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-2 bg-gray-200 rounded-full animate-shadow opacity-30"
        />
        
        {/* Cloud */}
        <div className="relative w-24 h-24 animate-float">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-sm"
          >
            {/* Main cloud body */}
            <path
              d="M25 60 
                 C15 60 10 50 15 40
                 C20 30 35 30 40 40
                 C45 25 65 25 70 40
                 C85 35 90 55 80 60
                 Z"
              className="fill-gray-200 stroke-gray-300"
              strokeWidth="2"
            />
            {/* Small decorative clouds */}
            <path
              d="M35 45
                 C30 45 28 40 30 35
                 C32 30 38 30 40 35
                 C42 30 48 30 50 35
                 C55 33 57 40 53 42
                 Z"
              className="fill-white stroke-gray-200"
              strokeWidth="1"
            />
          </svg>
        </div>
      </div>
      
      <span className="text-sm text-gray-400 animate-pulse">Loading...</span>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes shadow {
          0%, 100% {
            transform: translateX(-50%) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translateX(-50%) scale(0.85);
            opacity: 0.2;
          }
        }
        .animate-shadow {
          animation: shadow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};