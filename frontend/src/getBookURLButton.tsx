import { WalletNotConnectedError, WalletNotReadyError } from '@solana/wallet-adapter-base';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import React, { FC, useCallback } from 'react';
import * as nacl from "tweetnacl";
import { TextDecoder } from 'util';

import axios, { Axios } from 'axios';
import { Output } from './output';

type MsgRequestData = {
    msg: string,
    ttl: number,
};
type RawAuthToken = {
    pubkey: string;
    msg: string;
    signed: string;
};
type BookResponse = {
    url: string;
    name: string;
}

type Props = {
    setOutput: React.Dispatch<React.SetStateAction<JSX.Element>>,
}

const appConfig = require('./appconfig.json');
const apiEndpoint = `https://${appConfig.apiGatewayID}.execute-api.${appConfig.region}.amazonaws.com/${appConfig.stage}`;


const msgRequest = async (): Promise<string | null> => {
    const url = `${apiEndpoint}/request`;
    const response = await axios.post<MsgRequestData>(url);
    if (response.status !== 200) {
        console.error("error: ", response);
        return null;
    } else {
        const data = response.data;
        console.log(data);
        return data.msg;
    }
}

export const GetBookURLButton: FC<Props> = (props) => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, signMessage } = useWallet();

    const onClick = useCallback(async () => {
        props.setOutput(<Output type='info' msg="button clicked" />);

        if (!publicKey) throw new WalletNotConnectedError();
        if (!signMessage) throw new WalletNotReadyError();

        const message = await msgRequest();
        if (!message) {
            props.setOutput(<Output type='error' msg="Cannot request your message" />);
            return null;
        }

        const encodedMessage = Buffer.from(message);
        props.setOutput(<Output type='info' msg="sign the message!" />);
        const signedMessage = await signMessage!(encodedMessage);
        props.setOutput(<Output type='info' msg="signed" />);
        const signed = Buffer.from(signedMessage).toString('base64');

        // request!
        {
            const authData: RawAuthToken = {
                pubkey: publicKey.toString(),
                msg: message,
                signed,
            };
            const url = `${apiEndpoint}/books`;
            props.setOutput(<Output type='info' msg="request book url" />);
            try {
                const response = await axios.get<BookResponse>(url, {
                    headers: { Authorization: JSON.stringify(authData) }
                });
                const data = response.data;
                console.log("url:", data.url);
                props.setOutput(<Output type='link' msg={data.name} link={data.url} />);
            } catch (e) {
                if (axios.isAxiosError(e)) {
                    if (e.response!.status === 403) {
                        console.log("err", e.response);
                        props.setOutput(<Output type='error' msg="Authentication Failed" />);
                    }
                    else {
                        console.error("err", e.response);
                        props.setOutput(<Output type='error' msg="Failed to get book url" />);
                    }
                } else {
                    throw e;
                }
            }
        }
    }, [publicKey, sendTransaction, connection]);

    return (
        <button onClick={onClick} disabled={!publicKey}>
            Get book.pdf
        </button>
    );
};