const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { RetrievalExecutor } = require('../retrieval_executor');
const fs = require('fs');
const path = require('path');

class RAPIServer {
  constructor(port = 3000) {
    this.app = express();
    this.port = port;
    this.executor = new RetrievalExecutor();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests',
        retryAfter: '15 minutes'
      }
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: require('../package.json').version,
        corpus_version: this.executor.corpusIndex?.version || '1.0'
      });
    });

    // Main retrieval endpoint
    this.app.post('/api/retrieve', async (req, res) => {
      try {
        const { input, context = {} } = req.body;

        if (!input || typeof input !== 'string') {
          return res.status(400).json({
            error: 'Invalid input',
            message: 'Input must be a non-empty string'
          });
        }

        if (input.length > 1000) {
          return res.status(400).json({
            error: 'Input too long',
            message: 'Input must be less than 1000 characters'
          });
        }

        const startTime = Date.now();
        const result = this.executor.executeRetrieval(input);
        const processingTime = Date.now() - startTime;

        // Log for monitoring
        this.logRequest(req, result, processingTime);

        res.json({
          success: true,
          data: {
            prompt: result.prompt,
            response_mode: result.response_mode,
            metadata: {
              ...result.metadata,
              processing_time_ms: processingTime,
              timestamp: new Date().toISOString(),
              input_length: input.length
            }
          }
        });

      } catch (error) {
        console.error('Retrieval error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to process request',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });

    // System status endpoint
    this.app.get('/api/status', (req, res) => {
      try {
        const corpusIndex = this.executor.corpusIndex;
        const retrievalRules = this.executor.retrievalRules;
        
        res.json({
          status: 'operational',
          corpus: {
            total_chunks: Object.keys(this.executor.chunks).length,
            total_embeddings: Object.keys(this.executor.embeddings).length,
            version: corpusIndex?.version || '1.0',
            last_updated: corpusIndex?.last_updated || null
          },
          retrieval: {
            rules_version: retrievalRules.version || '1.0',
            max_chunks: retrievalRules.limits?.max_chunks || 12,
            similarity_threshold: retrievalRules.limits?.similarity_threshold || 0.65
          },
          system: {
            node_version: process.version,
            platform: process.platform,
            uptime: process.uptime(),
            memory_usage: process.memoryUsage()
          }
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get status',
          message: error.message
        });
      }
    });

    // Configuration endpoint (read-only)
    this.app.get('/api/config', (req, res) => {
      try {
        res.json({
          retrieval_rules: {
            always_include: this.executor.retrievalRules.always_include,
            similarity_retrieval: this.executor.retrievalRules.similarity_retrieval,
            limits: this.executor.retrievalRules.limits
          },
          prompt_contract: {
            sections: this.executor.promptContract.sections.map(s => ({
              name: s.name,
              required: s.required
            })),
            assembly_rules: this.executor.promptContract.assembly_rules
          }
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get configuration',
          message: error.message
        });
      }
    });

    this.app.post('/api/tokens', (req, res) => {
      try {
        const { token, metadata = {} } = req.body || {};

        if (!token || typeof token !== 'string' || token.trim().length === 0) {
          return res.status(400).json({
            error: 'Invalid token',
            message: 'Token must be a non-empty string'
          });
        }

        res.json({
          success: true,
          data: {
            token_id: `tok_${Date.now()}`,
            status: 'active',
            created_at: new Date().toISOString(),
            metadata
          }
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to add token',
          message: error.message
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: 'Endpoint not found',
        available_endpoints: [
          'GET /health',
          'POST /api/retrieve',
          'POST /api/tokens',
          'GET /api/status',
          'GET /api/config'
        ]
      });
    });
  }

  setupErrorHandling() {
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      });
    });
  }

  logRequest(req, result, processingTime) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      user_agent: req.get('User-Agent'),
      input_length: req.body.input?.length || 0,
      response_mode: result.response_mode,
      chunks_used: result.metadata?.used_chunk_ids?.length || 0,
      processing_time_ms: processingTime,
      risk_level: result.metadata?.risk_level || 'unknown'
    };

    // Log to console (can be replaced with proper logging service)
    console.log('REQUEST_LOG:', JSON.stringify(logEntry));

    // Optionally write to log file
    if (process.env.ENABLE_FILE_LOGGING === 'true') {
      this.writeToLogFile(logEntry);
    }
  }

  writeToLogFile(logEntry) {
    try {
      const logDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, `requests-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 RAPI Retrieval Server started on port ${this.port}`);
      console.log(`📊 Health check: http://localhost:${this.port}/health`);
      console.log(`🔍 API endpoint: http://localhost:${this.port}/api/retrieve`);
      console.log(`📈 Status: http://localhost:${this.port}/api/status`);
    });
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  const server = new RAPIServer(port);
  server.start();
}

module.exports = RAPIServer;
