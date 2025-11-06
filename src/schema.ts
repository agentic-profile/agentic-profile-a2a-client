import { DID } from "@agentic-profile/common/schema";

export interface A2AMessageEnvelope {
    to: DID;
    from: DID;
    created: Date;
    rewind?: string;    // ISODateString
}

/**
 * Base interface for identifying JSON-RPC messages.
 */
export interface JSONRPCMessageIdentifier {
    /**
     * Request identifier. Can be a string, number, or null.
     * Responses must have the same ID as the request they relate to.
     * Notifications (requests without an expected response) should omit the ID or use null.
     */
    id?: number | string | null;
}

/**
 * Base interface for all JSON-RPC messages (Requests and Responses).
 */
export interface JSONRPCMessage extends JSONRPCMessageIdentifier {
    /**
     * Specifies the JSON-RPC version. Must be "2.0".
     * @default "2.0"
     * @const "2.0"
     */
    jsonrpc?: "2.0";
}

/**
 * Represents a JSON-RPC request object base structure.
 * Specific request types should extend this.
 */
export interface JSONRPCRequest extends JSONRPCMessage {
    /**
     * The name of the method to be invoked.
     */
    method: string;

    /**
     * Parameters for the method. Can be a structured object, an array, or null/omitted.
     * Specific request interfaces will define the exact type.
     * @default null
     */
    params?: unknown; // Base type; specific requests will override
}

/**
 * Represents a JSON-RPC error object.
 */
export interface JSONRPCError<Data = unknown | null, Code = number> {
    /**
     * A number indicating the error type that occurred.
     */
    code: Code;

    /**
     * A string providing a short description of the error.
     */
    message: string;

    /**
     * Optional additional data about the error.
     * @default null
     */
    data?: Data;
}

/**
 * Represents a JSON-RPC response object.
 */
export interface JSONRPCResponse<R = unknown | null, E = unknown | null>
    extends JSONRPCMessage {
    /**
     * The result of the method invocation. Required on success.
     * Should be null or omitted if an error occurred.
     * @default null
     */
    result?: R;

    /**
     * An error object if an error occurred during the request. Required on failure.
     * Should be null or omitted if the request was successful.
     * @default null
     */
    error?: JSONRPCError<E> | null;
}

/**
 * JSON-RPC 2.0 standard error codes.
 * @see https://www.jsonrpc.org/specification#error_object
 */
export const ErrorCodeParseError = -32700;
export const ErrorCodeInvalidRequest = -32600;
export const ErrorCodeMethodNotFound = -32601;
export const ErrorCodeInvalidParams = -32602;
export const ErrorCodeInternalError = -32603;

/**
 * A2A-specific error codes (reserved range: -32000 to -32099)
 */
/** Error code for Task Not Found (-32001). The specified task was not found. */
export const ErrorCodeTaskNotFound = -32001;
export type ErrorCodeTaskNotFound = typeof ErrorCodeTaskNotFound;

/** Error code for Task Not Cancelable (-32002). The specified task cannot be canceled. */
export const ErrorCodeTaskNotCancelable = -32002;
export type ErrorCodeTaskNotCancelable = typeof ErrorCodeTaskNotCancelable;

/** Error code for Push Notification Not Supported (-32003). Push Notifications are not supported for this operation or agent. */
export const ErrorCodePushNotificationNotSupported = -32003;
export type ErrorCodePushNotificationNotSupported = typeof ErrorCodePushNotificationNotSupported;

/** Error code for Unsupported Operation (-32004). The requested operation is not supported by the agent. */
export const ErrorCodeUnsupportedOperation = -32004;
export type ErrorCodeUnsupportedOperation = typeof ErrorCodeUnsupportedOperation;

/**
 * Union of all well-known A2A and standard JSON-RPC error codes defined in this schema.
 * Use this type for checking against specific error codes. A server might theoretically
 * use other codes within the valid JSON-RPC ranges.
 */
export type KnownErrorCode =
    | typeof ErrorCodeParseError
    | typeof ErrorCodeInvalidRequest
    | typeof ErrorCodeMethodNotFound
    | typeof ErrorCodeInvalidParams
    | typeof ErrorCodeInternalError
    | typeof ErrorCodeTaskNotFound
    | typeof ErrorCodeTaskNotCancelable
    | typeof ErrorCodePushNotificationNotSupported
    | typeof ErrorCodeUnsupportedOperation;
