/**
 * Indian Mobile Phone Number Validator and Formatter
 * 
 * Takes various phone number inputs (e.g. "+91 94250 11088", "919425011088", "9425011088", "09425011088")
 * and validates that there are exactly 10 core mobile digits.
 * Returns the standardized "+91xxxxxxxxxx" format, or null if invalid.
 */
export function validateAndFormatIndianPhone(phoneInput: string): string | null {
  if (!phoneInput) return null;
  
  // Remove all non-digit characters
  const digits = phoneInput.replace(/\D/g, '');
  
  // If digits are 12 digits and start with '91'
  if (digits.length === 12 && digits.startsWith('91')) {
    return '+91' + digits.slice(2);
  }
  
  // If digits are 11 digits and start with '0'
  if (digits.length === 11 && digits.startsWith('0')) {
    return '+91' + digits.slice(1);
  }
  
  // If digits are exactly 10 digits
  if (digits.length === 10) {
    return '+91' + digits;
  }
  
  return null;
}
