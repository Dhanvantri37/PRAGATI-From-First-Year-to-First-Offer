const ragService = require('../utils/ragService');

async function testRag() {
  console.log('Testing getEmbedding...');
  const emb = await ragService.getEmbedding('Software Development Engineer React Node.js');
  console.log('Embedding length:', emb.length);
  console.log('Sample vector values:', emb.slice(0, 5));
  if (emb.length === 384) {
    console.log('✅ RAG Vector Embedding Test Passed!');
  } else {
    console.error('❌ RAG Test Failed, vector dimension mismatch!');
  }
}

testRag().catch(err => {
  console.error('Test error:', err);
});
