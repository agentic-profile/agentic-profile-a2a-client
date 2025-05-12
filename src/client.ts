/**
 * This file is derived from https://github.com/google/A2A.git
 * and under the Apache 2.0 License.
 * 
 * It has been modified to add support for the Agentic Profile, as
 * well as other enhancements.
 */

import {
    // Full Request types (needed for internal generics)
    SendTaskRequest,
    GetTaskRequest,
    CancelTaskRequest,
    SendTaskStreamingRequest,
    TaskResubscriptionRequest,
    SetTaskPushNotificationRequest,
    GetTaskPushNotificationRequest,

    // Specific Params types (used directly in public method signatures)
    TaskSendParams,
    TaskQueryParams, // Used by get, resubscribe
    TaskIdParams, // Used by cancel, getTaskPushNotificationConfig
    TaskPushNotificationConfig, // Used by setTaskPushNotificationConfig

    // Full Response types (needed for internal generics and result extraction)
    SendTaskResponse,
    GetTaskResponse,
    CancelTaskResponse,
    SendTaskStreamingResponse,
    SetTaskPushNotificationResponse,
    GetTaskPushNotificationResponse,

    // Response Payload types (used in public method return signatures)
    Task,
    // TaskHistory, // Not currently implemented
    
    // Streaming Payload types (used in public method yield signatures)
    TaskStatusUpdateEvent,
    TaskArtifactUpdateEvent,
} from "./schema.js";

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
    async sendTask(params: TaskSendParams): Promise<Task | null> {
        const httpResponse = await this.rpcClient.makeHttpRequest<SendTaskRequest>(
            "tasks/send",
            params
        );

        if( !httpResponse )
            return null;

        // Pass the full Response type to handler, which returns Res['result']
        return (await this.rpcClient.handleJsonResponse<SendTaskResponse>(
            httpResponse,
            "tasks/send"
        )) ?? null;
    }

    /**
     * Sends a task request and subscribes to streaming updates.
     * @param params The parameters for the tasks/sendSubscribe method.
     * @yields TaskStatusUpdateEvent or TaskArtifactUpdateEvent payloads.
     */
    sendTaskSubscribe(
        params: TaskSendParams
    ): AsyncIterable<TaskStatusUpdateEvent | TaskArtifactUpdateEvent> {
        const streamGenerator = async function* (
            this: A2AClient
        ): AsyncIterable<TaskStatusUpdateEvent | TaskArtifactUpdateEvent> {
            const httpResponse =
                await this.rpcClient.makeHttpRequest<SendTaskStreamingRequest>(
                    "tasks/sendSubscribe",
                    params,
                    "text/event-stream"
                );

            if( httpResponse ) {
                // Pass the full Response type to handler, which yields Res['result']
                const result = await this.rpcClient.handleSseResponse<SendTaskStreamingResponse>(
                    httpResponse,
                    "tasks/sendSubscribe"
                );

                if (isAsyncIterable<TaskStatusUpdateEvent | TaskArtifactUpdateEvent>(result)) {
                    yield* result;
                }
            }
        }.bind(this)();

        return streamGenerator; // Type is AsyncIterable<TaskStatusUpdateEvent | TaskArtifactUpdateEvent>
    }

    /**
     * Retrieves the current state of a task.
     * @param params The parameters for the tasks/get method.
     * @returns A promise resolving to the Task object or null.
     */
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
     */
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
     */
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
     */
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
     */
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
}

function isAsyncIterable<T>(obj: any): obj is AsyncIterable<T> {
    return obj != null && typeof obj[Symbol.asyncIterator] === 'function';
}
