export const isFeatureEnabled = (brand, flag, map) => Boolean(map[`${brand}.${flag}`] ?? map[flag]);
