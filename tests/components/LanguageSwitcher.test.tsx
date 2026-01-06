import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import React from 'react';

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/en/opportunities',
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({ update: () => ({ eq: () => ({}) }) }),
  },
}));

describe('LanguageSwitcher', () => {
  it('renders with current locale and navigates on change', async () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('en');

    fireEvent.change(select, { target: { value: 'es' } });
    expect(push).toHaveBeenCalledWith('/es/opportunities');
  });
});

