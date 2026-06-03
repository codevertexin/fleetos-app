import { describe, expect, it } from 'vitest';
import { matchesExpectedAccessState } from './access-routing';

describe('matchesExpectedAccessState', () => {
  it('allows any state when expected is omitted', () => {
    expect(matchesExpectedAccessState('active')).toBe(true);
    expect(matchesExpectedAccessState(undefined)).toBe(true);
  });

  it('matches a single expected state', () => {
    expect(matchesExpectedAccessState('active_unsubscribed', 'active_unsubscribed')).toBe(true);
    expect(matchesExpectedAccessState('active', 'active_unsubscribed')).toBe(false);
  });

  it('matches when current is in expected list (setup app /app guard)', () => {
    const appSetup: ['active_unsubscribed', 'active'] = ['active_unsubscribed', 'active'];
    expect(matchesExpectedAccessState('active_unsubscribed', appSetup)).toBe(true);
    expect(matchesExpectedAccessState('active', appSetup)).toBe(true);
    expect(matchesExpectedAccessState('pending_review', appSetup)).toBe(false);
    expect(matchesExpectedAccessState('needs_onboarding', appSetup)).toBe(false);
    expect(matchesExpectedAccessState('suspended', appSetup)).toBe(false);
    expect(matchesExpectedAccessState('revoked', appSetup)).toBe(false);
  });

  it('denies when current is missing', () => {
    expect(matchesExpectedAccessState(null, 'active')).toBe(false);
    expect(matchesExpectedAccessState(undefined, ['active'])).toBe(false);
  });
});
