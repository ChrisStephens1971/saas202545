import { Pool } from 'pg';
export interface SongSeedData {
    title: string;
    alternateTitle?: string | null;
    firstLine?: string | null;
    tuneName?: string | null;
    hymnNumber?: string | null;
    hymnalCode?: string | null;
    author?: string | null;
    composer?: string | null;
    isPublicDomain?: boolean;
    ccliNumber?: string | null;
    copyrightNotice?: string | null;
    defaultKey?: string | null;
    defaultTempo?: number | null;
    lyrics?: string | null;
}
export interface SeedFile {
    description: string;
    version: string;
    songs: SongSeedData[];
}
export interface SeedSongsResult {
    created: number;
    updated: number;
    errors: number;
    total: number;
}
export interface SeedSongsOptions {
    /** Path to the JSON seed file. Defaults to the bundled public_hymns_seed.json */
    filePath?: string;
    /** Whether to log progress to console. Defaults to false when called as a function. */
    verbose?: boolean;
}
/**
 * Get the default seed file path (public_hymns_seed.json in the seed/ directory)
 */
export declare function getDefaultSeedFilePath(): string;
/**
 * Seeds songs for a tenant from a JSON file.
 *
 * This function is idempotent - it will create new songs or update existing ones
 * based on title + hymnal_code uniqueness.
 *
 * @param pool - An existing pg Pool instance. The function will NOT close this pool.
 * @param tenantId - The tenant UUID to seed songs for.
 * @param options - Optional configuration.
 * @returns A summary of the seed operation.
 *
 * @example
 * // Call from tenant creation
 * const pool = getPool();
 * await seedSongsForTenant(pool, newTenant.id);
 *
 * @example
 * // Call with custom file
 * await seedSongsForTenant(pool, tenantId, { filePath: '/path/to/songs.json' });
 */
export declare function seedSongsForTenant(pool: Pool, tenantId: string, options?: SeedSongsOptions): Promise<SeedSongsResult>;
//# sourceMappingURL=seed-songs.d.ts.map