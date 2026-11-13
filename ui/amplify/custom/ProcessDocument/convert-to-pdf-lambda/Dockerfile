FROM --platform=linux/amd64 public.ecr.aws/shelf/lambda-libreoffice-base:7.6-node20-x86_64

# COPY www.youtube.com_cookies.txt ${LAMBDA_TASK_ROOT}
COPY src/* ${LAMBDA_TASK_ROOT}
COPY src/common ${LAMBDA_TASK_ROOT}/common

RUN cd ${LAMBDA_TASK_ROOT} && npm init -y

RUN cd ${LAMBDA_TASK_ROOT} && npm install @aws-lambda-powertools/logger @types/node typescript node-fetch@2 @types/node-fetch uuid@8.3.2 @types/uuid@8.3.2 @aws-sdk/client-s3 pdf-lib @supadata/js @aws-sdk/client-secrets-manager

RUN cd ${LAMBDA_TASK_ROOT} && npx tsc index.ts --esModuleInterop --skipLibCheck --target es2022 --module commonjs --resolveJsonModule --moduleResolution node --ignoreDeprecations 6.0

# instal git on amd linux lambda (uses dnf as package manager)
# RUN dnf install -y git
# RUN npm install -g yarn

# RUN cd ${LAMBDA_TASK_ROOT} && git clone --single-branch --branch 1.1.0 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git
# RUN cd bgutil-ytdlp-pot-provider/server/ && yarn install --frozen-lockfile && npx tsc

# install yt-dlp
# RUN pip install yt-dlp
# RUN python3 -m pip install -U bgutil-ytdlp-pot-provider

CMD [ "index.handler" ]