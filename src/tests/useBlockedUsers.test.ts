import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBlockedUsers } from '../hooks/useBlockedUsers';

describe('useBlockedUsers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should initialize with empty blocked users', () => {
    const { result } = renderHook(() => useBlockedUsers());
    expect(result.current.blockedUsers).toEqual([]);
  });

  it('should initialize with stored blocked users', () => {
    const storedUsers = ['user1', 'user2'];
    localStorage.setItem('blocked_users', JSON.stringify(storedUsers));
    const { result } = renderHook(() => useBlockedUsers());
    expect(result.current.blockedUsers).toEqual(storedUsers);
  });

  it('should block a user', () => {
    const { result } = renderHook(() => useBlockedUsers());

    act(() => {
      result.current.blockUser('user1');
    });

    expect(result.current.blockedUsers).toContain('user1');
    expect(result.current.isBlocked('user1')).toBe(true);
    expect(JSON.parse(localStorage.getItem('blocked_users') || '[]')).toContain('user1');
  });

  it('should unblock a user', () => {
    const { result } = renderHook(() => useBlockedUsers());

    act(() => {
      result.current.blockUser('user1');
    });

    expect(result.current.isBlocked('user1')).toBe(true);

    act(() => {
      result.current.unblockUser('user1');
    });

    expect(result.current.blockedUsers).not.toContain('user1');
    expect(result.current.isBlocked('user1')).toBe(false);
    expect(JSON.parse(localStorage.getItem('blocked_users') || '[]')).not.toContain('user1');
  });
});
