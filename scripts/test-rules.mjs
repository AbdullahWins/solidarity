#!/usr/bin/env node
// Runs the Firestore rules tests inside the Firestore emulator.
// firebase-tools needs Java 21+. If the default `java` is older, this falls
// back to Android Studio's bundled JBR when it exists (override with JAVA_HOME).
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

function javaMajor(javaBin) {
  try {
    const out = spawnSync(javaBin, ["-version"], { encoding: "utf8" });
    const m = /version "(\d+)/.exec(`${out.stderr}${out.stdout}`);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}

const env = { ...process.env };
const exe = process.platform === "win32" ? "java.exe" : "java";
const current = env.JAVA_HOME ? join(env.JAVA_HOME, "bin", exe) : "java";
if (javaMajor(current) < 21) {
  const candidates = [
    "C:\\Program Files\\Android\\Android Studio\\jbr",
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
    "/opt/android-studio/jbr",
  ];
  const jbr = candidates.find((dir) => existsSync(join(dir, "bin", exe)) && javaMajor(join(dir, "bin", exe)) >= 21);
  if (!jbr) {
    console.error("Firestore emulator needs Java 21+. Install a JDK 21 and set JAVA_HOME.");
    process.exit(1);
  }
  env.JAVA_HOME = jbr;
  env.PATH = `${join(jbr, "bin")}${process.platform === "win32" ? ";" : ":"}${env.PATH}`;
}

try {
  // One shell string so the quoted test command survives on Windows (cmd).
  execSync('firebase emulators:exec --only firestore --project demo-solidarity "npx jest --runInBand --config jest.rules.config.js"', {
    stdio: "inherit",
    env,
  });
} catch (err) {
  process.exit(typeof err.status === "number" ? err.status : 1);
}
