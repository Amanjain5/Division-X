export * from './auth/v1/login';
export * from './common/versioning';
export type TimerStartRequest = {
    description: string;
    projectId?: string;
};
export type TimerStartResponse = {
    running: boolean;
    workspaceId: string;
};
//# sourceMappingURL=index.d.ts.map