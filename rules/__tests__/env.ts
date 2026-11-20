import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { Firestore } from "firebase/firestore";

export const PROJECT_ID = "demo-solidarity";

export async function createEnv(): Promise<RulesTestEnvironment> {
  const hostPort = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const [host, port] = hostPort.split(":");
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8"),
    },
  });
}

export function verifiedDb(env: RulesTestEnvironment, uid: string): Firestore {
  return env.authenticatedContext(uid, { email_verified: true }).firestore() as unknown as Firestore;
}

export function unverifiedDb(env: RulesTestEnvironment, uid: string): Firestore {
  return env.authenticatedContext(uid, { email_verified: false }).firestore() as unknown as Firestore;
}
