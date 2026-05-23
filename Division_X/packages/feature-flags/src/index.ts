export type Brand='happywedding'|'wolfcasa'|'admin';
export type FlagKey=string;
export const isFeatureEnabled=(brand:Brand,flag:FlagKey,map:Record<string,boolean>):boolean=>Boolean(map[`${brand}.${flag}`]??map[flag]);
