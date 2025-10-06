'use client';

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onDirectionPress: (direction: 'left' | 'right') => void;
  disabled?: boolean;
}

export default function VirtualKeyboard({ onKeyPress, onDirectionPress, disabled = false }: VirtualKeyboardProps) {
  // Turkish alphabet with special characters
  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç']
  ];

  const handleKeyClick = (key: string) => {
    if (!disabled) {
      onKeyPress(key);
    }
  };

  const handleDirectionClick = (direction: 'left' | 'right') => {
    if (!disabled) {
      onDirectionPress(direction);
    }
  };

  return (
    <div className="virtual-keyboard bg-gray-800 p-6 rounded-lg">
      {/* Main keyboard layout with side buttons */}
      <div className="flex items-center justify-center gap-2 md:gap-4">
        {/* Left button */}
        <button
          onClick={() => handleDirectionClick('left')}
          disabled={disabled}
          className={`
            px-2 md:px-4 py-4 md:py-6 text-sm md:text-lg font-bold rounded-lg transition-all duration-200
            ${disabled 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }
            flex items-center justify-center min-w-[60px] md:min-w-[80px] h-20 md:h-24
          `}
        >
          <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {/* Keyboard */}
        <div className="space-y-2 md:space-y-3">
          {keyboardRows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1 md:gap-2">
              {row.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyClick(key)}
                  disabled={disabled}
                  className={`
                    px-2 md:px-4 py-2 md:py-3 text-sm md:text-base font-bold rounded-lg transition-all duration-200
                    ${disabled 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500'
                    }
                    min-w-[36px] md:min-w-[44px] h-10 md:h-12 flex items-center justify-center
                  `}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
        </div>
        
        {/* Right button */}
        <button
          onClick={() => handleDirectionClick('right')}
          disabled={disabled}
          className={`
            px-2 md:px-4 py-4 md:py-6 text-sm md:text-lg font-bold rounded-lg transition-all duration-200
            ${disabled 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }
            flex items-center justify-center min-w-[60px] md:min-w-[80px] h-20 md:h-24
          `}
        >
          <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
