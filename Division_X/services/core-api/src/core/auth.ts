import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';

export type AuthClaims = {
  sub: string;
  workspaceId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
};

export function signAccessToken(claims: AuthClaims): string {
  return jwt.sign(claims, ACCESS_SECRET, { expiresIn: '1h' });
}

export function verifyAccessToken(token: string): AuthClaims | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as AuthClaims;
  } catch {
    return null;
  }
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}
