import test from 'node:test';
import assert from 'node:assert/strict';
import { CircuitBreaker } from '../src/core/services/circuit-breaker';
import { CircuitBreakerOpenError } from '../src/core/domain/errors';

test('CircuitBreaker transitions from CLOSED to OPEN after failure threshold', async () => {
  const breaker = new CircuitBreaker({
    serviceName: 'test-feed',
    failureThreshold: 2,
    cooldownPeriodMs: 50,
    trialSuccessThreshold: 1,
  });

  assert.equal(breaker.getState(), 'CLOSED');

  // Failure 1
  await assert.rejects(
    () => breaker.execute(async () => { throw new Error('Network error 1'); }),
    /Network error 1/
  );
  assert.equal(breaker.getState(), 'CLOSED');

  // Failure 2 -> Threshold reached!
  await assert.rejects(
    () => breaker.execute(async () => { throw new Error('Network error 2'); }),
    /Network error 2/
  );
  assert.equal(breaker.getState(), 'OPEN');

  // While OPEN: should fast-fail with CircuitBreakerOpenError WITHOUT calling the action
  let executedWhenOpen = false;
  await assert.rejects(
    () => breaker.execute(async () => {
      executedWhenOpen = true;
      return 'ok';
    }),
    CircuitBreakerOpenError
  );
  assert.equal(executedWhenOpen, false, 'Action must NOT be called when circuit breaker is OPEN');

  // Wait for cooldown
  await new Promise(r => setTimeout(r, 60));

  // Should transition to HALF_OPEN
  assert.equal(breaker.getState(), 'HALF_OPEN');

  // Successful probe should close the circuit
  const result = await breaker.execute(async () => 'recovered');
  assert.equal(result, 'recovered');
  assert.equal(breaker.getState(), 'CLOSED');
});

