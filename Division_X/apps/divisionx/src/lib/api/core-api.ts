export const CORE_API_BASE_URL = process.env.CORE_API_BASE_URL ?? 'http://localhost:5000';

export const getHealth = async () => {
  const res = await fetch(`${CORE_API_BASE_URL}/health`);
  if (!res.ok) throw new Error('core-api health check failed');
  return res.json();
};
