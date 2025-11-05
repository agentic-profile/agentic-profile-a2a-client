/**
 * This file is derived from https://github.com/google/A2A.git
 * and under the Apache 2.0 License.
 * 
 * It has been modified to add support for the Agentic Profile, as
 * well as other enhancements.
 */

import { AgentContext } from "../agent-resolver.js";
import {
    TaskStatusUpdateEvent,
    TaskArtifactUpdateEvent,
    Message,
    FilePart,
    DataPart,
} from "@a2a-js/sdk";


// --- ANSI Colors ---
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
};

// --- Helper Functions ---
export function colorize(color: keyof typeof colors, text: string): string {
    return `${colors[color]}${text}${colors.reset}`;
}

// Function now accepts the unwrapped event payload directly
export function printAgentEvent(
    agentName: string,
    event: TaskStatusUpdateEvent | TaskArtifactUpdateEvent
) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = colorize("magenta", `\n${agentName} [${timestamp}]:`);

    // Check if it's a TaskStatusUpdateEvent
    if ("status" in event) {
        const update = event as TaskStatusUpdateEvent; // Cast for type safety
        const state = update.status.state;
        let stateEmoji = "❓";
        let stateColor: keyof typeof colors = "yellow";

        switch (state) {
            case "working":
                stateEmoji = "⏳";
                stateColor = "blue";
                break;
            case "input-required":
                stateEmoji = "🤔";
                stateColor = "yellow";
                break;
            case "completed":
                stateEmoji = "✅";
                stateColor = "green";
                break;
            case "canceled":
                stateEmoji = "⏹️";
                stateColor = "gray";
                break;
            case "failed":
                stateEmoji = "❌";
                stateColor = "red";
                break;
        }

        console.log(
            `${prefix} ${stateEmoji} Status: ${colorize(stateColor, state)}`
        );

        if (update.status.message) {
            printMessageContent(update.status.message);
        }
    }
    // Check if it's a TaskArtifactUpdateEvent
    else if ("artifact" in event) {
        const update = event as TaskArtifactUpdateEvent; // Cast for type safety
        console.log(
            `${prefix} 📄 Artifact Received: ${
                update.artifact.name || "(unnamed)"
            }`
        );
        printMessageContent({ role: "agent", parts: update.artifact.parts } as any); // Reuse message printing logic
    } else {
        // This case should ideally not happen if the stream yields correctly typed events
        console.log(
            prefix,
            colorize("yellow", "Received unknown event type:"),
            event
        );
    }
}

export function printMessageContent(message: Message) {
    message.parts.forEach((part, index) => {
        const partPrefix = colorize("gray", `  Part ${index + 1}:`);
        if ("text" in part) {
            console.log(`${partPrefix} ${colorize("green", "📝 Text:")}`, part.text);
        } else if ("file" in part) {
            const filePart = part as FilePart;
            console.log(
                `${partPrefix} ${colorize("blue", "📄 File:")} Name: ${
                    filePart.file.name || "N/A"
                }, Type: ${filePart.file.mimeType || "N/A"}, Source: ${
                    (filePart.file as any).bytes ? "Inline (bytes)" : (filePart.file as any).uri
                }`
            );
            // Avoid printing large byte strings
            // if (filePart.file.bytes) {
            //     console.log(colorize('gray', `    Bytes: ${filePart.file.bytes.substring(0, 50)}...`));
            // }
        } else if ("data" in part) {
            const dataPart = part as DataPart;
            console.log(
                `${partPrefix} ${colorize("yellow", "📊 Data:")}`,
                JSON.stringify(dataPart.data, null, 2)
            );
        }
    });
}

// --- Agent Card Fetching ---
export function displayAgentCard({ profileUrl, agenticProfile, agentCardUrl, agentCard }: AgentContext) {
    if( agenticProfile ) {
        console.log(colorize("green", `✓ Agentic Profile Found:`));
        console.log(`  URL: ${profileUrl}`);
    }

    const { name = "Agent", description, version, url } = agentCard;

    console.log(colorize("green", `✓ Agent Card Found:`));
    console.log(    `  Card URL:    ${colorize("bright", agentCardUrl)}`);
    console.log(    `  Service URL: ${colorize("bright", url)}`);
    console.log(    `  Name:        ${colorize("bright", name)}`);
    if (description) {
        console.log(`  Description: ${description}`);
    }
    console.log(    `  Version:     ${version || "N/A"}`);

    return name;    // agent name
}