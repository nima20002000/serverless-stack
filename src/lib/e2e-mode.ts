export function isServerE2EMode(): boolean {
  return process.env.E2E_TEST === 'true';
}
