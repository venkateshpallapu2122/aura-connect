import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('c-1', 'c-2');
    expect(result).toBe('c-1 c-2');
  });

  it('handles conditional classes', () => {
    const result = cn('c-1', true && 'c-2', false && 'c-3');
    expect(result).toBe('c-1 c-2');
  });

  it('merges tailwind classes correctly', () => {
    // tailwind-merge should resolve conflicts
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('handles arrays and objects', () => {
    const result = cn(['c-1', 'c-2'], { 'c-3': true, 'c-4': false });
    expect(result).toBe('c-1 c-2 c-3');
  });
});
