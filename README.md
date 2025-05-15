# Typescript A2A Client with Agentic Profile support

This project contains a TypeScript client implementation for the Agent-to-Agent (A2A) communication protocol that is derived from [Google's A2A sample code](https://github.com/google/A2A.git).  This client is suitable for use in browsers or servers and is available as an easy-to-use NPM package.

Additional support has been added for Agentic Profiles which scope agents by users and businesses, give those entities globally unique ids, and provide universal authentication. All these new capabilites are accomplished with standards (W3C DID documents, IETF JWK) and minimal glue code.


### Key Features of the Client

- **Globally Unique Agent Ids:** Scoped to users and businesses, to enable much easier discovery and powerful features like reputation.
- **Universal Authentication:** Leverages DID document authentication methods such as JSON Web Keys.
- **JSON-RPC Communication:** Handles sending requests and receiving responses (both standard and streaming via Server-Sent Events) according to the JSON-RPC 2.0 specification.
- **A2A Methods:** Implements standard A2A methods like `sendTask`, `sendTaskSubscribe`, `getTask`, `cancelTask`, `setTaskPushNotification`, `getTaskPushNotification`, and `resubscribeTask`.
- **Error Handling:** Provides basic error handling for network issues and JSON-RPC errors.
- **Streaming Support:** Manages Server-Sent Events (SSE) for real-time task updates (`sendTaskSubscribe`, `resubscribeTask`).
- **Extensibility:** Allows providing a custom `fetch` implementation for different environments (e.g., Node.js).


## Quickstart

The easiest way to try this library is locally.

1. Requirements:

    - [git](https://github.com/git-guides/install-git)
    - [node](https://nodejs.org/en/download)
    - [A2A-Service](https://github.com/agentic-profile/agentic-profile-a2a-service) running on localhost:4004

2. Start the A2A Service on localhost:4004

    - Follow the instructions to install, build, and run the A2A service demo: [A2A-Service](https://github.com/agentic-profile/agentic-profile-a2a-service)

3. From the shell, clone this repository and switch to the project directory.

    ```bash
    git clone git@github.com:agentic-profile/agentic-profile-a2a-client.git
    cd agentic-profile-a2a-client
    ```

4. Download dependencies and build the project

    ```bash
    npm install
    npm run build
    ```

5. For each of the following examples, open a new terminal window. For examples with authentication skip to step #6

    Start the A2A client using the agent card, but still no authentication

    ```bash
    npm run cli -- -p http://localhost:4004/agents/coder/
    ```

    Start the A2A client using the Agentic Profile, but still no authentication

    ```bash
    npm run cli -- -p did:web:localhost%3A4004:agents:coder#a2a-coder
    ```

6. In order to use authentication, you must create an agentic profile and keys to authenticate with.

    ```bash
    npm run create-demo-user
    ```

    The above script creates a new agentic profile on the test.agenticprofile.ai server, and also stores
    a copy in your filesystem at ~/.agentic/iam/a2a-client-demo-user

7. Examples using Agentic Profile authentication

    Start the A2A client with an Agentic Profile and authentication

    ```bash
    npm run cli -- -p did:web:localhost%3A4004:users:2:coder#a2a-coder -u "#connect"
    ```

    Start the A2A client with the well-known Agentic Profile and authentication

    ```bash
    npm run cli -- -p did:web:localhost%3A4004#a2a-coder -u "#connect"
    ```

    Start the A2A client with the well-known agent and no authentication

    ```bash
    npm run cli -- -p http://localhost:4004/ -u "#connect"
    ```

8. Example of authentication error - when no authentication is provided

    ```bash
    npm run cli -- -p did:web:localhost%3A4004#a2a-coder
    ```

    In this example, the remote server challenged the HTTP request, but the client had no authentication to provide:

    ```
    HTTP error 401 received for streaming method tasks/sendSubscribe. Response: {
      "type": "agentic-challenge/0.5",
      "challenge": {
          "id": 4,
          "secret": "DZF1pX61IDHl3RZXVTaZW203Dwdp0nnOyxdpjzeQbZE"
      }
  }
    ```


### Basic Usage

```typescript
import {
  A2AClient,
  Task,
  TaskQueryParams,
  TaskSendParams
} from "@agentic-profile/a2a-client";
import { v4 as uuidv4 } from "uuid"; // Example for generating task IDs

const client = new A2AClient("http://localhost:41241"); // Replace with your server URL

async function run() {
  try {
    // Send a simple task (pass only params)
    const taskId = uuidv4();
    const sendParams: TaskSendParams = {
      id: taskId,
      message: { role: "user", parts: [{ text: "Hello, agent!", type: "text" }] },
    };
    // Method now returns Task | null directly
    const taskResult: Task | null = await client.sendTask(sendParams);
    console.log("Send Task Result:", taskResult);

    // Get task status (pass only params)
    const getParams: TaskQueryParams = { id: taskId };
    // Method now returns Task | null directly
    const getTaskResult: Task | null = await client.getTask(getParams);
    console.log("Get Task Result:", getTaskResult);
  } catch (error) {
    console.error("A2A Client Error:", error);
  }
}

run();
```


### Streaming Usage

```typescript
import {
  A2AClient,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  TaskSendParams, // Use params type directly
} from "@agentic-profile/a2a-client";
import { v4 as uuidv4 } from "uuid";

const client = new A2AClient("http://localhost:41241");

async function streamTask() {
  const streamingTaskId = uuidv4();
  try {
    console.log(`\n--- Starting streaming task ${streamingTaskId} ---`);
    // Construct just the params
    const streamParams: TaskSendParams = {
      id: streamingTaskId,
      message: { role: "user", parts: [{ text: "Stream me some updates!", type: "text" }] },
    };
    // Pass only params to the client method
    const stream = client.sendTaskSubscribe(streamParams);

    // Stream now yields the event payloads directly
    for await (const event of stream) {
      // Type guard to differentiate events based on structure
      if ("status" in event) {
        // It's a TaskStatusUpdateEvent
        const statusEvent = event as TaskStatusUpdateEvent; // Cast for clarity
        console.log(
          `[${streamingTaskId}] Status Update: ${statusEvent.status.state} - ${
            statusEvent.status.message?.parts[0]?.text ?? "No message"
          }`
        );
        if (statusEvent.final) {
          console.log(`[${streamingTaskId}] Stream marked as final.`);
          break; // Exit loop when server signals completion
        }
      } else if ("artifact" in event) {
        // It's a TaskArtifactUpdateEvent
        const artifactEvent = event as TaskArtifactUpdateEvent; // Cast for clarity
        console.log(
          `[${streamingTaskId}] Artifact Update: ${
            artifactEvent.artifact.name ??
            `Index ${artifactEvent.artifact.index}`
          } - Part Count: ${artifactEvent.artifact.parts.length}`
        );
        // Process artifact content (e.g., artifactEvent.artifact.parts[0].text)
      } else {
        console.warn("Received unknown event structure:", event);
      }
    }
    console.log(`--- Streaming task ${streamingTaskId} finished ---`);
  } catch (error) {
    console.error(`Error during streaming task ${streamingTaskId}:`, error);
  }
}

streamTask();
```

This client is designed to work with servers implementing the A2A protocol specification.


# Demonstration of Enhancing A2A with the Agentic Profile

The Agentic Profile is a thin layer over A2A, MCP, and other HTTP protocols, and provides:

- Globally unique - user and business scoped - agent identity
- Universal authentication

The Agentic Profile is standards based:

- [W3C DIDs](https://www.w3.org/TR/did-1.0/) and DID documents provide globally unique ids that are scoped to users and businesses
- [IETF JSON Web Keys](https://datatracker.ietf.org/doc/html/rfc7517) provide universal authentication 


## Why do we need user and business scoped agent identity?

Identity is essential for digital communication between parties because it establishes trust, accountability, and context — without which meaningful, secure interaction is nearly impossible.

Current agent protocols focus on individual agent identity, which while accomplishing the communications goal, does not establish trust and accountability which derive from clear relationships with the people or business the agent represents.

For example, you trust an employee of a bank because they are in the bank building, behind the counter, and wearing a company nametag.


### How does the Agentic Profile solve this?

The Agentic Profile provides the digital equivalent of how we judge employees, by using a verifiable document provided by the person or business, and declaring all the agents that represent the person or business.

For example the business at the DNS domain matchwise.ai can have a "chat-agent", which combined becomes matchwise.ai#chat-agent.  [Concensys](https://consensys.io/) helped create the [DID specification](https://www.w3.org/TR/did-1.0/) which has a URI format that results in did:web:matchwise.ai#chat-agent.  DID documents (what you find using the did:web:matchwise.ai URI) provides a list of HTTP services, which are equivalent to agents.  The Agentic Profile simply lists the agents in the DID document services. 

With the Agentic Profile, the person or business is the first class citizen, and all the agents that represent them are clearly defined.


### How does A2A fit in?

Very easily.  For each DID document service/agent, we specify the "type" as "A2A" and use the serviceEndpoint to reference the agent.json file.


## Why do we need decentralized authentication?

Most agent authentication is done using shared keys and HTTP Authorization headers.  While this is easy to implement, it is very insecure.

Another popular option is OAuth, but that has another host of problems including dramatically increasing the attack surface and the challenges of making sure both agents agree on the same authentication service provider.  OAuth is really good for human-to-service authentication, but not very good for dynamic environments where the agent might have to create a new account with a new authentication service or complete MFA.


### How does the Agentic Profile solve this?

Public key cryptography, which is used extensively for internet communication, is ideal for decentralized authentication.  It is very easy to publish an agents public key via the Agentic Profile, and then the agent can use its secret key to authenticate.  JSON Web Tokens + EdDSA are mature and widely used standards, and the ones Agentic Profile uses.

With great options like JWT+EdDSA, centralized authentication systems like OAuth are unecessary.



