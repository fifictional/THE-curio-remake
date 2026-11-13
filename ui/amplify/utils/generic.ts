export function buildAuthName(): string {
  const branch = process.env.AWS_BRANCH;
  if (branch === 'release' || branch === 'main') {
    return 'curioai';
  }

  const user = process.env.USER || process.env.LOGNAME || 'local';
  const suffix = branch || user;

  return `curioai-${suffix}`;
}

export function buildResourceName(resource: string): string {
  const branch = process.env.AWS_BRANCH;
  if (branch === 'release' || branch === 'main') {
    return `${resource}-${branch}`;
  }

  const user = process.env.USER || process.env.LOGNAME || 'local';
  const suffix = branch || user;

  return `${resource}-${suffix}`;
}