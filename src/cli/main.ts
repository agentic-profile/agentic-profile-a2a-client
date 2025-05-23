/**
 * This file is derived from https://github.com/google/A2A.git
 * and under the Apache 2.0 License.
 * 
 * It has been modified to add support for the Agentic Profile, as
 * well as other enhancements.
 */

import { argv } from "@agentic-profile/express-common";
import readline from "node:readline";

import { A2AClient } from "../client.js";
import { resolveAgent } from "../agent-resolver.js";
import { AgentCard, TaskSendParams } from "../schema.js";
import { colorize, displayAgentCard } from "./print.js";
import { createAuthHandler, send } from "./send.js";


// --- Command line options ---
const ARGV_OPTIONS: argv.ArgvOptions = {
    iam: {
        type: "string",
        short: "i"
    },
    peerAgentUrl: {
        type: "string",
        short: "p"
    },
    userAgentDid: {
        type: "string",
        short: "u"
    },
    sendTask: {
        type: "boolean",
        short: "s"
    }
};

function generateTaskId(): string {
    return crypto.randomUUID();
}

export interface CLISession {
    currentTaskId: string
    agentCard: AgentCard
    client: A2AClient
    agentName: string
    sendTask: boolean
}

export interface CLIOptions {
    iam?: string
    userAgentDid?: string
    peerAgentUrl?: string
}

// --- Main Loop ---
export async function main(options?:CLIOptions) {
    // --- Parse command line ---
    const { values } = argv.parseArgs({
        args: process.argv.slice(2),
        options: ARGV_OPTIONS
    });
    const {
        iam = options?.iam,
        peerAgentUrl = options?.peerAgentUrl,
        userAgentDid = options?.userAgentDid,
        sendTask = false
    } = values;

    // --- Readline Setup ---
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: colorize("cyan", "You: "),
    });

    // Make main async
    console.log(colorize("bright", `A2A Terminal Client`));
    console.log(colorize("dim", `Agent URL: ${peerAgentUrl}`));
    if( !peerAgentUrl ) {
        console.log(`Please provide a peer agent URL using the -p option, such as:
    pnpm cli -p http://localhost:4004/a2a/connect`);
        process.exit();    
    }

    if( !!userAgentDid && !iam ) {
        console.log(`When the userAgentDid is provided, the iam profile must be provided using -i such as:
    pnpm cli -i a2a-client-demo-user -u "#connect" -p http://localhost:4004/a2a/connect`);
        process.exit();       
    }

    const agentContext = await resolveAgent( peerAgentUrl as string );
    const agentName = displayAgentCard( agentContext );
    const { agentCard } = agentContext;
    // Update prompt prefix to use the fetched name
    rl.setPrompt(colorize("cyan", `${agentName} > You: `));

    if( sendTask && agentCard.capabilities.streaming ) {
        console.log(colorize("red", "Agent is streaming, but --sendTask option was selected"));
        process.exit();
    }

    let authHandler;
    try {
        authHandler = !!userAgentDid ? await createAuthHandler( iam as string, userAgentDid as string ) : undefined;
    } catch(err) {
        console.log(
            colorize("bright", `${err}`)
        );
        process.exit();
    }

    const session: CLISession = {
        currentTaskId: generateTaskId(),
        agentCard,
        client: new A2AClient( agentCard.url, { authHandler } ),
        agentName,
        sendTask: !!sendTask
    };

    console.log(colorize("dim", `Starting Task ID: ${session.currentTaskId}`));
    console.log(
        colorize("gray", `Enter messages, or use '/new' to start a new task.`)
    );

    rl.prompt(); // Start the prompt immediately

    rl.on("line", async (line) => {
        const input = line.trim();

        if (!input) {
            rl.prompt();
            return;
        }

        if (input.toLowerCase() === "/new") {
            session.currentTaskId = generateTaskId();
            console.log(
                colorize("bright", `✨ Starting new Task ID: ${session.currentTaskId}`)
            );
            rl.prompt();
            return;
        }

        // Construct just the params for the request
        const params: TaskSendParams = {
            // Use the specific Params type
            id: session.currentTaskId, // The actual Task ID
            message: {
                role: "user",
                parts: [{ type: "text", text: input }], // Ensure type: "text" is included if your schema needs it
            },
        };

        try {
            await send({ session, params });
        } catch (error: any) {
            console.error(
                colorize("red", `\n❌ Error communicating with agent (${session.agentName}):`),
                error.message || error
            );
            if (error.code) {
                console.error(colorize("gray", `   Code: ${error.code}`));
            }
            if (error.data) {
                console.error(
                    colorize("gray", `   Data: ${JSON.stringify(error.data)}`)
                );
            }
        } finally {
            rl.prompt(); // Ensure prompt is always shown after processing
        }
    }).on("close", () => {
        console.log(colorize("yellow", "\nExiting terminal client. Goodbye!"));
        process.exit(0);
    });
}