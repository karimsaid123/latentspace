import { container } from '../src/core/container';
import { summarizeWithGemini } from '../src/lib/ai-summarizer';

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    console.log('🤖 Checking top featured articles for Gemini intelligence synthesis...');
    const topArticles = await container.articleRepo.list({ limit: 20 });
    const toEnrich = topArticles.filter(a => a.summary?.generatedWith !== 'gemini').slice(0, 8);

    if (toEnrich.length > 0) {
      console.log(`   Found ${toEnrich.length} articles needing Gemini synthesis...`);
      const CLI_GEMINI_CONCURRENCY = 3;
      const enriched: typeof toEnrich = [];

      for (let i = 0; i < toEnrich.length; i += CLI_GEMINI_CONCURRENCY) {
        const chunk = toEnrich.slice(i, i + CLI_GEMINI_CONCURRENCY);
        await Promise.all(
          chunk.map(async art => {
            console.log(`   - Synthesizing: "${art.title.slice(0, 50)}..."`);
            const geminiSummary = await summarizeWithGemini(art.title, art.contentSnippet || art.title, apiKey);
            if (geminiSummary) {
              art.summary = geminiSummary;
              enriched.push(art);
            }
          })
        );
      }

      if (enriched.length > 0) {
        await container.articleRepo.saveMany(enriched);
      }
      console.log(`✅ Successfully synthesized ${enriched.length}/${toEnrich.length} articles with Gemini.`);
    } else {
      console.log('✨ Top featured articles already possess verified Gemini intelligence.');
    }
  }
}

main().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
