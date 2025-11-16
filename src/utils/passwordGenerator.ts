/**
 * Password Generator Utility
 * Generate secure temporary passwords
 */

/**
 * Generate a secure temporary password
 * @param length - Length of the password (default: 12)
 * @param includeSpecialChars - Include special characters (default: true)
 * @returns Generated password
 */
export function generateTempPassword(
  length: number = 12,
  includeSpecialChars: boolean = true
): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let charset = lowercase + uppercase + numbers;
  if (includeSpecialChars) {
    charset += special;
  }
  
  // Ensure at least one character from each category
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  if (includeSpecialChars) {
    password += special[Math.floor(Math.random() * special.length)];
  }
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate a memorable password (easier to remember)
 * @param wordCount - Number of words (default: 3)
 * @returns Generated password
 */
export function generateMemorablePassword(wordCount: number = 3): string {
  const words = [
    'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'galaxy',
    'hammer', 'island', 'jungle', 'knight', 'lighthouse', 'mountain',
    'ocean', 'planet', 'quantum', 'rainbow', 'sunset', 'thunder',
    'universe', 'volcano', 'wizard', 'xylophone', 'yacht', 'zenith'
  ];
  
  const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const special = ['!', '@', '#', '$', '%'];
  
  const selectedWords = [];
  for (let i = 0; i < wordCount; i++) {
    selectedWords.push(words[Math.floor(Math.random() * words.length)]);
  }
  
  // Capitalize first letter of each word
  const capitalized = selectedWords.map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  );
  
  // Add a number and special character
  const number = numbers[Math.floor(Math.random() * numbers.length)];
  const specialChar = special[Math.floor(Math.random() * special.length)];
  
  return capitalized.join('') + number + specialChar;
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
  score: number;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];
  
  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');
  
  if (password.length >= 12) score += 1;
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Add special characters');
  
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 2) strength = 'weak';
  else if (score <= 3) strength = 'fair';
  else if (score <= 4) strength = 'good';
  else strength = 'strong';
  
  return { score, strength, feedback };
}
