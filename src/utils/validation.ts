/**
 * Form validation utilities for TSS Cleaners
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validators = {
  /**
   * Validates user name
   */
  name: (value: string): ValidationResult => {
    const trimmed = value.trim();
    if (!trimmed) return { isValid: false, error: 'Name is required' };
    if (trimmed.length < 2) return { isValid: false, error: 'Name must be at least 2 characters' };
    if (trimmed.length > 50) return { isValid: false, error: 'Name must not exceed 50 characters' };
    return { isValid: true };
  },

  /**
   * Validates phone number (basic format)
   */
  phone: (value: string): ValidationResult => {
    if (!value.trim()) return { isValid: true }; // Optional field
    const phoneRegex = /^[\d\s\-+().]*$/;
    if (!phoneRegex.test(value)) {
      return { isValid: false, error: 'Invalid phone number format' };
    }
    return { isValid: true };
  },

  /**
   * Validates avatar initials
   */
  avatarInitials: (value: string): ValidationResult => {
    if (value.length !== 2) return { isValid: false, error: 'Initials must be exactly 2 characters' };
    if (!/^[A-Z]{2}$/.test(value)) return { isValid: false, error: 'Initials must be 2 uppercase letters' };
    return { isValid: true };
  },

  /**
   * Validates PIN
   */
  pin: (value: string): ValidationResult => {
    if (!value) return { isValid: false, error: 'PIN is required' };
    if (value.length < 4) return { isValid: false, error: 'PIN must be at least 4 characters' };
    if (value.length > 20) return { isValid: false, error: 'PIN must not exceed 20 characters' };
    return { isValid: true };
  },

  /**
   * Validates PIN confirmation
   */
  pinConfirmation: (newPin: string, confirmation: string): ValidationResult => {
    if (newPin !== confirmation) return { isValid: false, error: 'PINs do not match' };
    return { isValid: true };
  },

  /**
   * Validates email address
   */
  email: (value: string): ValidationResult => {
    if (!value.trim()) return { isValid: true }; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return { isValid: false, error: 'Invalid email address' };
    return { isValid: true };
  },

  /**
   * Validates hourly rate
   */
  hourlyRate: (value: number): ValidationResult => {
    if (value < 0) return { isValid: false, error: 'Hourly rate cannot be negative' };
    if (value > 10000) return { isValid: false, error: 'Hourly rate seems too high' };
    return { isValid: true };
  },

  /**
   * Validates amount (for payments/expenses)
   */
  amount: (value: number): ValidationResult => {
    if (value <= 0) return { isValid: false, error: 'Amount must be greater than 0' };
    if (value > 999999) return { isValid: false, error: 'Amount is too large' };
    if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) return { isValid: false, error: 'Invalid amount format' };
    return { isValid: true };
  },

  /**
   * Validates business name
   */
  businessName: (value: string): ValidationResult => {
    const trimmed = value.trim();
    if (!trimmed) return { isValid: false, error: 'Business name is required' };
    if (trimmed.length < 2) return { isValid: false, error: 'Business name must be at least 2 characters' };
    if (trimmed.length > 100) return { isValid: false, error: 'Business name must not exceed 100 characters' };
    return { isValid: true };
  },

  /**
   * Validates address
   */
  address: (value: string): ValidationResult => {
    const trimmed = value.trim();
    if (!trimmed) return { isValid: false, error: 'Address is required' };
    if (trimmed.length < 5) return { isValid: false, error: 'Address must be at least 5 characters' };
    if (trimmed.length > 200) return { isValid: false, error: 'Address must not exceed 200 characters' };
    return { isValid: true };
  },

  /**
   * Validates postal code (Canadian format)
   */
  postalCode: (value: string): ValidationResult => {
    const trimmed = value.trim().toUpperCase();
    const postalRegex = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/;
    if (!postalRegex.test(trimmed)) {
      return { isValid: false, error: 'Invalid Canadian postal code format (e.g., K1A 0B1)' };
    }
    return { isValid: true };
  },

  /**
   * Validates contract rate
   */
  contractRate: (value: number): ValidationResult => {
    if (value <= 0) return { isValid: false, error: 'Contract rate must be greater than 0' };
    if (value > 999999) return { isValid: false, error: 'Contract rate is too high' };
    return { isValid: true };
  },
};

/**
 * Combines multiple validators
 */
export const validateForm = (
  fields: Record<string, any>,
  rules: Record<string, (value: any) => ValidationResult>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(fields[field]);
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
