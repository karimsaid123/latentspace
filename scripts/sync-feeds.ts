import { container } from '../src/core/container';

async function main() {
  console.log('🔄 Starting autonomous feed synchronization...');
  const startTime = Date.now();

  await container.bootstrap();
  const report = await container.ingestionService.runIngestion(`cli_sync_${Date.now()}`);

  console.log(`✅ Ingestion completed in ${Date.now() - startTime}ms`);
  console.log(`   - Sources checked:   ${report.sourcesProcessed}`);
  console.log(`   - Articles added:    ${report.articlesAdded}`);
  console.log(`   - Articles modified: ${report.articlesModified}`);
  console.log(`   - Circuit breakers:  ${report.circuitBreakersTriggered.length}`);
}

main().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
