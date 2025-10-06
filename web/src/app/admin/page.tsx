'use client';

import { useState, useEffect } from 'react';
import CryptographyGame from '@/components/CryptographyGame';
import { 
  GameState, 
  ProgressiveGameState, 
  GameResult,
  initializeProgressiveGame,
  recordGameResult,
  SENTENCE_CATEGORIES,
  SENTENCES_DETAILED,
  getSentenceById
} from '@/lib/cipher';

export default function TestScreen() {
  const [progressiveState, setProgressiveState] = useState<ProgressiveGameState>(initializeProgressiveGame());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedSentenceId, setSelectedSentenceId] = useState<number | null>(null);

  // Listen to game state changes from CryptographyGame
  useEffect(() => {
    const handleGameStateChange = (event: CustomEvent<GameState>) => {
      setGameState(event.detail);
    };

    const handleProgressiveStateChange = (event: CustomEvent<ProgressiveGameState>) => {
      setProgressiveState(event.detail);
    };

    const handleGameResult = (event: CustomEvent<GameResult>) => {
      setGameResults(prev => [...prev, event.detail]);
    };

    window.addEventListener('gameStateChange', handleGameStateChange as EventListener);
    window.addEventListener('progressiveStateChange', handleProgressiveStateChange as EventListener);
    window.addEventListener('gameResult', handleGameResult as EventListener);

    return () => {
      window.removeEventListener('gameStateChange', handleGameStateChange as EventListener);
      window.removeEventListener('progressiveStateChange', handleProgressiveStateChange as EventListener);
      window.removeEventListener('gameResult', handleGameResult as EventListener);
    };
  }, []);

  const resetSystem = () => {
    setProgressiveState(initializeProgressiveGame());
    setGameResults([]);
    // Trigger new game in CryptographyGame
    window.dispatchEvent(new CustomEvent('resetGame'));
  };

  const startNewGame = () => {
    window.dispatchEvent(new CustomEvent('startNewGame'));
  };

  const startCustomGame = () => {
    if (selectedSentenceId) {
      window.dispatchEvent(new CustomEvent('startCustomGame', { 
        detail: { sentenceId: selectedSentenceId } 
      }));
    }
  };

  // Filter sentences based on selected filters
  const filteredSentences = SENTENCES_DETAILED.filter(sentence => {
    const categoryMatch = selectedCategory === 'all' || sentence.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || sentence.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const successRate = gameResults.length > 0 
    ? (gameResults.filter(r => r.isWon).length / gameResults.length * 100).toFixed(1)
    : '0';

  const averageMistakes = gameResults.length > 0
    ? (gameResults.reduce((sum, r) => sum + r.mistakes, 0) / gameResults.length).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Left Sidebar - Game Info */}
      <div className="w-80 bg-gray-800 p-6 overflow-y-auto">
        <h2 className="text-white text-xl font-semibold mb-6">Test Bilgileri</h2>
        
        {/* Current Game Info */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-3">Mevcut Oyun</h3>
          {gameState ? (
            <div className="space-y-2 text-sm">
              <div className="text-gray-300">
                <span className="text-gray-400">Cümle:</span> {gameState.originalSentence}
              </div>
              <div className="text-gray-300">
                <span className="text-gray-400">Zorluk:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  gameState.difficulty === 'easy' ? 'bg-green-600' :
                  gameState.difficulty === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
                }`}>
                  {gameState.difficulty === 'easy' ? 'Kolay' : 
                   gameState.difficulty === 'medium' ? 'Normal' : 'Zor'}
                </span>
              </div>
              <div className="text-gray-300">
                <span className="text-gray-400">Harf Sayısı:</span> {gameState.revealedLetters.size}
              </div>
              <div className="text-gray-300">
                <span className="text-gray-400">Hata:</span> {gameState.mistakes}
              </div>
              <div className="text-gray-300">
                <span className="text-gray-400">İpucu:</span> {gameState.hintsUsed}/{gameState.maxHints}
              </div>
              <div className="text-gray-300">
                <span className="text-gray-400">Durum:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  gameState.isGameOver ? 'bg-red-600' : 'bg-green-600'
                }`}>
                  {gameState.isGameOver ? 'Bitti' : 'Devam Ediyor'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">Oyun başlamadı</div>
          )}
        </div>

        {/* Progressive System Info */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-3">Progresif Sistem</h3>
          <div className="space-y-2 text-sm">
            <div className="text-gray-300">
              <span className="text-gray-400">Cümle No:</span> {progressiveState.currentSentenceNumber}
            </div>
            <div className="text-gray-300">
              <span className="text-gray-400">Toplam Oyun:</span> {gameResults.length}
            </div>
            <div className="text-gray-300">
              <span className="text-gray-400">Başarı Oranı:</span> {successRate}%
            </div>
            <div className="text-gray-300">
              <span className="text-gray-400">Ort. Hata:</span> {averageMistakes}
            </div>
          </div>
        </div>

        {/* Recent Games */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-3">Son Oyunlar</h3>
          <div className="space-y-1 text-xs">
            {gameResults.slice(-5).reverse().map((result, index) => (
              <div key={index} className="flex justify-between text-gray-300">
                <span>Cümle {result.sentenceNumber}</span>
                <span className={`px-2 py-1 rounded ${
                  result.isWon ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  {result.isWon ? '✓' : '✗'}
                </span>
              </div>
            ))}
            {gameResults.length === 0 && (
              <div className="text-gray-400">Henüz oyun yok</div>
            )}
          </div>
        </div>

        {/* Sentence Selector */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-3">Cümle Seçici</h3>
          
          {/* Category Filter */}
          <div className="mb-3">
            <label className="block text-gray-300 text-sm mb-1">Kategori</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm border border-gray-500"
            >
              <option value="all">Tümü</option>
              {Object.entries(SENTENCE_CATEGORIES).map(([key, category]) => (
                <option key={key} value={key}>{category.name}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="mb-3">
            <label className="block text-gray-300 text-sm mb-1">Zorluk</label>
            <select 
              value={selectedDifficulty} 
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm border border-gray-500"
            >
              <option value="all">Tümü</option>
              <option value="easy">Kolay</option>
              <option value="medium">Orta</option>
              <option value="hard">Zor</option>
            </select>
          </div>

          {/* Sentence List */}
          <div className="mb-3">
            <label className="block text-gray-300 text-sm mb-1">Cümleler ({filteredSentences.length})</label>
            <div className="max-h-40 overflow-y-auto bg-gray-600 rounded border border-gray-500">
              {filteredSentences.map((sentence) => (
                <div 
                  key={sentence.id}
                  className={`p-2 text-xs cursor-pointer hover:bg-gray-500 transition-colors ${
                    selectedSentenceId === sentence.id ? 'bg-blue-600' : ''
                  }`}
                  onClick={() => setSelectedSentenceId(sentence.id)}
                >
                  <div className="text-white font-medium truncate">{sentence.text}</div>
                  <div className="text-gray-400 flex items-center gap-2 mt-1">
                    <span className={`px-1 py-0.5 rounded text-xs ${
                      sentence.difficulty === 'easy' ? 'bg-green-600' :
                      sentence.difficulty === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
                    }`}>
                      {sentence.difficulty === 'easy' ? 'K' : 
                       sentence.difficulty === 'medium' ? 'O' : 'Z'}
                    </span>
                    <span style={{ color: (SENTENCE_CATEGORIES as any)[sentence.category]?.color }}>
                      {(SENTENCE_CATEGORIES as any)[sentence.category]?.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Game Button */}
          <button 
            onClick={startCustomGame}
            disabled={!selectedSentenceId}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedSentenceId 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            Seçili Cümle ile Oyna
          </button>
        </div>

        {/* Test Controls */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">Test Kontrolleri</h3>
          <div className="space-y-2">
            <button 
              onClick={startNewGame}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Rastgele Oyun
            </button>
            <button 
              onClick={resetSystem}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Sistemi Sıfırla
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1">
        <CryptographyGame />
      </div>
    </div>
  );
}