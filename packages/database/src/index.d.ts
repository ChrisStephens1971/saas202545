import { Pool, PoolConfig } from 'pg';
export interface DatabaseConfig extends PoolConfig {
    connectionString?: string;
}
export declare function createPool(config?: DatabaseConfig): Pool;
export declare function setTenantContext(pool: Pool, tenantId: string): Promise<void>;
export declare function healthCheck(pool: Pool): Promise<boolean>;
export declare const pool: Pool;
export { seedSongsForTenant, getDefaultSeedFilePath, type SeedSongsResult, type SeedSongsOptions, type SongSeedData, } from './seed-songs';
//# sourceMappingURL=index.d.ts.map