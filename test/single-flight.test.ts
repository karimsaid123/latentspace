import test from 'node:test';
import assert from 'node:assert/strict';
import { SingleFlight } from '../src/core/services/single-flight';

test('SingleFlight executes concurrent duplicate calls exactly once', async () => {
  const sf = new SingleFlight();
  let executionCount = 0;

  const expensiveFetch = async () => {
    executionCount++;
    await new Promise(r => setTimeout(r, 20));
    return { data: 'payload', version: 1 };
  };

  // Launch 10 simultaneous calls for the same key
  const promises = Array.from({ length: 10 }).map(() =>
    sf.execute('feed_openai', expensiveFetch)
  );

  const results = await Promise.all(promises);

  // All 10 callers should receive the exact same result
  assert.equal(results.length, 10);
  for (const res of results) {
    assert.deepEqual(res, { data: 'payload', version: 1 });
  }

  // BUT the underlying expensive fetch must have run exactly ONCE!
  assert.equal(executionCount, 1, 'Expensive fetch must execute only once for coalesced requests');

  // Once finished, inFlight map should be clean
  assert.equal(sf.activeCount(), 0);

  // Subsequent call after completion runs again
  await sf.execute('feed_openai', expensiveFetch);
  assert.equal(executionCount, 2);
});

