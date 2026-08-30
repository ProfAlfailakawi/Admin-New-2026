import { describe, it, expect } from 'vitest';
import { classifyGatewayPaymentState } from '../../server';

describe('Payment State Transitions (Production Logic)', () => {
  it('Should correctly extract and classify a successful payment', () => {
    expect(classifyGatewayPaymentState({ result: 'paid' })).toBe('paid');
    expect(classifyGatewayPaymentState({ data: { status: ' CAPTURED ' } })).toBe('paid');
    expect(classifyGatewayPaymentState({ payment_status: 'success' })).toBe('paid');
  });

  it('Should correctly extract and classify a failed payment', () => {
    expect(classifyGatewayPaymentState({ result: 'failed' })).toBe('failed');
    expect(classifyGatewayPaymentState({ data: { status: 'Declined' } })).toBe('failed');
    expect(classifyGatewayPaymentState({ transaction_status: 'ERROR' })).toBe('failed');
  });

  it('Should return unknown if no recognized status is found', () => {
    expect(classifyGatewayPaymentState({ result: 'pending' })).toBe('unknown');
    expect(classifyGatewayPaymentState({ other_key: 'paid' })).toBe('unknown'); // Not in statusKeys
    expect(classifyGatewayPaymentState({})).toBe('unknown');
  });
});
