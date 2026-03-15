import { describe, it, expect, vi } from 'vitest';
import { isValidStackId } from '../ui/src/lib/validation';

describe('Security Validation: isValidStackId', () => {
  it('should accept valid stack IDs', () => {
    expect(isValidStackId('abc123_-')).toBe(true);
    expect(isValidStackId('stack-123')).toBe(true);
    expect(isValidStackId('my_stack')).toBe(true);
  });

  it('should reject path traversal characters', () => {
    expect(isValidStackId('../etc/passwd')).toBe(false);
    expect(isValidStackId('..')).toBe(false);
    expect(isValidStackId('/')).toBe(false);
    expect(isValidStackId('./local')).toBe(false);
  });

  it('should reject other special characters', () => {
    expect(isValidStackId('stack!id')).toBe(false);
    expect(isValidStackId('stack id')).toBe(false);
    expect(isValidStackId('')).toBe(false);
  });
});
