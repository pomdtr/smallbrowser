import { environment } from "@raycast/api";
import { JSONFileSyncPreset } from "lowdb/node";
import path from "path";

export type HistoryEntry = {
  icon?: string;
  title: string;
  url: string;
  timestamp: number;
};

export type Credential =
  | {
      type: "basic";
      username: string;
      password: string;
    }
  | {
      type: "bearer";
      token: string;
    };

export const db = JSONFileSyncPreset<{
  history: Record<string, HistoryEntry>;
  credentials: Record<string, Credential>;
}>(path.join(environment.supportPath, "db.json"), {
  history: {},
  credentials: {},
});

export function getAuthorizationHeader(origin: string) {
  const credential = db.data.credentials[origin];
  if (!credential) {
    return undefined;
  }

  switch (credential.type) {
    case "basic":
      return `Basic ${btoa(`${credential.username}:${credential.password}`)}`;
    case "bearer":
      return `Bearer ${credential.token}`;
  }
}
