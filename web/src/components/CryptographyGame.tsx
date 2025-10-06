'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  GameState, 
  initializeGame, 
  makeGuess, 
  getRemainingTime, 
  formatTime,
  useHint,
  type Sentence,
  type ProgressiveGameState,
  type GameResult,
  initializeProgressiveGame,
  getNextProgressiveSentence,
  recordGameResult
} from '@/lib/cipher';
import VirtualKeyboard from './VirtualKeyboard';

interface CryptographyGameProps {
  // Progressive difficulty system - no manual difficulty selection
}

interface LetterBoxProps {
  letter: string;
  number: number;
  isRevealed: boolean;
  onClick: () => void;
  isSelected: boolean;
  currentGuess: string;
  isUserRevealed?: boolean;
  isWrongGuess?: boolean;
  isWrongGuessEffect?: boolean;
}

function LetterBox({ letter, number, isRevealed, onClick, isSelected, currentGuess, isUserRevealed, isWrongGuess, isWrongGuessEffect }: LetterBoxProps) {
  // Get color based on state
  const getCircleColor = () => {
    if (isWrongGuessEffect) return 'var(--game-red)';
    if (isRevealed && isUserRevealed && !isWrongGuess) return 'var(--game-green)';
    if (isRevealed && isUserRevealed && isWrongGuess) return 'var(--game-red)';
    if (isRevealed) return 'var(--game-light-gray)';
    if (isSelected) return 'var(--game-blue)';
    return 'var(--game-light-gray)';
  };

  const getTextColor = () => {
    if (isRevealed && !isUserRevealed) return 'var(--mobile-text-primary)';
    return 'white';
  };

  const getNumberColor = () => {
    if (isRevealed && !isUserRevealed) return 'var(--mobile-text-primary)';
    return 'white';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        className="game-circle"
        style={{
          backgroundColor: getCircleColor(),
          color: getTextColor(),
          animation: isWrongGuessEffect ? 'pulse 1s ease-in-out' : 'none',
          cursor: isRevealed ? 'not-allowed' : 'pointer'
        }}
      >
        <span className="text-lg font-bold">
          {isRevealed ? letter : (isSelected ? (currentGuess || '_') : '_')}
        </span>
      </button>
      {/* Show number below the box */}
      {(!isRevealed || (isRevealed && isUserRevealed)) && (
        <div 
          className="text-xs font-bold" 
          style={{ 
            color: 'var(--mobile-text-secondary)',
            textAlign: 'center',
            minHeight: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {number}
        </div>
      )}
    </div>
  );
}

export default function CryptographyGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [progressiveState, setProgressiveState] = useState<ProgressiveGameState>(initializeProgressiveGame());
  const [selectedLetterIndex, setSelectedLetterIndex] = useState<number | null>(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [wrongGuessIndex, setWrongGuessIndex] = useState<number | null>(null);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(true); // Always show on web

  // Initialize game with progressive difficulty
  const startNewGame = useCallback(() => {
    const nextSentence = getNextProgressiveSentence(progressiveState);
    const newGame = initializeGame(nextSentence.difficulty);
    setGameState(newGame);
    setSelectedLetterIndex(null);
    setCurrentGuess('');
    setMessage('');
    setTimeLeft(newGame.timeLimit);
    
    // Dispatch events for test screen
    window.dispatchEvent(new CustomEvent('gameStateChange', { detail: newGame }));
    window.dispatchEvent(new CustomEvent('progressiveStateChange', { detail: progressiveState }));
  }, [progressiveState]);

  // Auto-select first available letter when game starts
  useEffect(() => {
    if (gameState && !gameState.isGameOver && selectedLetterIndex === null) {
      // Trigger a re-render to select first letter
      setSelectedLetterIndex(0); // Will be corrected by the component logic
    }
  }, [gameState, selectedLetterIndex]);


  // Handle game completion
  const handleGameCompletion = useCallback((isWon: boolean) => {
    if (!gameState) return;
    
    const gameResult: GameResult = {
      sentenceNumber: progressiveState.currentSentenceNumber,
      difficulty: gameState.difficulty,
      isWon,
      mistakes: gameState.mistakes,
      hintsUsed: gameState.hintsUsed,
      timeSpent: Math.floor((Date.now() - gameState.startTime) / 1000)
    };
    
    const updatedProgressiveState = recordGameResult(progressiveState, gameResult);
    setProgressiveState(updatedProgressiveState);
    
    // Dispatch events for test screen
    window.dispatchEvent(new CustomEvent('gameResult', { detail: gameResult }));
    window.dispatchEvent(new CustomEvent('progressiveStateChange', { detail: updatedProgressiveState }));
    
    // Show success popup if won, otherwise show failure message
    if (isWon) {
      setShowSuccessPopup(true);
    }
  }, [gameState, progressiveState]);

  // Handle next game button
  const handleNextGame = useCallback(() => {
    setShowSuccessPopup(false);
    startNewGame();
  }, [startNewGame]);

  // Start game on component mount
  useEffect(() => {
    startNewGame();
  }, []); // Empty dependency array - only run on mount

  // Dispatch game state changes
  useEffect(() => {
    if (gameState) {
      window.dispatchEvent(new CustomEvent('gameStateChange', { detail: gameState }));
    }
  }, [gameState]);

  // Listen for custom events from test screen
  useEffect(() => {
    const handleResetGame = () => {
      setProgressiveState(initializeProgressiveGame());
      startNewGame();
    };

    const handleStartNewGame = () => {
      startNewGame();
    };

    window.addEventListener('resetGame', handleResetGame);
    window.addEventListener('startNewGame', handleStartNewGame);

    return () => {
      window.removeEventListener('resetGame', handleResetGame);
      window.removeEventListener('startNewGame', handleStartNewGame);
    };
  }, [startNewGame]);

  // Timer effect
  useEffect(() => {
    if (!gameState || gameState.isGameOver || gameState.timeLimit === 0) return;

    const timer = setInterval(() => {
      const remaining = getRemainingTime(gameState);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setGameState(prev => prev ? { ...prev, isGameOver: true, isWon: false } : null);
        handleGameCompletion(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Handle hint
  const handleHint = useCallback(() => {
    if (!gameState || gameState.isGameOver) return;
    
    const hintResult = useHint(gameState, progressiveState);
    
    if (hintResult.success && hintResult.revealedPositions) {
      setGameState(prev => {
        if (!prev) return null;
        
        const newUserRevealedPositions = new Set(prev.userRevealedPositions);
        hintResult.revealedPositions!.forEach(position => {
          newUserRevealedPositions.add(position);
        });
        
        const newState = {
          ...prev,
          userRevealedPositions: newUserRevealedPositions,
          hintsUsed: prev.hintsUsed + 1
        };
        
        // Check if game is completed after hint
        if (hintResult.isGameCompleted) {
          newState.isWon = true;
          newState.isGameOver = true;
        }
        
        return newState;
      });
      
      // If game completed, trigger completion handler
      if (hintResult.isGameCompleted) {
        setTimeout(() => {
          handleGameCompletion(true);
        }, 100);
      }
    }
  }, [gameState]);

  // Handle letter box click
  const handleLetterClick = (index: number) => {
    if (!gameState || gameState.isGameOver) return;
    
    // Check if this letter is already revealed (correctly guessed)
    const letterBoxes = getLetterBoxes();
    const targetBox = letterBoxes.find(box => box.index === index);
    
    if (targetBox && targetBox.isRevealed) {
      // Don't allow clicking on already revealed letters
      return;
    }
    
    setSelectedLetterIndex(index);
    setCurrentGuess('');
    // Keyboard is always visible, no need to show/hide
  };

  // Handle virtual keyboard input
  const handleVirtualKeyPress = (key: string) => {
    if (!gameState || gameState.isGameOver) return;
    
    // If no letter is selected, select the first available letter
    if (selectedLetterIndex === null) {
      const availableLetters = letterBoxes.filter(box => !box.isSpace && !box.isRevealed);
      if (availableLetters.length > 0) {
        setSelectedLetterIndex(availableLetters[0].index);
      } else {
        return; // No available letters
      }
    }
    
    // Process the letter directly
    if (key.length === 1 && /[A-ZÇĞIİÖŞÜ]/.test(key)) {
      processGuess(key);
    }
  };

  // Handle direction button press
  const handleDirectionPress = (direction: 'left' | 'right') => {
    if (!gameState || gameState.isGameOver) return;
    
    const availableLetters = letterBoxes.filter(box => !box.isSpace && !box.isRevealed);
    if (availableLetters.length === 0) return;
    
    if (selectedLetterIndex === null) {
      // If no letter selected, select first available
      setSelectedLetterIndex(availableLetters[0].index);
      return;
    }
    
    const currentIndex = availableLetters.findIndex(box => box.index === selectedLetterIndex);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'left') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : availableLetters.length - 1;
    } else {
      newIndex = currentIndex < availableLetters.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedLetterIndex(availableLetters[newIndex].index);
  };

  // Process guess with delay for visual feedback
  const processGuess = (guess: string) => {
    if (!gameState || selectedLetterIndex === null) return;
    
    const result = makeGuess(gameState, guess, gameState.difficulty, selectedLetterIndex);
    setGameState(result.newState);
    
    // Show wrong guess effect if guess was incorrect
    if (!result.success) {
      setWrongGuessIndex(selectedLetterIndex);
      setTimeout(() => {
        setWrongGuessIndex(null);
      }, 1000);
    }
    
    // Check if game is completed
    if (result.newState.isGameOver) {
      if (result.newState.isWon) {
        handleGameCompletion(true);
      } else {
        handleGameCompletion(false);
      }
    }
    
    // Handle cursor movement after guess
    if (result.success) {
      // Correct guess - move to next empty box
      setTimeout(() => {
        const currentLetterBoxes = getLetterBoxes();
        
        // Find current position in ALL letter boxes (not just available ones)
        const currentBoxIndex = currentLetterBoxes.findIndex(box => box.index === selectedLetterIndex);
        
        if (currentBoxIndex !== -1) {
          // Look for next empty box to the right
          let nextEmptyIndex = -1;
          for (let i = currentBoxIndex + 1; i < currentLetterBoxes.length; i++) {
            const box = currentLetterBoxes[i];
            if (!box.isSpace && !box.isRevealed) {
              nextEmptyIndex = box.index;
              break;
            }
          }
          
          // If no empty box found to the right, wrap around to the beginning
          if (nextEmptyIndex === -1) {
            for (let i = 0; i < currentBoxIndex; i++) {
              const box = currentLetterBoxes[i];
              if (!box.isSpace && !box.isRevealed) {
                nextEmptyIndex = box.index;
                break;
              }
            }
          }
          
          // Set the next empty box as selected
          if (nextEmptyIndex !== -1) {
            setSelectedLetterIndex(nextEmptyIndex);
          }
        }
      }, 100);
    }
    // Wrong guess - keep selection box on current position (no action needed)
    
    setCurrentGuess('');
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameState || gameState.isGameOver) return;
      
      // Handle arrow keys for cursor movement
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault(); // Prevent page scrolling
        handleDirectionPress(e.key === 'ArrowLeft' ? 'left' : 'right');
        return;
      }
      
      if (selectedLetterIndex === null) return;
      
      // Normalize for display (keep Turkish characters)
      let key = e.key.toUpperCase();
      
      // Convert Turkish characters for display
      if (key === 'I' && e.key === 'i') {
        key = 'İ'; // Turkish uppercase i
      } else if (key === 'I' && e.key === 'ı') {
        key = 'I'; // Turkish uppercase ı
      }
      
      // Only accept letters (A-Z, Turkish characters)
      if (key.length === 1 && /[A-ZÇĞIİÖŞÜ]/.test(key)) {
        // Use the same logic as virtual keyboard
        processGuess(key);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, selectedLetterIndex]);


  // BASIT KUTU SİSTEMİ - KELİME BÜTÜNLÜĞÜ KORUNUR
  const getLetterBoxes = () => {
    if (!gameState) return [];
    
    // Orijinal cümleyi kelimelere ayır
    const words = gameState.originalSentence.split(' ');
    
    let letterIndex = 0;
    const boxes: Array<{
      letter: string;
      number: number | null;
      isRevealed: boolean;
      index: number;
      isWordStart?: boolean;
      isWordEnd?: boolean;
      isSpace?: boolean;
      wordIndex?: number;
    }> = [];
    
    words.forEach((word, wordIndex) => {
      // Her kelime için harfleri işle
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        
        // Özel karakterleri atla (apostrof, nokta, virgül vs.)
        if (char === '\'' || char === '.' || char === ',' || char === '!' || char === '?' || char === ':' || char === ';' || char === '-') {
          continue; // Bu karakterler için kutu oluşturma
        }
        
        // Keep Turkish characters for display
        const letter = char
          .replace(/i/g, 'İ')  // i → İ (Turkish uppercase i)
          .replace(/ı/g, 'I')  // ı → I (Turkish uppercase ı)
          .toUpperCase();
        // Try Turkish character first, then normalized version
        let number = gameState.letterMapping.get(letter);
        if (!number) {
          const normalizedLetter = letter
            .replace(/İ/g, 'I')
            .replace(/ı/g, 'I')
            .replace(/i/g, 'I')
            .replace(/Ğ/g, 'G')
            .replace(/ğ/g, 'G')
            .replace(/Ü/g, 'U')
            .replace(/ü/g, 'U')
            .replace(/Ş/g, 'S')
            .replace(/ş/g, 'S')
            .replace(/Ö/g, 'O')
            .replace(/ö/g, 'O')
            .replace(/Ç/g, 'C')
            .replace(/ç/g, 'C');
          number = gameState.letterMapping.get(normalizedLetter);
        }
        // Check if this position is revealed (either by initial reveal or user guess)
        const isRevealed = gameState.initialRevealedPositions.has(letterIndex) || gameState.userRevealedPositions.has(letterIndex);
        
        boxes.push({
          letter,
          number: number || null,
          isRevealed,
          index: letterIndex,
          isWordStart: i === 0,
          isWordEnd: i === word.length - 1,
          wordIndex
        });
        
        letterIndex++;
      }
      
      // Kelime sonunda boşluk ekle (son kelime değilse)
      if (wordIndex < words.length - 1) {
        boxes.push({
          letter: ' ',
          number: null,
          isRevealed: true,
          index: -1,
          isSpace: true,
          wordIndex
        });
      }
    });
    
    return boxes;
  };

  // Get letter boxes from a specific game state
  const getLetterBoxesFromState = (state: GameState) => {
    if (!state) return [];
    
    // Orijinal cümleyi kelimelere ayır
    const words = state.originalSentence.split(' ');
    
    let letterIndex = 0;
    const boxes: Array<{
      letter: string;
      number: number | null;
      isRevealed: boolean;
      index: number;
      isWordStart?: boolean;
      isWordEnd?: boolean;
      isSpace?: boolean;
      wordIndex?: number;
    }> = [];
    
    words.forEach((word, wordIndex) => {
      // Her kelime için harfleri işle
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        
        // Özel karakterleri atla (apostrof, nokta, virgül vs.)
        if (char === '\'' || char === '.' || char === ',' || char === '!' || char === '?' || char === ':' || char === ';' || char === '-') {
          continue; // Bu karakterler için kutu oluşturma
        }
        
        // Keep Turkish characters for display
        const letter = char
          .replace(/i/g, 'İ')  // i → İ (Turkish uppercase i)
          .replace(/ı/g, 'I')  // ı → I (Turkish uppercase ı)
          .toUpperCase();
        // Try Turkish character first, then normalized version
        let number = state.letterMapping.get(letter);
        if (!number) {
          const normalizedLetter = letter
            .replace(/İ/g, 'I')
            .replace(/ı/g, 'I')
            .replace(/i/g, 'I')
            .replace(/Ğ/g, 'G')
            .replace(/ğ/g, 'G')
            .replace(/Ü/g, 'U')
            .replace(/ü/g, 'U')
            .replace(/Ş/g, 'S')
            .replace(/ş/g, 'S')
            .replace(/Ö/g, 'O')
            .replace(/ö/g, 'O')
            .replace(/Ç/g, 'C')
            .replace(/ç/g, 'C');
          number = state.letterMapping.get(normalizedLetter);
        }
        
        boxes.push({
          letter,
          number: number || null,
          isRevealed: state.initialRevealedPositions.has(letterIndex) || state.userRevealedPositions.has(letterIndex),
          index: letterIndex,
          isWordStart: i === 0,
          isWordEnd: i === word.length - 1,
          wordIndex
        });
        letterIndex++;
      }
      
      // Kelime sonrası boşluk ekle (son kelime değilse)
      if (wordIndex < words.length - 1) {
        boxes.push({
          letter: ' ',
          number: null,
          isRevealed: true,
          index: letterIndex,
          isSpace: true,
          wordIndex: -1
        });
        letterIndex++;
      }
    });
    
    return boxes;
  };

  if (!gameState) {
    return (
      <div className="mobile-container flex items-center justify-center">
        <div className="text-center text-gray-600">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const letterBoxes = getLetterBoxes();

  // Auto-select first available letter when game starts (after letterBoxes is defined)
  if (gameState && !gameState.isGameOver && selectedLetterIndex === null) {
    const availableLetters = letterBoxes.filter(box => !box.isSpace && !box.isRevealed);
    if (availableLetters.length > 0) {
      setSelectedLetterIndex(availableLetters[0].index);
    }
  }

  return (
    <div className="mobile-container flex flex-col">
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="flex items-center gap-3">
          {/* Game Title */}
          <h1 className="text-lg font-semibold" style={{ color: 'var(--mobile-text-primary)' }}>
            Kriptografya
          </h1>
        </div>
        
        {/* Game Stats Display */}
        <div className="score-display">
          <div className="flex items-center gap-4 text-sm">
            {gameState.timeLimit > 0 && (
              <div className="text-center">
                <div className="text-xs" style={{ color: 'var(--mobile-text-secondary)' }}>SÜRE</div>
                <div className="font-bold" style={{ color: 'var(--mobile-text-primary)' }}>{timeLeft > 0 ? formatTime(timeLeft) : '00:00'}</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--mobile-text-secondary)' }}>CÜMLE</div>
              <div className="font-bold" style={{ color: 'var(--mobile-text-primary)' }}>{progressiveState.currentSentenceNumber}</div>
            </div>
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--mobile-text-secondary)' }}>HARF</div>
              <div className="font-bold" style={{ color: 'var(--mobile-text-primary)' }}>{letterBoxes.filter(b => !b.isSpace).length}</div>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="flex-1 px-4 py-6" style={{ backgroundColor: 'var(--mobile-game-area-bg)' }}>
        {/* Error indicators */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i <= gameState.mistakes ? 'bg-red-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Cipher Display - Group Words */}
        <div className="w-full max-w-2xl mx-auto px-4">
          <div className="flex flex-wrap justify-center items-start gap-2">
            {(() => {
              const wordGroups: Array<Array<typeof letterBoxes[0]>> = [];
              let currentWord: Array<typeof letterBoxes[0]> = [];
              
              letterBoxes.forEach((box) => {
                if (box.isSpace) {
                  if (currentWord.length > 0) {
                    wordGroups.push([...currentWord]);
                    currentWord = [];
                  }
                  wordGroups.push([box]); // Space as separate group
                } else {
                  currentWord.push(box);
                }
              });
              
              if (currentWord.length > 0) {
                wordGroups.push(currentWord);
              }
              
              return wordGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="flex gap-2 items-start">
                  {group.map((box, boxIndex) => {
                    if (box.isSpace) {
                      return (
                        <div key={`space-${groupIndex}-${boxIndex}`} className="w-4"></div>
                      );
                    }
                    return (
                      <LetterBox
                        key={`${groupIndex}-${boxIndex}`}
                        letter={box.letter}
                        number={box.number || 0}
                        isRevealed={box.isRevealed}
                        onClick={() => handleLetterClick(box.index)}
                        isSelected={selectedLetterIndex === box.index}
                        currentGuess={currentGuess}
                        isUserRevealed={gameState?.userRevealedPositions.has(box.index) && !gameState?.initialRevealedPositions.has(box.index)}
                        isWrongGuessEffect={wrongGuessIndex === box.index}
                      />
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="text-center mt-6">
            <div className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${
              message.includes('Doğru') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          </div>
        )}

        {/* Game Status - Only show failure message, success handled by popup */}
        {gameState.isGameOver && !gameState.isWon && (
          <div className="text-center mt-8">
            <div className="text-red-600">
              <div className="text-4xl mb-4">😞</div>
              <h2 className="text-2xl font-bold mb-2">Oyun Bitti!</h2>
              <p className="text-lg mb-2">Çok fazla hata yaptınız.</p>
              <p className="text-lg">Doğru cümle: <strong>{gameState.originalSentence}</strong></p>
            </div>
          </div>
        )}
      </main>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-lg border-2 border-green-200">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-xl font-bold text-green-600 mb-2">
              Tebrikler!
            </h3>
            <p className="text-gray-600 mb-4">
              Cümleyi başarıyla çözdünüz!
            </p>
            <button
              onClick={handleNextGame}
              className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Sonraki Oyun
            </button>
          </div>
        </div>
      )}

      {/* New Game Confirmation Modal */}
      {showNewGameConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Yeni Oyun Başlat
            </h3>
            <p className="text-gray-600 mb-6">
              Mevcut oyun silinecek ve yeni bir oyun başlatılacak. Emin misiniz?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowNewGameConfirm(false);
                  startNewGame();
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Evet, Başlat
              </button>
              <button
                onClick={() => setShowNewGameConfirm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Action Buttons */}
      <div className="px-4 py-6 border-t" style={{ backgroundColor: 'var(--mobile-game-area-bg)', borderColor: 'var(--mobile-border)' }}>
        <div className="flex justify-center space-x-4">
          {/* Hint Button */}
          <button 
            onClick={handleHint}
            disabled={!gameState || gameState.isGameOver || gameState.hintsUsed >= gameState.maxHints}
            className={`px-6 py-3 rounded-xl flex items-center space-x-2 transition-colors ${
              !gameState || gameState.isGameOver || gameState.hintsUsed >= gameState.maxHints
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>İpucu ({gameState ? gameState.maxHints - gameState.hintsUsed : 0})</span>
          </button>
          
          {/* New Game Button */}
          <button
            onClick={() => setShowNewGameConfirm(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center space-x-2 transition-colors shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Yeni Oyun</span>
          </button>
        </div>
      </div>

      {/* Virtual Keyboard - Always Visible */}
      <div className="px-6 py-6 border-t" style={{ backgroundColor: 'var(--mobile-game-area-bg)', borderColor: 'var(--mobile-border)' }}>
        <VirtualKeyboard 
          onKeyPress={handleVirtualKeyPress}
          onDirectionPress={handleDirectionPress}
          disabled={!gameState || gameState.isGameOver}
        />
      </div>
    </div>
  );
}