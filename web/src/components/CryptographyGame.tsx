'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  GameState, 
  initializeGame, 
  makeGuess, 
  getRemainingTime, 
  formatTime,
  useHint,
  type Sentence 
} from '@/lib/cipher';

interface CryptographyGameProps {
  initialDifficulty?: 'easy' | 'medium' | 'hard';
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
  return (
    <div className="flex flex-col items-center h-16">
      <button
        onClick={onClick}
        className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-all duration-300 ${
          isWrongGuessEffect
            ? 'bg-red-200 border-red-600 text-red-800 animate-pulse' // Yanlış tahmin efekti - KIRMIZI PULSE
            : isRevealed && isUserRevealed && !isWrongGuess
            ? 'bg-green-100 border-green-500 text-green-700' // Kullanıcı doğru girişi - YEŞİL
            : isRevealed && isUserRevealed && isWrongGuess
            ? 'bg-red-100 border-red-500 text-red-700' // Kullanıcı yanlış girişi - KIRMIZI
            : isRevealed
            ? 'bg-white border-gray-300 text-gray-600' // Oyun başında açılan harf - NORMAL
            : isSelected
            ? 'bg-blue-50 border-blue-500 text-blue-700'
            : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
        }`}
      >
        {isRevealed ? letter : (isSelected ? (currentGuess || '_') : '_')}
      </button>
      {/* Her zaman aynı yükseklikte alan ayır */}
      <div className="h-6 flex items-center justify-center">
        {/* Sayı gösterimi: Sadece kapalı harfler ve kullanıcı girişleri için */}
        {(!isRevealed || (isRevealed && isUserRevealed)) && (
          <div className="text-xs text-gray-500 font-mono">
            {number}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CryptographyGame({ initialDifficulty = 'medium' }: CryptographyGameProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(initialDifficulty);
  const [selectedLetterIndex, setSelectedLetterIndex] = useState<number | null>(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [wrongGuessIndex, setWrongGuessIndex] = useState<number | null>(null);

  // Initialize game
  const startNewGame = useCallback(() => {
    const newGame = initializeGame(difficulty);
    setGameState(newGame);
    setSelectedLetterIndex(null);
    setCurrentGuess('');
    setMessage('');
    setTimeLeft(newGame.timeLimit);
  }, [difficulty]);

  // Start game on component mount
  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Timer effect
  useEffect(() => {
    if (!gameState || gameState.isGameOver || gameState.timeLimit === 0) return;

    const timer = setInterval(() => {
      const remaining = getRemainingTime(gameState);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setGameState(prev => prev ? { ...prev, isGameOver: true, isWon: false } : null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Handle hint
  const handleHint = useCallback(() => {
    if (!gameState || gameState.isGameOver) return;
    
    const hintResult = useHint(gameState);
    
    if (hintResult.success && hintResult.revealedPositions) {
      setGameState(prev => {
        if (!prev) return null;
        
        const newUserRevealedPositions = new Set(prev.userRevealedPositions);
        hintResult.revealedPositions!.forEach(position => {
          newUserRevealedPositions.add(position);
        });
        
        return {
          ...prev,
          userRevealedPositions: newUserRevealedPositions,
          hintsUsed: prev.hintsUsed + 1
        };
      });
    }
  }, [gameState]);

  // Handle letter box click
  const handleLetterClick = (index: number) => {
    if (!gameState || gameState.isGameOver) return;
    setSelectedLetterIndex(index);
    setCurrentGuess('');
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameState || gameState.isGameOver || selectedLetterIndex === null) return;
      
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
        // Show the Turkish character immediately
        setCurrentGuess(key);
        
        // Then process after a short delay to show the letter
        setTimeout(() => {
          // For processing, use normalized version
          const processedKey = key
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
          const result = makeGuess(gameState, processedKey, difficulty, selectedLetterIndex);
          setGameState(result.newState);
          
          // Show wrong guess effect if guess was incorrect
          if (!result.success) {
            setWrongGuessIndex(selectedLetterIndex);
            // Clear the effect after 1 second
            setTimeout(() => {
              setWrongGuessIndex(null);
            }, 1000);
          }
          
          setSelectedLetterIndex(null);
          setCurrentGuess('');
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, selectedLetterIndex]);

  // Handle difficulty change
  const handleDifficultyChange = (newDifficulty: 'easy' | 'medium' | 'hard') => {
    setDifficulty(newDifficulty);
    setShowSettings(false);
    if (gameState) {
      startNewGame();
    }
  };

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
          number: number || 0,
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

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
          <p className="mt-4">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const letterBoxes = getLetterBoxes();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button className="text-white hover:text-gray-300 mr-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          <h1 className="text-white text-xl font-semibold">
            {gameState.isGameOver ? 'Oyun Bitti' : 'Kriptografya'}
          </h1>
        </div>
        
        <div className="flex items-center">
          {/* Settings button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-white hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-sm font-medium">Zorluk Seviyesi</h3>
            <div className="flex space-x-2">
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => handleDifficultyChange(level)}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    difficulty === level
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {level === 'easy' ? 'Kolay' : level === 'medium' ? 'Orta' : 'Zor'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 bg-white px-6 py-8">
        {/* Error indicators */}
        <div className="flex justify-center mb-4">
          <div className="flex space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded ${
                  i <= gameState.mistakes ? 'bg-red-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Game Info */}
        <div className="text-center mb-8">
          <div className="flex justify-center space-x-8 text-sm text-gray-600">
            {gameState.timeLimit > 0 && (
              <div>
                <span className="font-semibold">Süre:</span> {timeLeft > 0 ? formatTime(timeLeft) : '00:00'}
              </div>
            )}
            <div>
              <span className="font-semibold">Harf Sayısı:</span> {letterBoxes.filter(b => !b.isSpace).length}
            </div>
          </div>
        </div>

        {/* Cipher Display - KELİME BÜTÜNLÜĞÜ KORUNUR */}
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center items-end gap-4">
            {(() => {
              // Kelimeleri grupla
              const words = gameState?.originalSentence.split(' ') || [];
              const wordGroups: Array<Array<typeof letterBoxes[0]>> = [];
              let currentWord: Array<typeof letterBoxes[0]> = [];
              
              letterBoxes.forEach((box) => {
                if (box.isSpace) {
                  if (currentWord.length > 0) {
                    wordGroups.push([...currentWord]);
                    currentWord = [];
                  }
                  wordGroups.push([box]); // Boşluk grubu
                } else {
                  currentWord.push(box);
                }
              });
              
              // Son kelimeyi ekle
              if (currentWord.length > 0) {
                wordGroups.push(currentWord);
              }
              
              return wordGroups.map((group, groupIndex) => {
                if (group[0]?.isSpace) {
                  // Boşluk grubu
                  return (
                    <div key={groupIndex} className="w-8"></div>
                  );
                }
                
                // Kelime grubu - özel karakterleri ekle
                const wordWithSpecialChars = words[group[0]?.wordIndex || 0];
                const specialChars = wordWithSpecialChars.split('').filter((char: string) => 
                  char === '\'' || char === '.' || char === ',' || char === '!' || char === '?' || char === ':' || char === ';' || char === '-'
                );
                
                return (
                  <div key={groupIndex} className="flex items-end gap-1">
                    {group.map((box, boxIndex) => {
                      // Özel karakterleri uygun yerlere ekle
                      const elements = [];
                      
                      // Harf kutusu
                      elements.push(
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
                      
                      // Eğer kelime sonundaysa özel karakterleri ekle
                      if (box.isWordEnd && specialChars.length > 0) {
                        specialChars.forEach((specialChar: string, charIndex: number) => {
                          elements.push(
                            <span key={`special-${groupIndex}-${charIndex}`} className="text-lg font-bold text-gray-600">
                              {specialChar}
                            </span>
                          );
                        });
                      }
                      
                      return elements;
                    }).flat()}
                  </div>
                );
              });
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

        {/* Game Status */}
        {gameState.isGameOver && (
          <div className="text-center mt-8">
            {gameState.isWon ? (
              <div className="text-green-600">
                <div className="text-4xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold mb-2">Tebrikler!</h2>
                <p className="text-lg mb-2">Cümleyi çözdünüz!</p>
              </div>
            ) : (
              <div className="text-red-600">
                <div className="text-4xl mb-4">😞</div>
                <h2 className="text-2xl font-bold mb-2">Oyun Bitti!</h2>
                <p className="text-lg mb-2">Çok fazla hata yaptınız.</p>
                <p className="text-lg">Doğru cümle: <strong>{gameState.originalSentence}</strong></p>
              </div>
            )}
          </div>
        )}
      </main>

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

      {/* Footer */}
      <footer className="bg-gray-900 px-6 py-4">
        <div className="flex justify-center space-x-4">
          {/* Hint Button */}
          <button 
            onClick={handleHint}
            disabled={!gameState || gameState.isGameOver || gameState.hintsUsed >= gameState.maxHints}
            className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors ${
              !gameState || gameState.isGameOver || gameState.hintsUsed >= gameState.maxHints
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
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
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Yeni Oyun</span>
          </button>
        </div>
      </footer>
    </div>
  );
}