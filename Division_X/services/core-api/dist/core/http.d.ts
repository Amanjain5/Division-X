import type { RequestContext } from './types.js';
export declare function getContext(req: Request): RequestContext;
export declare function json(data: unknown, status?: number): Response;
export declare function readJson(req: Request): Promise<unknown>;
//# sourceMappingURL=http.d.ts.map