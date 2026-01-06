import { render, screen, fireEvent } from '@testing-library/react';
import OpportunityFilters from '@/components/OpportunityFilters';
import React from 'react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }) }),
  },
}));

const baseFilters = {
  cause_tags: [],
  skills_needed: [],
  is_remote: null as boolean | null,
  time_commitment: [],
  location: '',
  date_range: 'all' as const,
};

describe('OpportunityFilters', () => {
  it('toggles panel and updates filters independently', () => {
    const onFiltersChange = vi.fn();
    render(<OpportunityFilters currentFilters={baseFilters} onFiltersChange={onFiltersChange} />);

    const toggle = screen.getByRole('button', { name: /opportunities.showFilters/i });
    fireEvent.click(toggle);

    const remoteBtn = screen.getByRole('button', { name: /opportunities.remote/i });
    fireEvent.click(remoteBtn);
    expect(onFiltersChange).toHaveBeenCalledWith({ ...baseFilters, is_remote: true });

    const locationInput = screen.getByPlaceholderText(/opportunities.enterCityOrArea/i);
    fireEvent.change(locationInput, { target: { value: 'NYC' } });
    expect(onFiltersChange).toHaveBeenCalledWith({ ...baseFilters, location: 'NYC' });
  });
});

