import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient();

export const getGptModel = async () => {
  // Get the branch name from environment variables
  const branch = process.env.AWS_BRANCH;
  if (!branch) {
    throw new Error('AWS_BRANCH environment variable is not set');
  }

  const gptTextModelParam = await ssm.send(
    new GetParameterCommand({
      Name: `/document-processing/${branch}/gpt-text-model`,
    })
  );

  const gptFileModelParam = await ssm.send(
    new GetParameterCommand({
      Name: `/document-processing/${branch}/gpt-file-model`,
    })
  );

  if (!gptTextModelParam.Parameter?.Value || !gptFileModelParam.Parameter?.Value) {
    throw new Error('Failed to retrieve GPT model parameters');
  }

  return { 
    gptTextModel: gptTextModelParam.Parameter.Value, 
    gptFileModel: gptFileModelParam.Parameter.Value 
  };
};