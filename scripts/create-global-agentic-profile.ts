//import 'dotenv/config';

import os from "os";
import { join } from "path";
import {
    createAgenticProfile,
    prettyJson,
    webDidToUrl
} from "@agentic-profile/common";
import {
    createEdDsaJwk,
    postJson
} from "@agentic-profile/auth";
import {
    saveProfile
} from "@agentic-profile/express-common";


(async ()=>{

    const port = process.env.PORT || 3003;
    const services = [
        {
            name: "People connector",
            type: "A2A",
            id: "connect",
            url: `http://localhost:${port}/a2a/connect`
        }
    ];
    const { profile, keyring, b64uPublicKey } = await createAgenticProfile({ services, createJwk: createEdDsaJwk });

    try {
        // publish profile to web (so did:web:... will resolve)
        const { data } = await postJson(
            "https://testing.agenticprofile.ai/agentic-profile",
            { profile, b64uPublicKey }
        );
        const savedProfile = data.profile;
        const did = savedProfile.id;
        console.log( `Published agentic profile to:

    ${webDidToUrl(did)}

Or via DID at:

    ${did}
`);

        // also save locally for reference
        const dir = join( os.homedir(), ".agentic", "iam", "my-a2a-client" );
        await saveProfile({ dir, profile: savedProfile, keyring });

        console.log(`Saved agentic profile to ${dir}

Shhhh! Keyring for testing... ${prettyJson( keyring )}`);
    } catch (error) {
        console.error( "Failed to create global profile", error );
    }
})();