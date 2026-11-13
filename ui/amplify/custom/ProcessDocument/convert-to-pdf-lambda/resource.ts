
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Duration } from "aws-cdk-lib";
import { DockerImageCode, DockerImageFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

const dockerFileDir = path.dirname(fileURLToPath(import.meta.url));

export const convertToPdfFunctionHandler = (scope: Construct, id: string, environment: Record<string, string>) => new DockerImageFunction(
  scope,
  id,
  {
      code: DockerImageCode.fromImageAsset(dockerFileDir),
      timeout: Duration.seconds(900),
      memorySize: 1024,
      environment: environment,
    }
);