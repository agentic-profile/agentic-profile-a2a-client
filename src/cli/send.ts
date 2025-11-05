/**
 * This file is derived from https://github.com/google/A2A.git
 * and under the Apache 2.0 License.
 * 
 * It has been modified to add support for the Agentic Profile, as
 * well as other enhancements.
 */

import { join } from "path";
import os from "os";

import {
    generateAuthToken,
    parseChallengeFromWwwAuthenticate
} from "@agentic-profile/auth";
import { loadProfileAndKeyring } from "@agentic-profile/express-common";
import { pruneFragmentId } from "@agentic-profile/common";

import { MessageSendParams } from "@a2a-js/sdk";
import { HttpHeaders } from "../auth-handler.js";
import { colorize, printAgentEvent } from "./print.js";
import { CLISession } from "./main.js";


type SendOptions = {
    session: CLISession
    params: MessageSendParams
}

export async function send({ session, params }: SendOptions) {
    const { agentCard, client, agentName, sendTask } = session;
    console.log(colorize("gray", "Sending...")); // Indicate request is sent

    if( sendTask || agentCard.capabilities.streaming !== true ) {
        const response = await client.sendMessage(params);
        printAgentEvent( agentName, response as any)
    } else {
        // Pass only the params object to the client method
        const stream = client.sendTaskSubscribe(params);
        // Iterate over the unwrapped event payloads
        for await (const event of stream) {
            printAgentEvent( agentName, event); // Use the updated handler function
        }
    }

    console.log(colorize("dim", `--- End of response for this input ---`));
}

export async function createAuthHandler( iamProfile: string = "my-a2a-client", userAgentDid: string ) {
    const myProfileAndKeyring = await loadProfileAndKeyring( join( os.homedir(), ".agentic", "iam", iamProfile ) );
    let headers = {} as HttpHeaders;

    const { documentId, fragmentId } = pruneFragmentId( userAgentDid );
    const agentDid = documentId ? userAgentDid : myProfileAndKeyring.profile.id + fragmentId;

    const authHandler = {
        headers: () => headers,
        shouldRetryWithHeaders: async (req:RequestInit, fetchResponse:Response) => {
            // can/should I handle this?
            if( fetchResponse.status !== 401 )
                return undefined;

            const wwwAuthenticate = fetchResponse.headers.get( "WWW-Authenticate" );
            const agenticChallenge = parseChallengeFromWwwAuthenticate( wwwAuthenticate, fetchResponse.url );

            const authToken = await generateAuthToken({
                agentDid,
                agenticChallenge,
                profileResolver: async (did:string) => {
                    const { documentId } = pruneFragmentId( did );
                    if( documentId !== myProfileAndKeyring.profile.id )
                        throw new Error(`Failed to resolve agentic profile for ${did}`);
                    return myProfileAndKeyring;
                }
            });
            return { Authorization: `Agentic ${authToken}` };
        },
        onSuccess: async (updatedHeaders:HttpHeaders) => {
            headers = updatedHeaders;
        }
    };

    return authHandler;
}
