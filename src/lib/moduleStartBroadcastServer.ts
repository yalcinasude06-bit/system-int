import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createModuleStartedPayload, MODULE_STARTED_EVENT, moduleStartChannelTopic } from "./moduleStartRealtime";

export async function broadcastModuleStarted(
  client: SupabaseClient,
  sessionId: string,
  startedSession: unknown,
) {
  const payload = createModuleStartedPayload(startedSession);
  if (!payload) {
    console.warn("Module start Broadcast skipped because the RPC response was incomplete.");
    return false;
  }

  const channel = client.channel(moduleStartChannelTopic(sessionId));
  try {
    // An unjoined channel uses Supabase Realtime's broadly supported batch REST
    // endpoint, which is reliable in short-lived serverless route handlers.
    const result = await channel.send({
      type: "broadcast",
      event: MODULE_STARTED_EVENT,
      payload,
    }, { timeout: 1_500 });
    if (result !== "ok") console.warn("Module start Broadcast was not accepted; polling will recover.");
    return result === "ok";
  } catch (error) {
    console.warn("Module start Broadcast failed; polling will recover.", error);
    return false;
  } finally {
    try {
      await client.removeChannel(channel);
    } catch (error) {
      console.warn("Module start Broadcast channel cleanup failed.", error);
    }
  }
}
