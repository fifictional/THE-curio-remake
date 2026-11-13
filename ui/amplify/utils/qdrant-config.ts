import * as cdk from 'aws-cdk-lib';
import { Fn } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

interface AmplifyFunctionResource {
  addEnvironment(key: string, value: string): void;
  resources: {
    lambda: IFunction;
  };
}

/** Per-env export prefix for app SG / URL (shared VPC lives under stack `qdrant`). */
export type QdrantEnvPrefix = 'qdrant-dev' | 'qdrant-prod';

export function getQdrantEnvPrefix(branch: string): QdrantEnvPrefix {
  return branch === 'release' ? 'qdrant-prod' : 'qdrant-dev';
}

/** @deprecated Use getQdrantEnvPrefix — stack is now shared as `qdrant`. */
export function getQdrantStackPrefix(branch: string): QdrantEnvPrefix {
  return getQdrantEnvPrefix(branch);
}

/** Secrets Manager path created by infra/qdrant CloudFormation stack. */
export function getQdrantSecretName(branch: string): string {
  if (process.env.QDRANT_SECRET_NAME) return process.env.QDRANT_SECRET_NAME;
  return branch === 'release' ? 'qdrant/prod/config' : 'qdrant/dev/config';
}

/** Default vector backend: Qdrant (OpenSearch fully decommissioned after migration). */
export function getVectorStoreForBranch(_branch: string): string {
  if (process.env.VECTOR_STORE) return process.env.VECTOR_STORE;
  return 'qdrant';
}

export interface ConfigureQdrantAccessOptions {
  branch: string;
  /** Override private subnet IDs; defaults to shared `qdrant-private-subnet-ids` export. */
  subnetIds?: string[];
  /** Attach Lambda to VPC for private Qdrant access. Default true. */
  vpcEnabled?: boolean;
  /** Explicit SG list; defaults to env application SG export. */
  securityGroupIds?: string[];
}

/**
 * Import shared Qdrant private subnet IDs (stack `qdrant`).
 */
export function getQdrantSubnetIds(_stack: cdk.Stack, _branch?: string): string[] {
  const subnetIdsExport = Fn.importValue('qdrant-private-subnet-ids');
  return Fn.split(',', subnetIdsExport) as unknown as string[];
}

/**
 * Wire Lambda functions for self-hosted Qdrant (shared VPC, env-specific instance).
 *
 * URL + API key come from either:
 * - `QDRANT_URL` / `QDRANT_API_KEY` env at synth time, or
 * - Secrets Manager `qdrant/{dev|prod}/config` JSON: `{ "url": "...", "apiKey": "..." }`
 *
 * CloudFormation exports from stack `qdrant`:
 * - Shared: `qdrant-vpc-id`, `qdrant-private-subnet-ids`
 * - Per env: `qdrant-dev-*` / `qdrant-prod-*` (url, application SG, secret)
 */
export function configureQdrantAccess(
  amplifyFunction: AmplifyFunctionResource,
  stack: cdk.Stack,
  options: ConfigureQdrantAccessOptions,
): void {
  const envPrefix = getQdrantEnvPrefix(options.branch);
  const lambdaFunction = amplifyFunction.resources.lambda;
  const secretName = getQdrantSecretName(options.branch);

  amplifyFunction.addEnvironment('QDRANT_SECRET_NAME', secretName);
  amplifyFunction.addEnvironment(
    'QDRANT_COLLECTION',
    process.env.QDRANT_COLLECTION || 'curio-vectors',
  );

  if (process.env.QDRANT_URL) {
    amplifyFunction.addEnvironment('QDRANT_URL', process.env.QDRANT_URL);
  }
  amplifyFunction.addEnvironment(
    'VECTOR_STORE',
    getVectorStoreForBranch(options.branch),
  );

  lambdaFunction.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [
        `arn:aws:secretsmanager:*:*:secret:${secretName}*`,
      ],
    }),
  );

  lambdaFunction.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface',
        'ec2:AssignPrivateIpAddresses',
        'ec2:UnassignPrivateIpAddresses',
      ],
      resources: ['*'],
    }),
  );

  const vpcEnabled =
    options.vpcEnabled ?? process.env.QDRANT_VPC_ENABLED !== 'false';

  let subnetIds = options.subnetIds ?? [];
  if (subnetIds.length === 0 && vpcEnabled) {
    subnetIds = getQdrantSubnetIds(stack, options.branch);
  }

  if (!vpcEnabled || subnetIds.length === 0) {
    console.warn(
      `[Qdrant Config] ${lambdaFunction.functionName}: VPC not configured — deploy stack \`qdrant\` first or set QDRANT_VPC_ENABLED=false.`,
    );
    return;
  }

  const applicationSg = Fn.importValue(
    `${envPrefix}-application-security-group-id`,
  );

  const securityGroupIds = options.securityGroupIds ?? [applicationSg];

  const cfnLambda = lambdaFunction.node.defaultChild as cdk.CfnResource;
  if (cfnLambda) {
    cfnLambda.addPropertyOverride('VpcConfig', {
      SubnetIds: subnetIds,
      SecurityGroupIds: securityGroupIds,
    });
  }
}
