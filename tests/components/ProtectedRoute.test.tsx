import { render } from '@testing-library/react';
import ProtectedRoute from '@/components/protected-route';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

describe('ProtectedRoute', () => {
  it('redirects when unauthenticated (renders null)', () => {
    const { container } = render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    );
    expect(container.firstChild).toBeNull();
  });
});

