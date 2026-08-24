import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadEnv } from "../../api/env.mjs";

test("runtime environment overrides the external dotenv file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cosmos-env-"));
  const file = join(directory, ".env");
  const previous = process.env.COSMOS_TEST_OVERRIDE;
  try {
    await writeFile(file, "COSMOS_FILE_ONLY=present\nCOSMOS_TEST_OVERRIDE=file\n", "utf8");
    process.env.COSMOS_TEST_OVERRIDE = "process";
    const environment = loadEnv(file);
    assert.equal(environment.COSMOS_FILE_ONLY, "present");
    assert.equal(environment.COSMOS_TEST_OVERRIDE, "process");
  } finally {
    if (previous === undefined) delete process.env.COSMOS_TEST_OVERRIDE;
    else process.env.COSMOS_TEST_OVERRIDE = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
