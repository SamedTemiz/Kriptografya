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
  mistakes: number;
  maxMistakes: number;
  score: number;
  timeLimit: number;
  startTime: number;
  isGameOver: boolean;
  isWon: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Sentence {
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

// Turkish sentences database
export const SENTENCES: Sentence[] = [
  // Easy sentences (3-4 words) - Simple, common words
  { text: 'Güneş doğuyor', difficulty: 'easy', category: 'nature' },
  { text: 'Kedi uyuyor', difficulty: 'easy', category: 'animals' },
  { text: 'Su içiyorum', difficulty: 'easy', category: 'daily' },
  { text: 'Kitap okuyorum', difficulty: 'easy', category: 'education' },
  { text: 'Müzik dinliyorum', difficulty: 'easy', category: 'entertainment' },
  { text: 'Yemek yiyorum', difficulty: 'easy', category: 'daily' },
  { text: 'Arkadaşım geldi', difficulty: 'easy', category: 'social' },
  { text: 'Ev temizliyorum', difficulty: 'easy', category: 'daily' },
  { text: 'Çiçek suluyorum', difficulty: 'easy', category: 'nature' },
  { text: 'Telefon çalıyor', difficulty: 'easy', category: 'technology' },
  { text: 'Bahçe güzeldir', difficulty: 'easy', category: 'nature' },
  { text: 'Sokak sessizdir', difficulty: 'easy', category: 'daily' },
  { text: 'Deniz mavidir', difficulty: 'easy', category: 'nature' },
  { text: 'Kuş uçuyor', difficulty: 'easy', category: 'animals' },
  { text: 'Ağaç yüksektir', difficulty: 'easy', category: 'nature' },

  // Medium sentences (5-7 words) - More complex but still common
  { text: 'Bugün hava çok güzel', difficulty: 'medium', category: 'weather' },
  { text: 'Yarın sinemaya gideceğim', difficulty: 'medium', category: 'entertainment' },
  { text: 'Annem lezzetli yemek yaptı', difficulty: 'medium', category: 'family' },
  { text: 'Okulda matematik dersi var', difficulty: 'medium', category: 'education' },
  { text: 'Parkta çocuklar oynuyor', difficulty: 'medium', category: 'social' },
  { text: 'Kitapçıdan yeni roman aldım', difficulty: 'medium', category: 'education' },
  { text: 'Kahve içmeyi çok seviyorum', difficulty: 'medium', category: 'daily' },
  { text: 'Spor yapmak sağlıklı', difficulty: 'medium', category: 'health' },
  { text: 'Müze gezisi çok eğlenceli', difficulty: 'medium', category: 'culture' },
  { text: 'Arkadaşlarımla piknik yapacağız', difficulty: 'medium', category: 'social' },
  { text: 'Türk kahvesi çok lezzetli', difficulty: 'medium', category: 'culture' },
  { text: 'İstanbul büyük bir şehir', difficulty: 'medium', category: 'geography' },
  { text: 'Kış ayları soğuk geçer', difficulty: 'medium', category: 'weather' },
  { text: 'Akşam yemeği hazırladık', difficulty: 'medium', category: 'daily' },
  { text: 'Müzik dinlemek güzeldir', difficulty: 'medium', category: 'entertainment' },

  // Hard sentences (8+ words) - Complex, longer sentences
  { text: 'Üniversitede bilgisayar mühendisliği okuyorum ve gelecekte yazılım geliştirici olmak istiyorum', difficulty: 'hard', category: 'education' },
  { text: 'Türkiye\'nin en güzel şehirlerinden biri olan İstanbul\'da yaşıyorum ve bu şehri çok seviyorum', difficulty: 'hard', category: 'geography' },
  { text: 'Klasik müzik dinlemeyi seviyorum çünkü ruhumu dinlendiriyor ve hayal gücümü geliştiriyor', difficulty: 'hard', category: 'culture' },
  { text: 'Yaz tatilinde deniz kenarında kitap okumak ve güneşlenmek en sevdiğim aktivitelerden biridir', difficulty: 'hard', category: 'leisure' },
  { text: 'Türk mutfağının zenginliği dünya çapında tanınır ve her bölgenin kendine özgü lezzetleri vardır', difficulty: 'hard', category: 'culture' },
  { text: 'Bilim ve teknoloji alanında çalışmak istiyorum çünkü geleceğin şekillenmesinde önemli rol oynayacağını düşünüyorum', difficulty: 'hard', category: 'education' },
  { text: 'Doğada yürüyüş yapmak hem fiziksel hem de zihinsel sağlığımız için çok faydalı bir aktivitedir', difficulty: 'hard', category: 'health' },
  { text: 'Türk edebiyatının zengin geçmişi ve günümüzdeki gelişimi beni her zaman etkilemiştir', difficulty: 'hard', category: 'culture' },
];

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
    mistakes: 0,
    maxMistakes: 3,
    score: 0,
    timeLimit: difficulty === 'easy' ? 300 : difficulty === 'medium' ? 420 : 600, // 5, 7, 10 minutes
    startTime: Date.now(),
    isGameOver: false,
    isWon: false,
    difficulty,
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

  // Normalize for processing
  const processedLetter = normalizeForProcessing(letter);
  const newState = { 
    ...gameState,
    revealedLetters: new Set(gameState.revealedLetters), // Yeni Set oluştur
    userRevealedPositions: new Set(gameState.userRevealedPositions) // Yeni Set oluştur
  };
  
  // Get all letters from the original sentence (without spaces) and normalize for processing
  const allLetters = normalizeForProcessing(gameState.originalSentence)
    .split('')
    .filter(char => char !== ' ' && char !== '\'' && char !== '.' && char !== ',' && char !== '!' && char !== '?' && char !== ':' && char !== ';' && char !== '-');
  
  // Check if the letter at the target position matches
  const letterAtPosition = allLetters[targetIndex];
  // Compare both original and normalized versions
  const isCorrect = letterAtPosition === processedLetter || 
                   normalizeForProcessing(letterAtPosition) === processedLetter;
  
  if (isCorrect) {
    // Correct guess - add to user revealed positions
    newState.userRevealedPositions.add(targetIndex);
    
    newState.score += 10; // Base score for correct guess
    
    // Check if all letters are revealed (both initial and user revealed)
    const allRevealedLetters = new Set([...newState.revealedLetters]);
    // Add letters from user revealed positions
    newState.userRevealedPositions.forEach(pos => {
      if (pos < allLetters.length) {
        allRevealedLetters.add(allLetters[pos]);
      }
    });
    
    const allLettersRevealed = allLetters.every(char => allRevealedLetters.has(char));
    
    if (allLettersRevealed) {
      newState.isWon = true;
      newState.isGameOver = true;
      // Bonus score for completing the game
      const timeBonus = Math.max(0, newState.timeLimit - Math.floor((Date.now() - newState.startTime) / 1000));
      newState.score += timeBonus * 2;
    }
    
    return { success: true, newState };
  } else {
    // Wrong guess
    newState.mistakes += 1;
    newState.score = Math.max(0, newState.score - 5); // Penalty for wrong guess
    
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
 * Format time as MM:SS
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
