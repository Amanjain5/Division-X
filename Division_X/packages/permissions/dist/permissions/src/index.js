export const ROLE_PRIORITY = {
    OWNER: 4,
    ADMIN: 3,
    MANAGER: 2,
    MEMBER: 1
};
export function canManageTime(role) {
    return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER';
}
export function canManageWorkspace(role) {
    return role === 'OWNER' || role === 'ADMIN';
}
