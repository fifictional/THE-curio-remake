import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Stack } from 'aws-cdk-lib';
import { getDispatcherLogGroupName, getDispatcherTaskFamily, getDispatcherServiceName } from './utils';

export interface DispatcherProps {
  queueUrl: string;
  queueArn: string;
  stateMachineArn: string;
  environment: Record<string, string>;
  envId: 'dev' | 'prod';
  deploymentId: string; // branch name or sandbox user
  mixpanelSecret: secretsmanager.ISecret;
  chatLambdaArn: string;
  mockExamsGenerateQuestionsLambdaArn: string;
  satExtractModulesLambdaArn: string;
  satExtractAnswerModulesLambdaArn: string;
  satQuestionExtractorLambdaArn: string;
  generateQuestionsLambdaArn: string;
}

export class Dispatcher extends Construct {
  public readonly image: ecr_assets.DockerImageAsset;
  public readonly logGroup: logs.LogGroup;
  public readonly taskDefinition: ecs.TaskDefinition;
  public readonly service: ecs.Ec2Service;

  constructor(scope: Construct, id: string, props: DispatcherProps) {
    super(scope, id);

    const region = Stack.of(this).region;
    const account = Stack.of(this).account;

    // Build Docker image
    const dockerRootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
    this.image = new ecr_assets.DockerImageAsset(this, `image`, {
      directory: dockerRootDir,
      file: 'dispatcher-container/Dockerfile',
      platform: ecr_assets.Platform.LINUX_AMD64,
    });

    // Create log group using consistent naming
    this.logGroup = new logs.LogGroup(this, `log-group`, {
      logGroupName: getDispatcherLogGroupName(props.envId, props.deploymentId),
      retention: props.envId === 'prod' ? logs.RetentionDays.THREE_MONTHS : logs.RetentionDays.ONE_WEEK,
    });

    // Create task execution role (for pulling images, writing logs)
    const executionRole = new iam.Role(this, `task-execution-role`, {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Create task role (for the dispatcher app to access AWS services)
    const taskRole = new iam.Role(this, `task-role`, {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: `Task role for dispatcher ${props.deploymentId} in ${props.envId}`,
    });

    // Allow dispatcher to start Step Functions
    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['states:StartExecution'],
      resources: [props.stateMachineArn],
    }));

    // Allow dispatcher to access SQS queue
    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'sqs:ReceiveMessage',
        'sqs:DeleteMessage', 
        'sqs:GetQueueAttributes',
        'sqs:ChangeMessageVisibility', // Often needed for SQS operations
      ],
      resources: [props.queueArn],
      sid: 'AllowSQSOperations',
    }));

    // Allow dispatcher to start lambdas
    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['lambda:InvokeFunction'],
      resources: [props.chatLambdaArn, props.mockExamsGenerateQuestionsLambdaArn, props.satExtractModulesLambdaArn, props.satExtractAnswerModulesLambdaArn, props.satQuestionExtractorLambdaArn, props.generateQuestionsLambdaArn],
    }));

    // Allow reading SSM parameters for runtime config
    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
      ],
      resources: [
        `arn:aws:ssm:${region}:${account}:parameter/aitutor/dispatcher/${props.envId}/*`,
      ],
    }));

    // mixpanelSecret is now passed as parameter
    props.mixpanelSecret.grantRead(taskRole);
   
    // Create ECS Task Definition
    this.taskDefinition = new ecs.TaskDefinition(this, `task-definition`, {
      family: getDispatcherTaskFamily(props.envId, props.deploymentId),
      compatibility: ecs.Compatibility.EC2,
      networkMode: ecs.NetworkMode.BRIDGE,
      taskRole,
      executionRole,
      cpu: '256', // 0.25 vCPU
      memoryMiB: '256', // 256 MB
    });

    // Add container to task definition
    const container = this.taskDefinition.addContainer(`container`, {
      image: ecs.ContainerImage.fromDockerImageAsset(this.image),
      memoryLimitMiB: 256,
      cpu: 256,
      environment: {
        AWS_REGION: region,
        ENVIRONMENT: props.envId,
        QUEUE_URL: props.queueUrl,
        STATE_MACHINE_ARN: props.stateMachineArn,
        CHAT_LAMBDA_ARN: props.chatLambdaArn,
        MOCK_EXAMS_GENERATE_QUESTIONS_LAMBDA_ARN: props.mockExamsGenerateQuestionsLambdaArn,
        SAT_EXTRACT_MODULES_LAMBDA_ARN: props.satExtractModulesLambdaArn,
        SAT_EXTRACT_ANSWER_MODULES_LAMBDA_ARN: props.satExtractAnswerModulesLambdaArn,
        SAT_QUESTION_EXTRACTOR_LAMBDA_ARN: props.satQuestionExtractorLambdaArn,
        GENERATE_QUESTIONS_LAMBDA_ARN: props.generateQuestionsLambdaArn,
        LOG_GROUP: this.logGroup.logGroupName,
        ...props.environment,
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'dispatcher',
        logGroup: this.logGroup,
      }),
      essential: true,
    });

    // Add port mapping.  Will be dynamically assigned to a port on the ECS EC2 instance.
    container.addPortMappings({
      containerPort: 3000,
      hostPort: 0, // Dynamic port assignment for EC2 bridge mode
      protocol: ecs.Protocol.TCP,
    });

    // Reference the ECS cluster
    const clusterName = (props.envId === 'prod') ? 'live-curio-ecs' : 'dev-curio-ecs';

    // Use CfnService to avoid cluster connections requirement
    const cfnService = new ecs.CfnService(this, `ecs-dispatcher-service`, {
      cluster: clusterName,
      taskDefinition: this.taskDefinition.taskDefinitionArn,
      serviceName: getDispatcherServiceName(props.envId, props.deploymentId),
      desiredCount: 1,
    });
    
    // Create a reference to the service for typing
    this.service = cfnService as any as ecs.Ec2Service;
  }
}
