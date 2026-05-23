export type AuthClaims = {
    sub: string;
    workspaceId: string;
    role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
};
export declare function signAccessToken(claims: AuthClaims): string;
export declare function verifyAccessToken(token: string): AuthClaims | null;
export declare function generateRefreshToken(): string;
//# sourceMappingURL=auth.d.ts.map