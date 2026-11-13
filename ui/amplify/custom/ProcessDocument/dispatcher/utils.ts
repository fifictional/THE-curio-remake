/**
 * Utility functions for dispatcher-specific naming and configuration.
 * These work with the generic ECS cluster infrastructure.
 */

/**
 * Get the CloudWatch log group name for dispatcher containers
 */
export function getDispatcherLogGroupName(envId: string, deploymentId: string): string {
  return `/curio/dispatcher/${envId}/${deploymentId}`;
}

/**
 * Generate a consistent task definition family name for dispatchers
 */
export function getDispatcherTaskFamily(envId: string, workloadName?: string): string {
  const suffix = workloadName ? `-${workloadName}` : '';
  return `curio-dispatcher-${envId}${suffix}`;
}

/**
 * Generate a consistent service name for dispatchers
 */
export function getDispatcherServiceName(envId: string, workloadName?: string): string {
  const suffix = workloadName ? `-${workloadName}` : '';
  return `curio-dispatcher-${envId}${suffix}`;
}
