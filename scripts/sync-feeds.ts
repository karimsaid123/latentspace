import { container } from '../src/core/container';
import { SUMMARY_SCHEMA_VERSION, summarizeWithGemini } from '../src/lib/ai-summarizer';
import { fetchCleanArticleBody } from '../src/lib/article-extractor';

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
    console.log('🤖 Checking featured articles for deep full-text Gemini synthesis...');
    const topArticles = await container.articleRepo.list({ limit: 30 });
    const toEnrich = topArticles
      .filter(
        (a) =>
          a.summary?.generatedWith !== 'gemini' ||
          (a.summary?.summaryVersion || 0) < SUMMARY_SCHEMA_VERSION
      )
      .slice(0, 12);

    if (toEnrich.length > 0) {
      console.log(`   Found ${toEnrich.length} articles needing deep v2 synthesis...`);
      const CLI_GEMINI_CONCURRENCY = 2;
      const enriched: typeof toEnrich = [];

      for (let i = 0; i < toEnrich.length; i += CLI_GEMINI_CONCURRENCY) {
        const chunk = toEnrich.slice(i, i + CLI_GEMINI_CONCURRENCY);
        await Promise.all(
          chunk.map(async (art) => {
            console.log(`   - Synthesizing: "${art.title.slice(0, 58)}..."`);
            let sourceText = art.contentSnippet || '';
            if (sourceText.length < 1800 && art.canonicalUrl) {
              const extracted = await fetchCleanArticleBody(art.canonicalUrl);
              if (extracted && extracted.length > sourceText.length) {
                sourceText = extracted;
                art.contentSnippet = extracted.slice(0, 2400);
              }
            }
            const geminiSummary = await summarizeWithGemini(
              art.title,
              sourceText || art.title,
              apiKey
            );
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
      console.log(
        `✅ Successfully synthesized ${enriched.length}/${toEnrich.length} articles with deep Gemini v2 briefings.`
      );
    } else {
      console.log('✨ Top featured articles already possess verified deep v2 Gemini briefings.');
    }
  }
}

main().catch((err) => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
