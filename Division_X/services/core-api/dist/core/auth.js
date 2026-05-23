import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
export function signAccessToken(claims) {
    return jwt.sign(claims, ACCESS_SECRET, { expiresIn: '1h' });
}
export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, ACCESS_SECRET);
    }
    catch {
        return null;
    }
}
export function generateRefreshToken() {
    return crypto.randomBytes(48).toString('hex');
}
