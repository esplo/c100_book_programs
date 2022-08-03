import { Connection, clusterApiUrl, PublicKey, Cluster } from "@solana/web3.js";
import {
  APIGatewayAuthorizerWithContextResult,
  APIGatewayTokenAuthorizerEvent,
  APIGatewayTokenAuthorizerWithContextHandler,
} from "aws-lambda";
import * as nacl from "tweetnacl";
import { Metaplex } from "@metaplex-foundation/js";
import { AuthorizerContext } from "./presignUrlHandler";
import {
  DynamoDBClient,
  GetItemCommand,
  GetItemCommandInput,
} from "@aws-sdk/client-dynamodb";

const ddbClient = new DynamoDBClient({});

const MSG_TABLE = process.env.MSG_TABLE || "";
const CLUSTER_ENV = (process.env.CLUSTER_ENV as Cluster) || "";
const COLLECTION_ADDR = (process.env.COLLECTION_ADDR as Cluster) || "";

type RawAuthToken = {
  pubkey: string;
  msg: string;
  signed: string;
};

type AuthToken = {
  pubkey: PublicKey;
  msg: string;
  signed: Buffer;
};

const checkTableAndSign = async (msg: string) => {
  // Check whether passed msg is in the table
  const param: GetItemCommandInput = {
    TableName: MSG_TABLE,
    Key: { msg: { S: msg } },
  };
  const msgTableIem = await ddbClient.send(new GetItemCommand(param));

  console.log("item", msgTableIem.Item);

  return true;
};

export const checkNFT = async (clusterEnv: Cluster, collectionAddr: string, ownerPublickey: PublicKey): Promise<boolean> => {
  const connection = new Connection(clusterApiUrl(clusterEnv));

  const metaplex = new Metaplex(connection);
  const myNfts = await metaplex.nfts().findAllByOwner(ownerPublickey).run();
  if (!myNfts) {
    return false;
  }

  const targetNFTs = myNfts.filter((e) => {
    if (e.collection?.key.toString() === collectionAddr) {
      console.log("found!", e.name, e.mintAddress.toString());
      return true;
    }
    return false;
  });

  return targetNFTs.length > 0;
};

export const handler: APIGatewayTokenAuthorizerWithContextHandler<
  AuthorizerContext
> = async (event: APIGatewayTokenAuthorizerEvent) => {
  // optimistic validation, throw exception if invalid
  const rawAuthToken: RawAuthToken = JSON.parse(event.authorizationToken);
  const authToken: AuthToken = {
    pubkey: new PublicKey(rawAuthToken.pubkey),
    msg: rawAuthToken.msg,
    signed: Buffer.from(rawAuthToken.signed, "base64"),
  };

  const signVerified = nacl.sign.detached.verify(
    Buffer.from(authToken.msg),
    authToken.signed,
    authToken.pubkey.toBytes()
  );

  const msgExists = await checkTableAndSign(authToken.msg);
  const hasNFT = await checkNFT(CLUSTER_ENV, COLLECTION_ADDR, authToken.pubkey);

  const result = signVerified && msgExists && hasNFT;
  console.log(JSON.stringify({
    pubkey: rawAuthToken.pubkey,
    result, signVerified, msgExists, hasNFT,
  }));

  const response: APIGatewayAuthorizerWithContextResult<AuthorizerContext> = {
    principalId: event.authorizationToken,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: result ? "Allow" : "Deny",
          Resource: event.methodArn,
        },
      ],
    },
    context: {
      signVerified,
      msgExists,
      hasNFT,
    },
  };
  return response;
};

