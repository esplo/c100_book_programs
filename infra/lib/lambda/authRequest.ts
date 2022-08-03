import { APIGatewayProxyHandler } from "aws-lambda";
import * as crypto from "crypto";
import {
  DynamoDBClient,
  PutItemCommandInput,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

const MSG_TABLE = process.env.MSG_TABLE || "";
const ddbClient = new DynamoDBClient({});

export const handler: APIGatewayProxyHandler = async (
  _event: any,
  _context: any
) => {
  const msg = crypto.randomBytes(20).toString("hex");
  const ttl = (Math.floor(Date.now() / 1000) + 120).toString();

  const param: PutItemCommandInput = {
    TableName: MSG_TABLE,
    Item: { msg: { S: msg }, ttl: { S: ttl } },
  };
  await ddbClient.send(new PutItemCommand(param));

  return {
    statusCode: 200,
    body: JSON.stringify({
      msg,
      ttl: parseInt(ttl),
    }),
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
};
