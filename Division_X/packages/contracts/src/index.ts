export * from './auth/v1/login';
export * from './common/versioning';

export type TimerStartRequest = { description: string; projectId?: string; taskId?: string; billable?: boolean };
export type TimerStartResponse = { running: boolean; workspaceId: string };
