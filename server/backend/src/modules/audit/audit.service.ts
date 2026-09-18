import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import { AuditEvent } from "./audit-event.model";

export interface AuditInput {
  actorId?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

export async function recordAuditEvent(input: AuditInput, session?: ClientSession) {
  const [event] = await AuditEvent.create([{ eventId: randomUUID(), ...input }], { session });
  return event;
}
