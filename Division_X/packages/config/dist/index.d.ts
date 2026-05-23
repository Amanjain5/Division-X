import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    CORE_API_PORT: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "test" | "production";
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    CORE_API_PORT: number;
}, {
    NODE_ENV?: "development" | "test" | "production" | undefined;
    LOG_LEVEL?: "debug" | "info" | "warn" | "error" | undefined;
    CORE_API_PORT?: number | undefined;
}>;
export type AppConfig = z.infer<typeof envSchema>;
export declare const getConfig: () => AppConfig;
export {};
//# sourceMappingURL=index.d.ts.map