"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultSeedFilePath = exports.seedSongsForTenant = exports.pool = void 0;
exports.createPool = createPool;
exports.setTenantContext = setTenantContext;
exports.healthCheck = healthCheck;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = require("path");
// Load .env.local first (for local dev), then .env (for defaults)
dotenv_1.default.config({ path: (0, path_1.resolve)(__dirname, '../.env.local') });
dotenv_1.default.config({ path: (0, path_1.resolve)(__dirname, '../.env') });
function createPool(config) {
    const poolConfig = config || {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
    return new pg_1.Pool(poolConfig);
}
async function setTenantContext(pool, tenantId) {
    await pool.query(`SET app.tenant_id = '${tenantId}'`);
}
async function healthCheck(pool) {
    try {
        const result = await pool.query('SELECT 1 as health');
        return result.rows[0].health === 1;
    }
    catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}
// Export pool singleton
exports.pool = createPool();
// Export seed functions
var seed_songs_1 = require("./seed-songs");
Object.defineProperty(exports, "seedSongsForTenant", { enumerable: true, get: function () { return seed_songs_1.seedSongsForTenant; } });
Object.defineProperty(exports, "getDefaultSeedFilePath", { enumerable: true, get: function () { return seed_songs_1.getDefaultSeedFilePath; } });
//# sourceMappingURL=index.js.map