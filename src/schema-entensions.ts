import { DID } from "@agentic-profile/common/schema";

export interface A2AMessageEnvelope {
    to: DID;
    from: DID;
    created: Date;
    rewind?: string;    // ISODateString
}