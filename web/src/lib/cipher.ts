/**
 * Turkish Cipher Game Logic
 * Substitution cipher implementation for Turkish language
 */

import gameSettings from '../config/gameSettings.json';

function getDifficultySettings(difficulty: 'easy' | 'medium' | 'hard') {
  return gameSettings.difficulty[difficulty];
}

function getWordLengthCategory(wordLength: number): string {
  if (wordLength <= 4) return '3-4';
  if (wordLength <= 6) return '5-6';
  if (wordLength <= 8) return '7-8';
  if (wordLength <= 9) return '9';
  if (wordLength <= 12) return '10-12';
  return '12+';
}

/**
 * Normalize text for internal processing (Turkish chars converted to ASCII)
 */
function normalizeForProcessing(text: string): string {
  return text
    .toUpperCase()
    .replace(/İ/g, 'I')  // İ → I
    .replace(/ı/g, 'I')  // ı → I
    .replace(/i/g, 'I')  // i → I
    .replace(/Ğ/g, 'G')  // Ğ → G
    .replace(/ğ/g, 'G')  // ğ → G
    .replace(/Ü/g, 'U')  // Ü → U
    .replace(/ü/g, 'U')  // ü → U
    .replace(/Ş/g, 'S')  // Ş → S
    .replace(/ş/g, 'S')  // ş → S
    .replace(/Ö/g, 'O')  // Ö → O
    .replace(/ö/g, 'O')  // ö → O
    .replace(/Ç/g, 'C')  // Ç → C
    .replace(/ç/g, 'C'); // ç → C
}

/**
 * Normalize text for display (keep Turkish characters)
 */
function normalizeForDisplay(text: string): string {
  return text
    .replace(/i/g, 'İ')  // i → İ (Turkish uppercase i)
    .replace(/ı/g, 'I')  // ı → I (Turkish uppercase ı)
    .toUpperCase();
}

export interface GameState {
  originalSentence: string;
  cipherSentence: string;
  letterMapping: Map<string, number>;
  revealedLetters: Set<string>; // Oyun başında açılan harfler
  userRevealedPositions: Set<number>; // Kullanıcının açtığı pozisyonlar
  initialRevealedPositions: Set<number>; // Oyun başında açılan pozisyonlar
  wordRevealedPositions: Map<string, Set<number>>; // Her kelime için açılan pozisyonlar
  mistakes: number;
  maxMistakes: number;
  timeLimit: number;
  startTime: number;
  isGameOver: boolean;
  isWon: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  hintsUsed: number;
  maxHints: number;
}

export interface GameResult {
  sentenceNumber: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isWon: boolean;
  mistakes: number;
  hintsUsed: number;
  timeSpent: number;
}

export interface Sentence {
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

export interface ProgressiveGameState {
  currentSentenceNumber: number;
  performanceHistory: GameResult[];
  currentDifficulty: 'easy' | 'medium' | 'hard';
  adaptiveMode: boolean;
}

// Import sentences from JSON file
import sentencesData from '@/data/sentences.json';

// Turkish sentences database - loaded from JSON
export const SENTENCES: Sentence[] = sentencesData.sentences.map(sentence => ({
  text: sentence.text,
  difficulty: sentence.difficulty as 'easy' | 'medium' | 'hard',
  category: sentence.category
}));

// Export categories and detailed sentence info for future use
export const SENTENCE_CATEGORIES = sentencesData.categories;
export const SENTENCES_DETAILED = sentencesData.sentences;

/**
 * Generate a random cipher mapping for Turkish alphabet
 */
export function generateCipherMapping(): Map<string, number> {
  const turkishAlphabet = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
  const mapping = new Map<string, number>();
  
  // Create array of numbers 1-29
  const numbers = Array.from({ length: 29 }, (_, i) => i + 1);
  
  // Shuffle numbers
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  // Map each letter to a number
  for (let i = 0; i < turkishAlphabet.length; i++) {
    mapping.set(turkishAlphabet[i], numbers[i]);
  }
  
  return mapping;
}

/**
 * Convert sentence to cipher using letter mapping
 */
export function sentenceToCipher(sentence: string, mapping: Map<string, number>): string {
  return sentence
    .toUpperCase()
    .split('')
    .map(char => {
      if (char === ' ') return ' ';
      if (char === '\'') return '\'';
      if (char === '.') return '.';
      if (char === ',') return ',';
      if (char === '!') return '!';
      if (char === '?') return '?';
      if (char === ':') return ':';
      if (char === ';') return ';';
      if (char === '-') return '-';
      
      // First try with original character, then with normalized
      let number = mapping.get(char);
      if (!number) {
        const normalizedChar = normalizeForProcessing(char);
        number = mapping.get(normalizedChar);
      }
      return number ? number.toString() : char;
    })
    .join('');
}

/**
 * Get a random sentence based on difficulty
 */
export function getRandomSentence(difficulty: 'easy' | 'medium' | 'hard' = 'easy'): Sentence {
  const filteredSentences = SENTENCES.filter(s => s.difficulty === difficulty);
  
  // Filter out sentences with too many consecutive same letters
  const goodSentences = filteredSentences.filter(sentence => {
    const text = sentence.text.toUpperCase();
    // Check for 3 or more consecutive same letters
    for (let i = 0; i < text.length - 2; i++) {
      if (text[i] === text[i + 1] && text[i + 1] === text[i + 2] && text[i] !== ' ') {
        return false;
      }
    }
    return true;
  });
  
  // Use good sentences if available, otherwise fall back to all sentences
  const sentencesToUse = goodSentences.length > 0 ? goodSentences : filteredSentences;
  const randomIndex = Math.floor(Math.random() * sentencesToUse.length);
  return sentencesToUse[randomIndex];
}

/**
 * Initialize a new game
 */
export function initializeGame(difficulty: 'easy' | 'medium' | 'hard' = 'easy'): GameState {
  const sentence = getRandomSentence(difficulty);
  const mapping = generateCipherMapping();
  const cipherSentence = sentenceToCipher(sentence.text, mapping);
  
  const difficultySettings = getDifficultySettings(difficulty);
  
  // Get all letters from the sentence (without spaces) and normalize for processing
  const allLetters = normalizeForProcessing(sentence.text)
    .split('')
    .filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
  
  // Kelime bazlı kısıtlamalar kullanılacak - genel oran sistemi kaldırıldı
  const totalLetters = allLetters.length;
  
  // Kelime bazında kısıtlama: Kelime uzunluğuna göre dinamik maksimum harf sayısı
  const words = sentence.text.split(' ').filter(word => word.trim() !== '');
  const revealedLetters = new Set<string>();
  const wordRevealedPositions = new Map<string, Set<number>>(); // Her kelime için ayrı pozisyon takibi
  
  // Her kelime için ayrı ayrı harf seç
  words.forEach(word => {
    const wordLetters = word
      .toUpperCase()
      .split('')
      .filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
    
    if (wordLetters.length === 0) return;
    
    const difficultySettings = getDifficultySettings(difficulty);
    const wordLengthCategory = getWordLengthCategory(wordLetters.length);
    const maxLettersFromWord = difficultySettings.letterRevealLimits[wordLengthCategory as keyof typeof difficultySettings.letterRevealLimits];
    
    let lettersFromThisWord: number;
    const revealProbability = difficultySettings.revealProbability;
    
    if (difficulty === 'easy') {
      lettersFromThisWord = maxLettersFromWord;
    } else if (difficulty === 'medium') {
      if (wordLetters.length <= 4) {
        const shouldReveal = Math.random() < revealProbability;
        lettersFromThisWord = shouldReveal ? Math.min(1, maxLettersFromWord) : 0;
      } else {
        lettersFromThisWord = maxLettersFromWord;
      }
    } else {
      if (wordLetters.length <= 4) {
        const shouldReveal = Math.random() < revealProbability;
        lettersFromThisWord = shouldReveal ? Math.min(1, maxLettersFromWord) : 0;
      } else {
        lettersFromThisWord = maxLettersFromWord;
      }
    }
    
    let selectedPositions: number[] = [];
    
    if (lettersFromThisWord > 0) {
      const originalWordLetters = word.toUpperCase().split('').filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
      
      const allPositions = originalWordLetters.map((_, index) => index);
       
      if (difficulty === 'easy') {
        const gameMechanics = gameSettings.gameMechanics;
        const commonLetters = gameMechanics.commonLetters;
        
        if (gameMechanics.easyMode.useEdgePositions) {
          const edgePositions = [0, originalWordLetters.length - 1];
          
          const commonPositions = allPositions.filter(index => 
            commonLetters.includes(originalWordLetters[index])
          );
          
          const rarePositions = allPositions.filter(index => 
            !commonLetters.includes(originalWordLetters[index])
          );
          
          let priorityPositions = [...new Set([...edgePositions, ...commonPositions, ...rarePositions])];
          priorityPositions = priorityPositions.slice(0, Math.min(lettersFromThisWord, priorityPositions.length));
          
          selectedPositions = priorityPositions;
        } else {
          const shuffledPositions = allPositions.sort(() => Math.random() - 0.5);
          selectedPositions = shuffledPositions.slice(0, Math.min(lettersFromThisWord, allPositions.length));
        }
      } else {
        const shuffledPositions = allPositions.sort(() => Math.random() - 0.5);
        selectedPositions = shuffledPositions.slice(0, Math.min(lettersFromThisWord, allPositions.length));
      }
       
     }
     
    if (!wordRevealedPositions.has(word)) {
      wordRevealedPositions.set(word, new Set<number>());
    }
    
    selectedPositions.forEach(positionIndex => {
      const originalWordLetters = word.split('').filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
      const letter = normalizeForDisplay(originalWordLetters[positionIndex]);
      wordRevealedPositions.get(word)!.add(positionIndex);
    });
  });
  
  
  
  const initialRevealedPositions = new Set<number>();
  let globalPositionIndex = 0;

  words.forEach(word => {
    const wordPositions = wordRevealedPositions.get(word);
    if (wordPositions) {
      wordPositions.forEach(position => {
        initialRevealedPositions.add(globalPositionIndex + position);
      });
    }
    const wordLetters = word.split('').filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
    globalPositionIndex += wordLetters.length;
  });

  return {
    originalSentence: sentence.text,
    cipherSentence,
    letterMapping: mapping,
    revealedLetters: new Set<string>(),
    userRevealedPositions: new Set<number>(),
    initialRevealedPositions: initialRevealedPositions,
    wordRevealedPositions: wordRevealedPositions,
    mistakes: 0,
    maxMistakes: 3,
    timeLimit: difficultySettings.timeLimit,
    startTime: Date.now(),
    isGameOver: false,
    isWon: false,
    difficulty,
    hintsUsed: 0,
    maxHints: difficultySettings.hintCount,
  };
}

/**
 * Make a guess for a letter at a specific position
 */
export function makeGuess(
  gameState: GameState, 
  letter: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  targetIndex?: number
): { success: boolean; newState: GameState } {
  if (gameState.isGameOver || targetIndex === undefined) {
    return { success: false, newState: gameState };
  }

  // Keep user input as-is (no normalization for Turkish letters) - use Turkish locale
  const userLetter = letter.toLocaleUpperCase('tr-TR');
  const newState = { 
    ...gameState,
    revealedLetters: new Set(gameState.revealedLetters), // Yeni Set oluştur
    userRevealedPositions: new Set(gameState.userRevealedPositions) // Yeni Set oluştur
  };
  
  // Get all letters from the original sentence (without spaces) - use Turkish locale
  const allLetters = gameState.originalSentence
    .toLocaleUpperCase('tr-TR')
    .split('')
    .filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
  
  // Check if the letter at the target position matches (exact match for Turkish letters)
  const letterAtPosition = allLetters[targetIndex];
  const isCorrect = letterAtPosition === userLetter;
  
  if (isCorrect) {
    // Correct guess - add to user revealed positions
    newState.userRevealedPositions.add(targetIndex);
    
    // Check if all letters are revealed (both initial and user revealed)
    const allLettersRevealed = checkGameCompletion(newState, []);
    
    if (allLettersRevealed) {
      newState.isWon = true;
      newState.isGameOver = true;
    }
    
    return { success: true, newState };
  } else {
    // Wrong guess
    newState.mistakes += 1;
    
    if (newState.mistakes >= newState.maxMistakes) {
      newState.isGameOver = true;
      newState.isWon = false;
    }
    
    return { success: false, newState };
  }
}


/**
 * Get remaining time in seconds
 */
export function getRemainingTime(gameState: GameState): number {
  const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
  return Math.max(0, gameState.timeLimit - elapsed);
}

/**
 * Use hint to reveal letters based on difficulty level
 */
export function useHint(
  gameState: GameState, 
  progressiveState?: ProgressiveGameState
): { success: boolean; revealedPositions?: number[]; message: string; isGameCompleted?: boolean } {
  if (gameState.hintsUsed >= gameState.maxHints) {
    return { success: false, message: 'Tüm ipuçları kullanıldı!' };
  }

  // Get all words and their revealed positions
  const words = gameState.originalSentence.split(' ').filter(word => word.trim() !== '');
  const availableWords: { word: string; availablePositions: number[] }[] = [];

  let globalPositionIndex = 0;
  words.forEach(word => {
    const wordLetters = word.split('').filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
    const availablePositions: number[] = [];
    
    for (let i = 0; i < wordLetters.length; i++) {
      const globalPos = globalPositionIndex + i;
      if (!gameState.initialRevealedPositions.has(globalPos) && !gameState.userRevealedPositions.has(globalPos)) {
        availablePositions.push(globalPos);
      }
    }
    
    if (availablePositions.length > 0) {
      availableWords.push({ word, availablePositions });
    }
    
    globalPositionIndex += wordLetters.length;
  });

  if (availableWords.length === 0) {
    return { success: false, message: 'Açılacak harf kalmadı!' };
  }

  // Select random word
  const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
  
  // Select one random position from the chosen word
  const shuffledPositions = [...randomWord.availablePositions].sort(() => Math.random() - 0.5);
  const selectedPosition = shuffledPositions[0];
  
  let revealedPositions: number[];
  
  // Determine hint strength based on difficulty and progressive system
  const hintStrength = getHintStrength(gameState.difficulty, progressiveState);
  
  if (hintStrength === 'strong') {
    // Strong hint: Reveal all instances of the same letter (like old easy mode)
    const allLetters = normalizeForProcessing(gameState.originalSentence)
      .split('')
      .filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
    
    const selectedLetter = allLetters[selectedPosition];
    
    // Find all positions where this letter appears (that are not already revealed)
    const allPositionsWithSameLetter: number[] = [];
    for (let i = 0; i < allLetters.length; i++) {
      if (allLetters[i] === selectedLetter && 
          !gameState.initialRevealedPositions.has(i) && 
          !gameState.userRevealedPositions.has(i)) {
        allPositionsWithSameLetter.push(i);
      }
    }
    
    revealedPositions = allPositionsWithSameLetter;
  } else {
    // Weak hint: Reveal only the selected position (like old medium/hard mode)
    revealedPositions = [selectedPosition];
  }

  return { 
    success: true, 
    revealedPositions: revealedPositions, 
    message: '',
    isGameCompleted: checkGameCompletion(gameState, revealedPositions)
  };
}

/**
 * Check if game is completed after revealing new positions
 */
function checkGameCompletion(
  gameState: GameState, 
  newRevealedPositions: number[]
): boolean {
  // Get all letters from the sentence - use Turkish locale
  const allLetters = gameState.originalSentence
    .toLocaleUpperCase('tr-TR')
    .split('')
    .filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
  
  // Combine all revealed positions (initial + user + new from hint)
  const allRevealedPositions = new Set([
    ...gameState.initialRevealedPositions,
    ...gameState.userRevealedPositions,
    ...newRevealedPositions
  ]);
  
  // Check if all positions are revealed
  return allLetters.every((_, index) => allRevealedPositions.has(index));
}

/**
 * Determine hint strength based on difficulty and progressive system
 */
function getHintStrength(
  difficulty: 'easy' | 'medium' | 'hard',
  progressiveState?: ProgressiveGameState
): 'strong' | 'weak' {
  // Base strength from difficulty
  if (difficulty === 'easy') {
    return 'strong';
  }
  
  // Hard mode always gives weak hints (only 1 letter)
  if (difficulty === 'hard') {
    return 'weak';
  }
  
  // For medium/hard, consider progressive system
  if (progressiveState) {
    const sentenceNumber = progressiveState.currentSentenceNumber;
    const performanceHistory = progressiveState.performanceHistory;
    
    // If player is struggling (low success rate), give stronger hints
    if (performanceHistory.length >= 3) {
      const last3Games = performanceHistory.slice(-3);
      const successRate = last3Games.filter((game: GameResult) => game.isWon).length / last3Games.length;
      
      if (successRate < 0.5) {
        return 'strong'; // Player struggling, give stronger hints
      }
    }
    
    // Early in the game (first 10 sentences), give stronger hints
    if (sentenceNumber <= 10) {
      return 'strong';
    }
  }
  
  // Default to weak hint for medium
  return 'weak';
}

/**
 * Calculate next difficulty based on sentence number and performance
 */
export function calculateNextDifficulty(
  sentenceNumber: number,
  recentPerformance: GameResult[]
): 'easy' | 'medium' | 'hard' {
  // Get last 5 games performance
  const last5Games = recentPerformance.slice(-5);
  
  if (last5Games.length === 0) {
    // First game - start with easy
    return 'easy';
  }
  
  // Calculate success rate
  const successRate = last5Games.filter(game => game.isWon).length / last5Games.length;
  const averageMistakes = last5Games.reduce((sum, game) => sum + game.mistakes, 0) / last5Games.length;
  
  // Progressive difficulty based on sentence number
  if (sentenceNumber <= 5) {
    // First 5 sentences: 70% easy, 30% medium
    return Math.random() < 0.7 ? 'easy' : 'medium';
  } else if (sentenceNumber <= 15) {
    // Sentences 6-15: 50% easy, 40% medium, 10% hard
    const rand = Math.random();
    if (rand < 0.5) return 'easy';
    if (rand < 0.9) return 'medium';
    return 'hard';
  } else if (sentenceNumber <= 30) {
    // Sentences 16-30: 30% easy, 50% medium, 20% hard
    const rand = Math.random();
    if (rand < 0.3) return 'easy';
    if (rand < 0.8) return 'medium';
    return 'hard';
  } else {
    // Sentences 31+: 20% easy, 40% medium, 40% hard
    const rand = Math.random();
    if (rand < 0.2) return 'easy';
    if (rand < 0.6) return 'medium';
    return 'hard';
  }
}

/**
 * Initialize progressive game state
 */
export function initializeProgressiveGame(): ProgressiveGameState {
  return {
    currentSentenceNumber: 1,
    performanceHistory: [],
    currentDifficulty: 'easy',
    adaptiveMode: true
  };
}

/**
 * Get next sentence with adaptive difficulty
 */
export function getNextProgressiveSentence(progressiveState: ProgressiveGameState): Sentence {
  const nextDifficulty = calculateNextDifficulty(
    progressiveState.currentSentenceNumber,
    progressiveState.performanceHistory
  );
  
  return getRandomSentence(nextDifficulty);
}

/**
 * Get a specific sentence by ID
 */
export function getSentenceById(id: number): Sentence | null {
  const sentence = SENTENCES_DETAILED.find(s => s.id === id);
  if (!sentence) return null;
  
  return {
    text: sentence.text,
    difficulty: sentence.difficulty as 'easy' | 'medium' | 'hard',
    category: sentence.category
  };
}

/**
 * Get sentences by category
 */
export function getSentencesByCategory(category: string): Sentence[] {
  return SENTENCES_DETAILED
    .filter(s => s.category === category)
    .map(sentence => ({
      text: sentence.text,
      difficulty: sentence.difficulty as 'easy' | 'medium' | 'hard',
      category: sentence.category
    }));
}

/**
 * Get sentences by difficulty
 */
export function getSentencesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Sentence[] {
  return SENTENCES_DETAILED
    .filter(s => s.difficulty === difficulty)
    .map(sentence => ({
      text: sentence.text,
      difficulty: sentence.difficulty as 'easy' | 'medium' | 'hard',
      category: sentence.category
    }));
}

/**
 * Record game result and update progressive state
 */
export function recordGameResult(
  progressiveState: ProgressiveGameState,
  gameResult: GameResult
): ProgressiveGameState {
  const newPerformanceHistory = [...progressiveState.performanceHistory, gameResult];
  
  return {
    ...progressiveState,
    currentSentenceNumber: progressiveState.currentSentenceNumber + 1,
    performanceHistory: newPerformanceHistory,
    currentDifficulty: calculateNextDifficulty(
      progressiveState.currentSentenceNumber + 1,
      newPerformanceHistory
    )
  };
}

/**
 * Format time as MM:SS
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Initialize a game with a custom sentence
 */
export function initializeCustomGame(customSentence: Sentence): GameState {
  const mapping = generateCipherMapping();
  const cipherSentence = sentenceToCipher(customSentence.text, mapping);
  
  const difficultySettings = getDifficultySettings(customSentence.difficulty);
  
  // Get all letters from the sentence (without spaces) and normalize for processing
  const allLetters = normalizeForProcessing(customSentence.text)
    .split('')
    .filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
  
  // Kelime bazlı kısıtlamalar kullanılacak - genel oran sistemi kaldırıldı
  const totalLetters = allLetters.length;
  
  // Kelime bazında kısıtlama: Kelime uzunluğuna göre dinamik maksimum harf sayısı
  const words = customSentence.text.split(' ').filter(word => word.trim() !== '');
  const revealedLetters = new Set<string>();
  const wordRevealedPositions = new Map<string, Set<number>>(); // Her kelime için ayrı pozisyon takibi
  
  // Her kelime için ayrı ayrı harf seç
  words.forEach(word => {
    const wordLetters = word
      .toUpperCase()
      .split('')
      .filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
    
    if (wordLetters.length === 0) return;
    
    const wordLengthCategory = getWordLengthCategory(wordLetters.length);
    const maxLettersFromWord = difficultySettings.letterRevealLimits[wordLengthCategory as keyof typeof difficultySettings.letterRevealLimits];
    
    let lettersFromThisWord: number;
    const revealProbability = difficultySettings.revealProbability;
    
    if (customSentence.difficulty === 'easy') {
      lettersFromThisWord = maxLettersFromWord;
    } else if (customSentence.difficulty === 'medium') {
      if (wordLetters.length <= 4) {
        const shouldReveal = Math.random() < revealProbability;
        lettersFromThisWord = shouldReveal ? Math.min(1, maxLettersFromWord) : 0;
      } else {
        lettersFromThisWord = maxLettersFromWord;
      }
    } else {
      if (wordLetters.length <= 4) {
        const shouldReveal = Math.random() < revealProbability;
        lettersFromThisWord = shouldReveal ? Math.min(1, maxLettersFromWord) : 0;
      } else {
        lettersFromThisWord = maxLettersFromWord;
      }
    }
    
    let selectedPositions: number[] = [];
    
    if (lettersFromThisWord > 0) {
      const originalWordLetters = word.toUpperCase().split('').filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
      
      const allPositions = originalWordLetters.map((_, index) => index);
       
      if (customSentence.difficulty === 'easy') {
        const gameMechanics = gameSettings.gameMechanics;
        const commonLetters = gameMechanics.commonLetters;
        
        // Kolay modda: Yaygın harfleri tercih et
        const commonLetterPositions = originalWordLetters
          .map((letter, index) => ({ letter, index }))
          .filter(({ letter }) => commonLetters.includes(letter))
          .map(({ index }) => index);
        
        if (commonLetterPositions.length > 0) {
          const shuffled = [...commonLetterPositions].sort(() => Math.random() - 0.5);
          selectedPositions = shuffled.slice(0, lettersFromThisWord);
        } else {
          // Yaygın harf yoksa rastgele seç
          const shuffled = [...allPositions].sort(() => Math.random() - 0.5);
          selectedPositions = shuffled.slice(0, lettersFromThisWord);
        }
      } else {
        // Orta/Zor modda: Rastgele seç
        const shuffled = [...allPositions].sort(() => Math.random() - 0.5);
        selectedPositions = shuffled.slice(0, lettersFromThisWord);
      }
      
      // Seçilen pozisyonları işle
      selectedPositions.forEach(pos => {
        const letter = originalWordLetters[pos];
        revealedLetters.add(letter);
        
        // Kelime bazlı pozisyon takibi için kelimeyi anahtar olarak kullan
        if (!wordRevealedPositions.has(word)) {
          wordRevealedPositions.set(word, new Set());
        }
        wordRevealedPositions.get(word)!.add(pos);
      });
    }
  });
  
  // İlk açılan harflerin pozisyonlarını hesapla (tüm cümle için)
  const initialRevealedPositions = new Set<number>();
  let globalPosition = 0;
  
  words.forEach(word => {
    const wordPositions = wordRevealedPositions.get(word);
    if (wordPositions) {
      wordPositions.forEach(pos => {
        initialRevealedPositions.add(globalPosition + pos);
      });
    }
    globalPosition += word.toUpperCase().split('').filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-').length;
  });
  
  return {
    originalSentence: customSentence.text,
    cipherSentence,
    letterMapping: mapping,
    difficulty: customSentence.difficulty,
    mistakes: 0,
    maxMistakes: 3,
    hintsUsed: 0,
    maxHints: difficultySettings.hintCount,
    timeLimit: difficultySettings.timeLimit,
    startTime: Date.now(),
    isGameOver: false,
    isWon: false,
    revealedLetters,
    initialRevealedPositions,
    userRevealedPositions: new Set(),
    wordRevealedPositions: wordRevealedPositions
  };
}
