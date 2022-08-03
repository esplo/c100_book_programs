import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyWithLambdaAuthorizerEvent,
  APIGatewayProxyWithLambdaAuthorizerHandler,
} from "aws-lambda";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export type AuthorizerContext = {
  signVerified: boolean;
  msgExists: boolean;
  hasNFT: boolean;
};

const BUCKET = process.env.BUCKET;
const KEY = process.env.KEY;

const client = new S3Client({});
const command = new GetObjectCommand({
  Bucket: BUCKET,
  Key: KEY,
});

export const handler: APIGatewayProxyWithLambdaAuthorizerHandler<
  AuthorizerContext
> = async (
  _event: APIGatewayProxyWithLambdaAuthorizerEvent<AuthorizerContext>,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  const url = await getSignedUrl(client, command, { expiresIn: 3600 });

  return {
    statusCode: 200,
    body: JSON.stringify({ url, name: KEY }),
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
};
