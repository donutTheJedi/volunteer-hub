import { createRollCallEmail, createReminderEmail, createSignupConfirmationEmail } from '@/lib/email-templates';

function stripWhitespace(html: string) {
  return html.replace(/\s+/g, ' ').trim();
}

describe('email templates', () => {
  it('renders roll call email with key fields', () => {
    const html = createRollCallEmail({
      opportunityTitle: 'Beach Cleanup',
      startTime: '10:00 AM',
      location: 'Miami Beach',
      signupCount: 5,
      estimatedHours: 2,
      rollCallUrl: 'https://example.com/rollcall/123',
    });
    const normalized = stripWhitespace(html);
    expect(normalized).toContain('Roll Call');
    expect(normalized).toContain('Beach Cleanup');
    expect(normalized).toContain('10:00 AM');
    expect(normalized).toContain('Miami Beach');
    expect(normalized).toContain('5 signed up');
    expect(normalized).toContain('https://example.com/rollcall/123');
  });

  it('renders reminder email and includes optional sections', () => {
    const html = createReminderEmail({
      name: 'Alex',
      opportunityTitle: 'Food Bank',
      startTime: 'Tomorrow 9 AM',
      location: 'Downtown',
      estimatedHours: 3,
    });
    const normalized = stripWhitespace(html);
    expect(normalized).toContain('Hi Alex');
    expect(normalized).toContain('Food Bank');
    expect(normalized).toContain('Tomorrow 9 AM');
    expect(normalized).toContain('Downtown');
    expect(normalized).toContain('3 hours');
  });

  it('renders signup confirmation email', () => {
    const html = createSignupConfirmationEmail({
      name: 'Taylor',
      opportunityTitle: 'Park Restoration',
      startTime: 'Sat 1 PM',
      location: 'Central Park',
      estimatedHours: 4,
      organizationName: 'Green Org',
    });
    const normalized = stripWhitespace(html);
    expect(normalized).toContain('Taylor');
    expect(normalized).toContain('Park Restoration');
    expect(normalized).toContain('Central Park');
    expect(normalized).toContain('4 hours');
    expect(normalized).toContain('Green Org');
  });
});

