import { sanitizeText, validateInput, escapeHTML } from '../prismSanitize.js';

describe('PRISM Sanitization Utilities', () => {

  describe('sanitizeText', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const expected = 'Hello  World';
      expect(sanitizeText(input)).toBe(expected);
    });

    it('should remove null bytes', () => {
      const input = 'Hello\0 World';
      const expected = 'Hello World';
      expect(sanitizeText(input)).toBe(expected);
    });

    it('should remove inline event handlers', () => {
        const input = '<div onclick="alert(1)">Click me</div>';
        const expected = '<div>Click me</div>';
        expect(sanitizeText(input)).toBe(expected.trim());
    });
  });

  describe('validateInput', () => {
    it('should validate a correct string', () => {
      const schema = { type: 'string', minLength: 2, maxLength: 10 };
      expect(validateInput('test', schema)).toBe(true);
    });

    it('should invalidate a string that is too short', () => {
      const schema = { type: 'string', minLength: 5 };
      expect(validateInput('test', schema)).toBe(false);
    });
    
    it('should validate a correct number', () => {
        const schema = { type: 'number' };
        expect(validateInput(123, schema)).toBe(true);
    });

    it('should invalidate a wrong type', () => {
        const schema = { type: 'number' };
        expect(validateInput('not a number', schema)).toBe(false);
    });
  });

  describe('escapeHTML', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>"\'&`=/</script>';
      const expected = '&lt;script&gt;&quot;&#39;&amp;&#x60;=&#x2F;&lt;&#x2F;script&gt;';
      expect(escapeHTML(input)).toBe(expected);
    });
  });

}); 