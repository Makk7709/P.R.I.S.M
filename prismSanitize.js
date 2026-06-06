/**
 * P.R.I.S.M. Security Module
 * Input sanitization and validation utilities
 */

const sanitizeText = (input) => {
  if (typeof input !== 'string') return '';
  
  // Remove null bytes and control characters
  // Intentional: this sanitizer must match raw control characters (null bytes,
  // C0/C1 controls) in order to strip them — matching them is the goal.
  // eslint-disable-next-line no-control-regex
  let sanitized = input.replace(/[\0-\x1F\x7F-\x9F]/g, '');
  
  // Remove potential script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove other potentially dangerous HTML tags
  sanitized = sanitized.replace(/<(?:javascript|vbscript|expression|iframe|object|embed|style|link|meta)[^>]*>/gi, '');
  
  // Remove inline event handlers
  sanitized = sanitized.replace(/on\w+="[^"]*"/g, '');
  sanitized = sanitized.replace(/on\w+='[^']*'/g, '');
  
  return sanitized.trim();
};

const validateInput = (input, schema) => {
  if (!schema || typeof schema !== 'object') return false;
  
  const {
    type = 'string',
    minLength = 0,
    maxLength = Infinity,
    pattern = null,
    required = true
  } = schema;

  // Check if input is required
  if (required && (input === undefined || input === null || input === '')) {
    return false;
  }

  // Type checking
  if (type === 'string' && typeof input !== 'string') return false;
  if (type === 'number' && typeof input !== 'number') return false;
  if (type === 'boolean' && typeof input !== 'boolean') return false;

  // Length validation for strings
  if (type === 'string') {
    if (input.length < minLength || input.length > maxLength) {
      return false;
    }
  }

  // Pattern matching if specified
  if (pattern && type === 'string') {
    try {
      const regex = new RegExp(pattern);
      if (!regex.test(input)) return false;
    } catch (e) {
      console.error('Invalid regex pattern:', e);
      return false;
    }
  }

  return true;
};

const escapeHTML = (str) => {
  if (typeof str !== 'string') return '';
  
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return str.replace(/[&<>"'`=/]/g, char => escapeMap[char]);
};

export {
  sanitizeText,
  validateInput,
  escapeHTML
}; 