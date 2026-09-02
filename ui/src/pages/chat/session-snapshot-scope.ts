import { gatewayCredentialScope } from "@openclaw/gateway-client/browser";
import type { ApplicationGatewayConnection } from "../../app/gateway.ts";
import { loadDeviceAuthToken, loadOrCreateDeviceIdentity } from "../../lib/nodes/index.ts";

export type SnapshotScope = {
  normalizedGatewayEndpoint: string;
  credentialLineageFingerprint: string;
  authenticatedPrincipalFingerprint?: string;
};

async function fingerprint(secret: string, value: unknown): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  const bytes = new Uint8Array(signature);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function resolveSnapshotScope(
  connection: ApplicationGatewayConnection,
  authenticatedPrincipal?: string | null,
): Promise<SnapshotScope | undefined> {
  try {
    const identity = await loadOrCreateDeviceIdentity();
    const token = connection.token.trim();
    const password = connection.password.trim();
    const storedDeviceToken =
      token || password || connection.bootstrapToken
        ? undefined
        : loadDeviceAuthToken({
            deviceId: identity.deviceId,
            gatewayUrl: connection.gatewayUrl,
            role: "operator",
          })?.token;
    const credentialLineage =
      token || password
        ? ["configured", token || null, password || null]
        : storedDeviceToken
          ? ["device-token", storedDeviceToken]
          : null;
    if (!credentialLineage) {
      return undefined;
    }
    const principal = authenticatedPrincipal?.trim();
    return {
      normalizedGatewayEndpoint: gatewayCredentialScope(connection.gatewayUrl),
      credentialLineageFingerprint: await fingerprint(identity.privateKey, [
        "chat-snapshot-credential-v1",
        credentialLineage,
      ]),
      ...(principal
        ? {
            authenticatedPrincipalFingerprint: await fingerprint(identity.privateKey, [
              "chat-snapshot-principal-v1",
              principal,
            ]),
          }
        : {}),
    };
  } catch {
    return undefined;
  }
}
