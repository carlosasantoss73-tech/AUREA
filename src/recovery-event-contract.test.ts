import { describe, expect, it } from 'vitest';
import { decideRecovery } from './recovery-event-contract.js';

const current = { workCellId: 'wc-1', projectId: 'p-1', traceId: 't-1', evidence: ['STATE'] };
const event = (eventType: string) => ({ eventId: 'e-1', traceId: 't-1', workCellId: 'wc-1', projectId: 'p-1', eventType, occurredAt: '2026-09-04T00:00:00Z', evidence: ['EVENT'] });

describe('recovery event decision boundary', () => {
  it('resumes interrupted work', () => expect(decideRecovery(event('EXECUTION_INTERRUPTED'), { ...current, state: 'RUNNING' }).decision).toBe('RESUME'));
  it('retries explicit failures', () => expect(decideRecovery(event('EXECUTION_FAILED'), { ...current, state: 'RUNNING' }).decision).toBe('RETRY_SAFE_STEP'));
  it('contains terminal cells', () => expect(decideRecovery(event('EXECUTION_FAILED'), { ...current, state: 'CANCELLED' }).decision).toBe('CONTAIN'));
  it('escalates scope mismatch', () => expect(decideRecovery({ ...event('EXECUTION_FAILED'), workCellId: 'wc-2' }, { ...current, state: 'RUNNING' }).decision).toBe('ESCALATE'));
  it('escalates unknown events', () => expect(decideRecovery(event('UNKNOWN'), { ...current, state: 'RUNNING' }).decision).toBe('ESCALATE'));
});
