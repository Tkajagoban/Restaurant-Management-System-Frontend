/**
 * Centralized Phone Number Validation Utility
 * 
 * Validation rules:
 * - Phone Number must contain only digits
 * - Minimum length: 8 digits
 * - Maximum length: 15 digits
 * 
 * This utility provides consistent phone validation across the entire application.
 */

export interface PhoneValidationResult {
    isValid: boolean;
    error: string | null;
}

/**
 * Extracts only digits from a phone number string
 * Removes spaces, dashes, parentheses, and other non-digit characters
 */
export const extractDigits = (value: string): string => {
    return value.replace(/\D/g, '');
};

/**
 * Validates a phone number according to the application rules:
 * - Must contain only digits (after normalization)
 * - Minimum 8 digits
 * - Maximum 15 digits
 * 
 * @param phoneNumber - The phone number to validate
 * @param required - Whether the phone number is required (defaults to false)
 * @returns PhoneValidationResult with isValid flag and error message if invalid
 */
export const validatePhoneNumber = (
    phoneNumber: string,
    required: boolean = false
): PhoneValidationResult => {
    const trimmed = phoneNumber.trim();

    // If not required and empty, it's valid
    if (!trimmed) {
        if (required) {
            return { isValid: false, error: 'Phone number is required' };
        }
        return { isValid: true, error: null };
    }

    // Check for non-digit characters (allowing spaces for formatting)
    // First, check if there are any non-digit characters other than spaces
    const withoutSpaces = trimmed.replace(/\s+/g, '');
    if (/[^0-9]/.test(withoutSpaces)) {
        return { isValid: false, error: 'Phone number must contain only digits' };
    }

    // Extract only digits for length validation
    const digits = extractDigits(trimmed);

    // Check minimum length
    if (digits.length < 8) {
        return { isValid: false, error: 'Phone number must be at least 8 digits' };
    }

    // Check maximum length
    if (digits.length > 15) {
        return { isValid: false, error: 'Phone number cannot exceed 15 digits' };
    }

    return { isValid: true, error: null };
};

/**
 * Normalizes a phone number by removing all non-digit characters
 * Use this before sending to API
 */
export const normalizePhoneNumber = (value: string): string => {
    return value.replace(/\s+/g, '');
};

/**
 * Formats a phone number for display
 * Groups digits for better readability (e.g., 077 427 8564)
 */
export const formatPhoneDisplay = (value: string): string => {
    const digits = extractDigits(value);
    if (!digits) return '';

    // Format as 3-3-remaining to get e.g. 077 427 8564 for 10 digits
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;

    // For longer numbers (up to 15), group every 3 digits for readability
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
};

/**
 * Restricts input to only allow digits and spaces (for formatting)
 * Use this in onChange handlers to prevent invalid input
 */
export const sanitizePhoneInput = (value: string): string => {
    // Allow only digits and spaces
    return value.replace(/[^0-9\s]/g, '');
};
