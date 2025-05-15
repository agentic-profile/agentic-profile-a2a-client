/**
 * This file is derived from https://github.com/google/A2A.git
 * and under the Apache 2.0 License.
 * 
 * It has been modified to add support for the Agentic Profile, as
 * well as other enhancements.
 */

import { AgenticProfile } from "@agentic-profile/common/schema";
import {
    pruneFragmentId,
    webDidToUrl
} from "@agentic-profile/common";
import { getJson } from "@agentic-profile/auth";

import { AgentCard } from "./schema.js";

export interface AgentContext {
    profileUrl?: string,
    agenticProfile?: AgenticProfile,
    agentCardUrl: string,
    agentCard: AgentCard  
}

/**
 * Fetch the agent card
 *  - if URL is DID protocol, fetch agentic profile, then resolve agent from service[]
 *  - if URL is HTTP/HTTPS then fetch agent card from:
 *      - existing URL if it ends with "/agent.json"
 *      - /.well-known/agent.json if the URL pathname is exactly "/"
 *      - the agent.json in the same directory as the agent endpoint
 * @param agentUrl
 * @param fetchImpl Optional override of the built in fetch()
 * @returns An AgentContext with at least the agentCard and agetnCardUrl.  If the url was a DID
 *      the context will also include the agenticProfile and profileUrl
 */
export async function resolveAgent( agentUrl: string, fetchImpl?: typeof fetch ): Promise<AgentContext> {
    let profileUrl: string | undefined;
    let agenticProfile: AgenticProfile | undefined;

    let url = new URL( agentUrl );
    if( url.protocol === "did:" ) {
        // ensure we have the fragment id to find the agent
        const { fragmentId } = pruneFragmentId( agentUrl );
        if( !fragmentId )
            throw new Error(`Agentic profile DID is missing the fragment to resolve the agent ${agentUrl}`);

        // fetch the DID document/agentic profile
        profileUrl = webDidToUrl( agentUrl );
        ({ data: agenticProfile } = await getJson( profileUrl!, { fetchImpl } ));

        // find agent
        const agent = agenticProfile!.service?.find(e=>e.id === fragmentId);
        if( !agent )
            throw new Error(`Failed to find agent ${fragmentId} from agentic profile at ${profileUrl}`);
        if( agent.type?.toLowerCase() !== "a2a" )
            throw new Error(`Agent type is not A2A, instead it is ${agent.type}`);

        agentUrl = Array.isArray( agent.serviceEndpoint ) ? agent.serviceEndpoint[0] as string : agent.serviceEndpoint as string;
        if( !agentUrl )
            throw new Error(`Agent ${fragmentId} from ${profileUrl} is missing the serviceEndpoint`);
        url = new URL( agentUrl );
    }

    // fixup agentUrl for agent card
    let agentCardUrl: string;
    if( url.pathname.endsWith("/agent.json") ) {
        agentCardUrl = url.toString();
    } else if( url.pathname === "/" ) {
        agentCardUrl = new URL("/.well-known/agent.json", agentUrl).toString();    
    } else {
        // try to find agent card in same directory as agent service endpoint
        agentCardUrl = new URL("agent.json",agentUrl).toString();
    }

    const { data: agentCard } = await getJson( agentCardUrl, { fetchImpl } );

    return {
        profileUrl,
        agenticProfile,
        agentCardUrl,
        agentCard
    };
}


/**
 * Optional: Checks if the server likely supports optional methods based on agent card.
 * This is a client-side heuristic and might not be perfectly accurate.
 * @param card Agent card to check
 * @param capability The capability to check (e.g., 'streaming', 'pushNotifications').
 * @returns A promise resolving to true if the capability is likely supported.
 */
export function supports( card: AgentCard, capability: "streaming" | "pushNotifications"): boolean {
    switch (capability) {
        // Check boolean flags directly on the capabilities object
        case "streaming":
            return !!card.capabilities?.streaming; // Use optional chaining and boolean conversion
        case "pushNotifications":
            return !!card.capabilities?.pushNotifications; // Use optional chaining and boolean conversion
        default:
            return false;
    }
}