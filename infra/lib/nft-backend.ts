import {
  aws_apigateway,
  aws_dynamodb,
  aws_lambda_nodejs,
  aws_s3,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import path = require("path");

const bookKey = "book.pdf";

const addMsgRequestResource = (
  scope: Stack,
  api: aws_apigateway.IRestApi,
  msgTable: aws_dynamodb.ITable
) => {
  const putAuthRequestIntegration = new aws_lambda_nodejs.NodejsFunction(
    scope,
    "authRequestFn",
    {
      entry: path.join(__dirname, "./lambda/authRequest.ts"),
      environment: {
        MSG_TABLE: msgTable.tableName,
      },
    }
  );
  msgTable.grantReadWriteData(putAuthRequestIntegration);

  const request = api.root.addResource("request");
  request.addMethod(
    "POST",
    new aws_apigateway.LambdaIntegration(putAuthRequestIntegration)
  );
};

const addBooksResource = (
  scope: Stack,
  api: aws_apigateway.IRestApi,
  msgTable: aws_dynamodb.ITable
) => {
  const booksBucket = new aws_s3.Bucket(scope, "booksBucket", {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  });

  const presignUrlHandler = new aws_lambda_nodejs.NodejsFunction(
    scope,
    "presignedUrlCreatorFn",
    {
      entry: path.join(__dirname, "./lambda/presignUrlHandler.ts"),
      environment: {
        BUCKET: booksBucket.bucketName,
        KEY: bookKey,
      },
    }
  );
  booksBucket.grantRead(presignUrlHandler);

  const COLLECTION_ADDR = scope.node.tryGetContext("COLLECTION_ADDR");
  if(!COLLECTION_ADDR) throw new Error("-c COLLECTION_ADDR='' is not set");

  const CLUSTER_ENV = scope.node.tryGetContext("CLUSTER_ENV") || 'devnet';

  const authorizerFn = new aws_lambda_nodejs.NodejsFunction(
    scope,
    "authorizerFn",
    {
      entry: path.join(__dirname, "./lambda/authorizer.ts"),
      timeout: Duration.seconds(10),
      memorySize: 1024,
      environment: {
        CLUSTER_ENV,
        MSG_TABLE: msgTable.tableName,
        COLLECTION_ADDR,
      },
    }
  );
  msgTable.grantReadData(authorizerFn);
  const authorizer = new aws_apigateway.TokenAuthorizer(scope, "authroizer", {
    handler: authorizerFn,
    resultsCacheTtl: Duration.seconds(0),
  });

  const books = api.root.addResource("books");

  books.addMethod(
    "GET",
    new aws_apigateway.LambdaIntegration(presignUrlHandler, {
    }),
    {
      authorizer,
    }
  );
};

export class NFTBackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const api = new aws_apigateway.RestApi(this, "nftBackendApi", {
      defaultCorsPreflightOptions: {
        statusCode: 200,
        allowHeaders: aws_apigateway.Cors.DEFAULT_HEADERS,
        allowMethods: aws_apigateway.Cors.ALL_METHODS,
        allowOrigins: aws_apigateway.Cors.ALL_ORIGINS,
        allowCredentials: true,
      },
    });

    // for lambda authorizer
    new aws_apigateway.GatewayResponse(this, "nftBackendAPIGatewayResponse", {
      restApi: api,
      type: aws_apigateway.ResponseType.ACCESS_DENIED,
      statusCode: "403",
      responseHeaders: {
        "method.response.header.Access-Control-Allow-Origin": "'*'",
      },
    });

    const msgTableName = "messages";
    const msgTable = new aws_dynamodb.Table(this, "msgTable", {
      tableName: msgTableName,
      partitionKey: {
        name: "msg",
        type: aws_dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "ttl",
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    addMsgRequestResource(this, api, msgTable);
    addBooksResource(this, api, msgTable);
  }
}
