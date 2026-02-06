const axios = require('axios');

class RAPIClient {
  constructor(baseURL = 'http://localhost:3000') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          throw new Error(`API Error: ${error.response.status} - ${error.response.data.message || error.response.data.error}`);
        } else if (error.request) {
          throw new Error('Network error: Could not reach the server');
        } else {
          throw new Error(`Request error: ${error.message}`);
        }
      }
    );
  }

  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  async retrieve(input, context = {}) {
    try {
      const response = await this.client.post('/api/retrieve', {
        input,
        context
      });
      return response.data.data;
    } catch (error) {
      throw new Error(`Retrieval failed: ${error.message}`);
    }
  }

  async getStatus() {
    try {
      const response = await this.client.get('/api/status');
      return response.data;
    } catch (error) {
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  async getConfig() {
    try {
      const response = await this.client.get('/api/config');
      return response.data;
    } catch (error) {
      throw new Error(`Config retrieval failed: ${error.message}`);
    }
  }
}

// Example usage
async function demonstrateClient() {
  const client = new RAPIClient();

  try {
    console.log('🏥 Checking API health...');
    const health = await client.healthCheck();
    console.log('✅ Health status:', health);

    console.log('\n📊 Getting system status...');
    const status = await client.getStatus();
    console.log('📈 System status:', JSON.stringify(status, null, 2));

    console.log('\n🔍 Testing retrieval...');
    const testQueries = [
      'Bagaimana cara merespons atasan yang menyindir di publik?',
      'Saya dilewati promosi, padahal kerja keras',
      'Bagaimana cara menghadapi kasus hukum di kantor?',
      'Bagaimana cara investasi saham?' // Out of domain
    ];

    for (const query of testQueries) {
      console.log(`\n❓ Query: ${query}`);
      const result = await client.retrieve(query);
      
      console.log(`📝 Response mode: ${result.response_mode}`);
      console.log(`⏱️  Processing time: ${result.metadata.processing_time_ms}ms`);
      console.log(`📦 Chunks used: ${result.metadata.used_chunk_ids?.length || 0}`);
      console.log(`🎯 Risk level: ${result.metadata.risk_level}`);
      
      // Show first 200 characters of the prompt
      console.log(`📄 Prompt preview: ${result.prompt.substring(0, 200)}...`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateClient();
}

module.exports = RAPIClient;
