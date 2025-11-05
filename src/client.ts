/**
 * This file is derived from https://github.com/google/A2A.git
 * and under the Apache 2.0 License.
 * 
 * It has been modified to add support for the Agentic Profile, as
 * well as other enhancements.
 */

import {
    SendMessageRequest,
    SendMessageResponse,
    MessageSendParams,
    Task,
    TaskStatusUpdateEvent,
    TaskArtifactUpdateEvent
} from "@a2a-js/sdk";

import { AuthenticationHandler } from "./auth-handler.js";
import { JsonRpcClient } from "./json-rpc.js";

export interface A2AClientOptions {
    fetchImpl?: typeof fetch,
    authHandler?: AuthenticationHandler
}

/**
 * A client implementation for the A2A protocol that communicates
 * with an A2A server over HTTP using JSON-RPC.
 */
export class A2AClient {
    private baseUrl: string;
    private rpcClient: JsonRpcClient;

    /**
     * Creates an instance of A2AClient.
     * @param baseUrl The base URL of the A2A server endpoint.
     * @param options Optional custom fetch implementation (e.g., for Node.js environments without
     *      global fetch), and authentication handler.
     */
    constructor(baseUrl: string, options?: A2AClientOptions) {
        // Ensure baseUrl doesn't end with a slash for consistency
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        this.rpcClient = new JsonRpcClient( this.baseUrl, options );
    }

    /**
     * Sends a task request to the agent (non-streaming).
     * @param params The parameters for the tasks/send method.
     * @returns A promise resolving to the Task object or null.
     */
    async sendMessage(params: MessageSendParams): Promise<Task | null> {
        const httpResponse = await this.rpcClient.makeHttpRequest<SendMessageRequest>(
            "message/send",
            params
        );

        if( !httpResponse )
            return null;

        // Pass the full Response type to handler, which returns Res['result']
        const result = await this.rpcClient.handleJsonResponse<SendMessageResponse>(
            httpResponse,
            "message/send"
        );
        return (result as Task | null) ?? null;
    }

    /**
     * Sends a task request and subscribes to streaming updates.
     * @param params The parameters for the tasks/sendSubscribe method.
     * @yields TaskStatusUpdateEvent or TaskArtifactUpdateEvent payloads.
     */
    sendTaskSubscribe(
        params: MessageSendParams
    ): AsyncIterable<TaskStatusUpdateEvent | TaskArtifactUpdateEvent> {
        const streamGenerator = async function* (
            this: A2AClient
        ): AsyncIterable<TaskStatusUpdateEvent | TaskArtifactUpdateEvent> {
            // Use SendMessageRequest but with type assertion for the method parameter
            // The request structure is the same, only the method name differs
            const httpResponse =
                await this.rpcClient.makeHttpRequest<SendMessageRequest>(
                    "message/stream" as SendMessageRequest["method"],
                    params,
                    "text/event-stream"
                );

            if (httpResponse) {
                // handleSseResponse is an async generator, so we directly yield from it
                // The generic type specifies the result type of the JSON-RPC response
                type StreamingResponse = {
                    jsonrpc: "2.0";
                    id?: string | number | null;
                    result: TaskStatusUpdateEvent | TaskArtifactUpdateEvent;
                    error?: never;
                };
                yield* this.rpcClient.handleSseResponse<StreamingResponse>(
                    httpResponse,
                    "message/stream"
                );
            }
        }.bind(this)();

        return streamGenerator;
    }

    /**
     * Retrieves the current state of a task.
     * @param params The parameters for the tasks/get method.
     * @returns A promise resolving to the Task object or null.
     *
    async getTask(params: TaskQueryParams): Promise<Task | null> {
        const httpResponse = await this.rpcClient.makeHttpRequest<GetTaskRequest>(
            "tasks/get",
            params
        );
        return (await this.rpcClient.handleJsonResponse<GetTaskResponse>(httpResponse, "tasks/get")) ?? null;
    }

    /**
     * Cancels a currently running task.
     * @param params The parameters for the tasks/cancel method.
     * @returns A promise resolving to the updated Task object (usually canceled state) or null.
     *
    async cancelTask(params: TaskIdParams): Promise<Task | null> {
        const httpResponse = await this.rpcClient.makeHttpRequest<CancelTaskRequest>(
            "tasks/cancel",
            params
        );
        return (await this.rpcClient.handleJsonResponse<CancelTaskResponse>(
            httpResponse,
            "tasks/cancel"
        )) ?? null;
    }

    /**
     * Sets or updates the push notification config for a task.
     * @param params The parameters for the tasks/pushNotification/set method (which is TaskPushNotificationConfig).
     * @returns A promise resolving to the confirmed TaskPushNotificationConfig or null.
     *
    async setTaskPushNotification(
        params: TaskPushNotificationConfig
    ): Promise<TaskPushNotificationConfig | null> {
        const httpResponse = await this.rpcClient.makeHttpRequest<SetTaskPushNotificationRequest>(
            "tasks/pushNotification/set",
            params
        );
        return (await this.rpcClient.handleJsonResponse<SetTaskPushNotificationResponse>(
            httpResponse,
            "tasks/pushNotification/set"
        )) ?? null;
    }

    /**
     * Retrieves the currently configured push notification config for a task.
     * @param params The parameters for the tasks/pushNotification/get method.
     * @returns A promise resolving to the TaskPushNotificationConfig or null.
     *
    async getTaskPushNotification(
        params: TaskIdParams
    ): Promise<TaskPushNotificationConfig | null> {
        const httpResponse = await this.rpcClient.makeHttpRequest<GetTaskPushNotificationRequest>(
            "tasks/pushNotification/get",
            params
        );
        return (await this.rpcClient.handleJsonResponse<GetTaskPushNotificationResponse>(
            httpResponse,
            "tasks/pushNotification/get"
        )) ?? null;
    }

    /**
     * Resubscribes to updates for a task after a potential connection interruption.
     * @param params The parameters for the tasks/resubscribe method.
     * @yields TaskStatusUpdateEvent or TaskArtifactUpdateEvent payloads.
     *
    resubscribeTask(
        params: TaskQueryParams
    ): AsyncIterable<TaskStatusUpdateEvent | TaskArtifactUpdateEvent> {
        const streamGenerator = async function* (
            this: A2AClient
        ): AsyncIterable<TaskStatusUpdateEvent | TaskArtifactUpdateEvent> {
            const httpResponse =
                await this.rpcClient.makeHttpRequest<TaskResubscriptionRequest>(
                    "tasks/resubscribe",
                    params,
                    "text/event-stream"
                );

            const result = this.rpcClient.handleSseResponse<SendTaskStreamingResponse>(
                httpResponse,
                "tasks/resubscribe"
            );

            if (isAsyncIterable<TaskStatusUpdateEvent | TaskArtifactUpdateEvent>(result)) {
                yield* result;
            }
        }.bind(this)();

        return streamGenerator; // Type is AsyncIterable<TaskStatusUpdateEvent | TaskArtifactUpdateEvent>
    }
    */
}

/*
function isAsyncIterable<T>(obj: any): obj is AsyncIterable<T> {
    return obj != null && typeof obj[Symbol.asyncIterator] === 'function';
}*/
