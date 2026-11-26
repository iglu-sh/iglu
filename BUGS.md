# Iglu cache – bug hunt findings

Tested on 2026-10-12 against a local instance (`cache/config.toml`: SQLite + S3/MinIO, client-side signing) using cachix 1.12.1 and real Nix, plus manual API probing and code review.

**What works:** pushing, re-pushing (dedupe), substituting a full closure (`jq` + deps) with signature verification, and TTL expiry. All 324 existing tests pass (`test::shared` 218, `test::cache` 106), but none of the issues below are covered.

Legend: ✅ reproduced live · 🔍 found by code review (not reproduced)

---

## 🔴 High severity

- [X] **1. Concurrent pushes permanently break a path** ✅
  - **Where:** `shared/db/schema_sqlite.ts:93` (+ `schema_pg.ts`), `cache/routes/api/v1/cache/[tenant]/multipart-nar/[uid]/complete.ts:147`, `cache/routes/[tenant]/[hash].narinfo.ts:116`
  - **Repro:** run `cachix push default <new-path>` 3× in parallel → 3 `derivations_tenants_links` rows for the same (tenant, derivation). `GET /<tenant>/<hash>.narinfo` now 404s forever (expects exactly one link), while `POST /api/v1/cache/<tenant>/narinfo` reports it as present, so cachix says "Nothing to push" and never repairs it.
  - **Fix:** unique index on `(tenants_id, derivations_id)` + upsert / on-conflict-do-nothing in `complete.ts`; make the narinfo GET tolerate >1 link (pick the newest) for existing data.
  - **Test:** call `complete` twice for the same store path and tenant → exactly one link, narinfo returns 200.

- [x] ~~**2. Rotating a signing key makes all paths signed with it vanish**~~ → intended behaviour, see [Not bugs](#-not-bugs-intended-behaviour)

- [X] **3. `POST .../key` accepts any string as a public key** ✅
  - **Where:** `cache/routes/api/v1/cache/[tenant]/key.ts`
  - **Repro:** `{"publicKey":"not-a-key"}` → 200 and replaces the API key's real public key. Because replacing a key intentionally invalidates the paths signed with the old one, a single typo or bad client request hides everything that key pushed, and every following client-signed upload fails signature verification (424).
  - **Fix:** validate it as base64 of exactly 32 bytes (ed25519).

- [X] **4. Any API key can modify any other API key** ✅
  - **Where:** `cache/routes/api/v1/iglu/rest/keys/auth/modify.ts`
  - **Repro:** key `attacker` (access to `default` only) sends `PATCH /api/v1/iglu/rest/keys/auth/modify {"id":"<victim id>","name":"pwned","tenants":["<default id>"]}` → the victim key is renamed, loses access to `victimtenant`, and gains `default`.
  - **Fix:** only allow modifying yourself or keys whose tenants are all a subset of the caller's; never remove links to tenants the caller doesn't control.
  - **Test:** a key without access to tenant X can't add or remove X on another key.

- [X] **5. `X-Forwarded-For` is trusted unconditionally → IP rules can be bypassed** ✅
  - **Where:** `shared/utils/rest/IPFiltering.ts:7`, `access_rules/index.ts` (same pattern)
  - **Repro:** drop rule `127.0.0.0/8` → 403; same request with `X-Forwarded-For: 8.8.8.8` → 200. A list value (`a, b`) or garbage (`lol`, parsed as 0.0.0.0) is also accepted.
  - **Fix:** add a `trusted_proxies` config option and only honor XFF from those (take the right-most untrusted hop); otherwise use `req.socket.remoteAddress`. Validate IPs, and decide how IPv6 / `::ffff:` addresses are handled.

- [X] **6. Tenants can overwrite each other's files in S3; client FileHash is never verified** ✅
  - **Where:** `shared/files/S3.ts:155-205` (`combine`), object key `<hash>-<suffix>.<compression>`
  - **Repro:** a path in `default`; push the same path to `ttltest` with `cachix push -l 16` → the object `default` serves (`sha256 c3e6…`) no longer matches its narinfo FileHash (`90c9…`). A malicious uploader could replace another tenant's file with garbage.
  - **Fix:** content-address the object key (e.g. by FileHash), verify the SHA-256 after `CompleteMultipartUpload`, and never overwrite an existing object with different content.

- [X] **7. CIDR parsing is wrong** ✅
  - **Where:** `shared/utils/ip/index.ts` (`cidr_to_range`)
  - **Repro:** `10.0.0.0/0` → only matches 10.0.0.0 (`1<<32 === 1` in JS; only the literal `0.0.0.0/0` is special-cased). `/33` → 128.0.0.0-255.255.255.255, `/99` and `999.1.1.1/32` are accepted. An unparseable block → 500 with a stack trace.
  - **Fix:** validate octets 0-255 and prefix 0-32 (zod), handle prefix 0 generally, and return 422 on invalid input.
  - **Test:** table test for /0, /1, /31, /32 and invalid inputs.

- [X] **8. Stored XSS on the tenant info page** ✅
  - **Where:** `cache/routes/[tenant]/index.ts:43-77`
  - **Repro:** create a tenant with `github_username: "<img src=x onerror=alert(document.domain)>"` → executed on `GET /xsstest`.
  - **Fix:** HTML-escape every substituted value (name, username, keys, hostname).

- [X] **41. Every deployment route crashes: `FilterFeatures` reads a config key that no longer exists** 🔍
  - **Where:** `shared/utils/rest/FilterFeatures.ts:11`, `:52`
  - `Configuration.getConfig().deployments.enable_deployments` → `deployments` was removed from the config schema, so this throws a TypeError on `/api/v1/deploy/*`, `/api/v2/deploy/activate`, `ws.ts`, `ws-deployment.ts` and `deploy/log/[deployment_id].ts`.
  - **Why the tests don't notice:** `tests/cache/utils/setupConfig.ts:43` and `tests/shared/setup.ts:51` still build the old config shape by hand. Building test configs with `config_schema.parse(...)` would catch this kind of drift.

---

## 🟠 Medium severity

- [X] **9. `nix-cache-info` sends `Priority 1` without a colon** ✅
  - **Where:** `cache/routes/[tenant]/nix-cache-info.ts:84`. Nix ignores the line, so the tenant priority never takes effect.

- [ ] **10. Narinfo is served as `text/html`** ✅
  - **Where:** `cache/routes/[tenant]/[hash].narinfo.ts:182`: `"x-nix-narinfo"` → `"text/x-nix-narinfo"`.

- [X] **11. SQLite never enables foreign keys → no cascades run** ✅
  - **Where:** `shared/db/Connectors/SQLite.ts:17`
  - **Evidence:** the dev DB already has 13 links pointing at deleted signing keys. Deleting tenants or keys leaves orphan rows.
  - **Fix:** run `PRAGMA foreign_keys = ON` on connect (+ a one-off orphan cleanup migration).

- [ ] **12. Relative `database_file_location` is missing a path separator** ✅
  - **Where:** `shared/utils/cache/Configuration.ts:88`. `IGLU_CWD + "out.sqlite"` → `/home/berg/iglu/cacheout.sqlite`.
  - **Fix:** `path.join(process.env.IGLU_CWD, db_file_location)`.

- [ ] **13. Malformed JSON bodies leak an HTML stack trace with absolute paths** ✅
  - **Where:** `cache/index.ts`: no Express error handler.
  - **Repro:** `POST /api/v1/cache/default/narinfo` with body `[1,2`.
  - **Fix:** add a final `(err, req, res, next)` handler returning `MakeRestResponse(400/500, …)` JSON.

- [ ] **14. Tenant create/PATCH accepts nonsense values** ✅
  - **Where:** `cache/routes/api/v1/iglu/rest/tenants/index.ts`, `tenants/[tenant]/index.ts`, `tenant_schema` in `shared/utils/zod/zod_db_schemas.ts`
  - **Accepted:** empty names, names with `/` (both unreachable and undeletable over REST), reserved names like `api`, `preferred_compression_method: "bogus"`, negative `ttl`/`priority`, arbitrary `permission`.
  - **Fix:** a dedicated REST schema with `name: /^[a-z0-9][a-z0-9-_]*$/`, a reserved-name list, `enum(["xz","zstd"])`, `ttl > 0`, `priority >= 0`.

- [ ] **15. Filesystem storage: re-pushing an already stored path always fails with 500** 🔍
  - **Where:** `shared/files/FilesystemProvider.ts` `combine()`: when the existing file's hash matches, the parts are deleted but there's no `return`, so the loop below throws "Part file … does not exist". Affects pushing the same path to a second tenant.

- [ ] **16. Filesystem storage: path traversal through client-controlled names** 🔍
  - **Where:** `complete.ts:82` (`cStoreHash`/`cStoreSuffix` → file name), `api/v1/iglu/upload/[tenant]/[uid].ts` (`partNumber` → file name)
  - **Fix:** validate the store hash (`^[0-9a-df-np-sv-z]{32}$`), the suffix (no `/`, nix name charset), and `partNumber` as a positive integer.

- [ ] **17. Filesystem storage: upload `PUT` endpoint has no authentication; `store()` isn't awaited** 🔍
  - **Where:** `api/v1/iglu/upload/[tenant]/[uid].ts`, `FilesystemProvider.store()` (write stream never closed/awaited, errors are lost, responds before the data is flushed). The upload's tenant isn't checked against the URL either.

- [ ] **18. Deployment key `expires_at` is never enforced** 🔍
  - **Where:** `v1/deploy/deployment/[deployment_id].ts`, `v2/deploy/activate.ts`, `ws.ts`, `ws-deployment.ts`. `grep expires_at` only hits schema/config.

- [ ] **30. API key hashing ignores the configured `hashing_secret`** 🔍
  - **Where:** `shared/utils/crypto/api_key_generation.ts:30`: the salt is the hardcoded string `"set this to something secure please god"`; the config's `hashing_secret` / `hashing_secret_file` is never used, despite what `config.toml` says.
  - **Careful when fixing:** switching to the configured secret invalidates every existing API key hash, so plan a migration (e.g. try the new hash first and fall back to re-hashing with the legacy salt on successful login).

- [ ] **19. API keys are UUIDv7** 🔍
  - **Where:** `keys/auth/index.ts` (`Bun.randomUUIDv7()`), config key generation
  - The key is a timestamp plus about 62 random bits and is created in the same millisecond as its public ID (`…cf3b-76c0…` key vs `…cf3b-76c1…` id). Use `crypto.randomBytes(32)` (base64url).

- [ ] **42. Tenant values are HTML-escaped in the DAO, not at render time** 🔍
  - **Where:** `shared/db/DAO/tenants.ts` (`insert` / `update` call `escape_html`), `shared/utils/html/index.ts`
  - Escaped values are stored in the DB, so the REST API returns `&amp;` etc. in JSON, and `getByName("a&b")` never matches the stored `a&amp;b`. `escape_html` also mutates the caller's object in place (`return_obj = input`).
  - **Fix:** store raw values and escape only in `cache/routes/[tenant]/index.ts` (where #8 actually renders HTML); return a copy instead of mutating.

- [ ] **43. Upload completion isn't transactional** 🔍
  - **Where:** `cache/routes/api/v1/cache/[tenant]/multipart-nar/[uid]/complete.ts:251-333`
  - Derivation insert, `combine()`, link insert, request insert and upload delete run as separate statements. A failure in between (e.g. link insert after a successful derivation + combine) leaves half-written state behind.
  - **Fix:** run the DB writes in one transaction (the DAOs already accept an executor) and clean up the stored file on rollback.

- [ ] **44. `X-Forwarded-For` lists are not split (#5 fix incomplete)** 🔍
  - **Where:** `shared/utils/rest/IPFiltering.ts:61-63`
  - In reverse-proxy mode the whole header value is used as the client IP. A proxy that appends (`client, proxy1`) or a client that sends its own XFF produces a value `convert_IP_to_number` can't parse → every such request gets a 403.
  - **Fix:** split on `,`, trim, and take the right-most hop that isn't a trusted proxy.

- [ ] **45. Hashing secret read from a file isn't trimmed** 🔍
  - **Where:** `cache/lib/startup_modules/modules/hashing.module.ts` (`await file.text()`)
  - A secret file with a trailing newline (most editors / `echo` add one) gives different hashes than the same value set via `IGLU_HASHING_SECRET`, so switching between the two invalidates every API key.
  - **Fix:** `.trim()` the file contents (and check `encryption.module.ts` for the same pattern).

---

## 🟡 Low severity / polish

- [ ] **20.** A missing signature (`cSig: null`, which cachix sends when it has no key for that cache) returns a generic "400 Malformed Body". Return a clear "no signature / no signing key configured" error. ✅ (`complete.ts` body schema)
- [ ] **21.** `Authentication.ts:7` uses `includes("Bearer")`, so `xx <key> Bearer` authenticates, while a lowercase `bearer` (valid per RFC 7235) is rejected. Parse `^Bearer\s+(\S+)$` case-insensitively. ✅
- [ ] **22.** `multipart-nar/[uid]` accepts `partNumber=abc`, `0`, `99999`. Validate as an integer from 1 to 10000. ✅
- [ ] **23.** `complete` / `[uid]` don't check that the upload belongs to the tenant in the URL (`upload.tenants_id`). 🔍
- [ ] **24.** Server-side signing signs whatever NarHash/references the client claims; the server never checks them against the uploaded data. Document this, or verify the NarHash after decompression. 🔍
- [ ] **25.** `activate.ts:152` returns a URL `/api/v1/iglu/deployments/<id>/human_readable` that doesn't exist. 🔍
- [ ] **26.** The OpenAPI path for the narinfo route is `/{tenant}/{hash}.narinfo.ts` (`[hash].narinfo.ts:34`). 🔍
- [ ] **27.** Log line in `[hash].narinfo.ts:151` interpolates `${tenant}` → `[object Object]`. 🔍
- [ ] **28.** Abandoned uploads (DB rows + S3 multipart uploads) are never aborted/cleaned up after timeout. 🔍
- [ ] **29.** REST-created tenants can't be deleted if their name is empty or contains `/` (follows from #14). ✅
- [ ] **46.** The JSON log file is corrupted: `shared/logger/Logger.ts:168` appends `` `${json} "\n"` ``, i.e. a literal quote, newline, quote after every line, so the file isn't valid JSON Lines. 🔍
- [ ] **47.** An invalid `LOG_LEVEL` env var (`Logger.ts:61`) becomes `undefined`, so no level is ever filtered and everything is logged. In pretty mode, `logRequest` / `logResponse` also crash on HTTP methods missing from `verbColorMap` (e.g. `TRACE`). 🔍
- [ ] **48.** `IPFiltering.ts:8` uses `NextFunction` without importing it (only runs because Bun strips types), and logs a `warn` on **every** request when `use_reverse_proxy` is set without `trusted_proxies`. Warn once at startup instead. 🔍
- [ ] **49.** Startup coordinator (`cache/lib/StartupCoordinator.ts`): the error of a failed non-optional module is only logged at `debug`, so Iglu exits without a visible reason in production. `timeout_ms` is never enforced (no module reads `ctx.signal`, the `setTimeout` at `:172` is never cleared), and `stop()` is never called (no SIGTERM handler), despite what `Module.ts` documents. 🔍
- [ ] **50.** `bun run cache::db::generate::sqlite` / `::postgres` are broken: `cache/drizzle/migrator_pre.ts` (and `shared/db/migrator.ts`) import `../lib/load_config`, which no longer exists. 🔍

---

## ✅ Not bugs (intended behaviour)

- **#2 Signing key rotation hides paths signed with the old key.** Uploading a new public key (e.g. `cachix generate-keypair`) replaces the old one, and paths signed with it stop being served and are reported as missing, so the client re-pushes them. This is deliberate: it avoids storing several public keys per key and juggling outdated ones.
- **Public signing keys belong to an API key (auth token), not to a tenant.** This deliberately replaces a user system and keeps public key management simple; one key upload applies to every tenant that API key can access.
- Both only matter for `signing_method = "client"`. **Server-side signing is the recommended signing method**, and with it neither applies.

Possible follow-ups (optional, not bugs):
- [ ] Mention in the docs / the `generate-keypair` flow that uploading a new key invalidates the paths signed with the old key under client-side signing.
- [ ] Add a test that pins the intended rotation behaviour (old paths 404, `POST /narinfo` reports them missing so cachix re-pushes), so it doesn't change by accident.

---

## 🧪 Regression tests

Drafted in `tests/regressions/` and **expected to fail until the bug is fixed**. Run them with `bun run test::regressions`. Once a bug is fixed and its test passes, move the test into `tests/cache` / `tests/shared` so CI guards it.

| File | Covers |
|---|---|
| `nix_protocol.test.ts` | #1, #3, #9, #10, #26 |
| `uploads.test.ts` | #15, #16, #17, #20, #22, #23 |
| `security.test.ts` | #4, #5, #8, #18, #19, #21, #30 |
| `validation.test.ts` | #7, #14, #29 |
| `config_db.test.ts` | #11, #12 |
| `e2e/live.test.ts` | #1, #5, #6, #9, #10, #13 against a running instance (skipped unless `IGLU_E2E_URL`, `IGLU_E2E_API_KEY` and optionally `IGLU_E2E_SIGNING_KEY` are set; **modifies the target server**) |

Status at the time of writing: 64 fail, 15 pass (the passing ones are sanity checks that must keep passing after a fix), 5 skipped (e2e).

Existing tests that will need updating when the matching bug is fixed:
- [ ] #18: `tests/cache/routes/api/v2/deploy/activate.test.ts` uses an activation key with `expires_at: 10` (1970) and expects success.
- [ ] #5: most route tests only set `x-forwarded-for` and no `socket.remoteAddress`; once XFF is only trusted from proxies, they need a socket address (or a trusted proxy in the test config).
- [ ] #11: `tests/shared/daos/utils.ts` and `tests/cache/utils/setupDatabase.ts` enable `PRAGMA foreign_keys = ON` themselves, which is why the suite never noticed #11.

Still missing:
- [ ] An end-to-end `nix copy --from` (substitution) check in CI against a test instance

---

## 🧹 Test data left on the dev instance

- [ ] Tenants: `victimtenant` (has a 127.0.0.0/8 drop rule + bogus rules), `""`, `bad name/../x`, `api`, `ttltest`, `xsstest`, `bogcomp`
- [ ] API keys: `pwned` (was `victimkey`), `attacker`, `rot`
- [ ] Broken `race.txt` path in `default` (from #1)
- [ ] Easiest: wipe `cacheout.sqlite` and the MinIO bucket

---

## 🔁 Startup rewrite review (`chore-startup-rewrite` → `main`)

Found by an automated cloud review on 2026-11-19 (🔍, not reproduced live). #31–#36 make the cache exit during startup.

- [ ] **31. `reconcile.mode = "off"` stops the cache from starting** 🔍
  - **Where:** `cache/lib/startup_modules/targets/declarative.target.ts:10`, `filesystem_cleanup.module.ts:11`, `orphan_derivation_cleanup.module.ts:11`, `cache/lib/StartupCoordinator.ts:236`
  - With mode `off`, the declarative modules report themselves disabled and are marked `skipped`. The non-optional `declarative.target` and both cleanup modules still `require` them, and the coordinator treats `skipped` as failed → `process.exit(1)`.
  - **Fix:** treat "skipped because disabled" as satisfied, or make those requires conditional/optional.

- [ ] **32. `deployment_keys[].in_file` is nullable in the config but required in `database_version_schema`** 🔍
  - **Where:** `shared/utils/zod/zod_config_schema.ts:278` (config side: line 179)
  - Any deployment key using `generated = true` or `plaintext_key` has `in_file = null`, so `Database_Versions.insert` fails validation and startup exits.
  - **Fix:** make the version schema nullable to match the config. Also check `out_file` and the api_keys `generated` field.

- [ ] **33. Tenants that already exist in the DB are skipped, so keys that reference them throw** 🔍
  - **Where:** `cache/lib/declarative_execution/tenant.ts:39-44`, `cache/lib/declarative_execution/api_key.ts:63-65`
  - A tenant created by the old `startup.ts` or through the REST API is logged and `continue`d without being added to `tenants_for_db_version`. Any API key, keypair or deployment key referencing it then throws "Unable to find tenant" → crash loop on upgrade.
  - **Fix:** adopt or link the existing row so it ends up in `tenants_for_db_version`.

- [ ] **34. `expires_at = "-1"` (never expires) is no longer handled** 🔍
  - **Where:** `cache/lib/startup_modules/modules/declarative-deployment-key.module.ts:122`, `:155`, `:166`
  - `Date.parse("-1")` is `NaN`. The old `startup.ts` mapped `"-1"` to `-1`, and `-1` is the NixOS module default (`nix/modules/services/iglu-cache.nix:305`). It either fails validation or stores `NaN`, and the modified check is true on every boot.
  - **Fix:** restore the `"-1"` handling and validate `expires_at` as an ISO datetime or `"-1"`.

- [ ] **35. NixOS module and VM test not migrated to the new config format** 🔍
  - **Where:** `nix/modules/services/iglu-cache.nix` (lines 29-34, 130, 146, 223-316, 371), `nix/tests/iglu-cache.nix`
  - The module still writes `server.hashing_secret_file`, `server.encryption.secret_file`, `tenants.definitions`/`create_tenants_from_config` and `deployments`, and doesn't set the new `IGLU_*_SECRET(_FILE)` env vars. `hashing.module.ts:27` / `encryption.module.ts:28` throw, and the tenants/`api_keys` layout fails validation. Every `services.iglu-cache.enable = true` host fails on start.

- [ ] **36. `Filesystem.clean()` unlinks non-UUID entries without a directory check or `continue`** 🔍
  - **Where:** `shared/files/FilesystemProvider.ts:223-226`
  - A directory like `lost+found` (dedicated volume) throws EISDIR → non-optional `filesystem_cleanup.module` fails → exit. Without `continue`, Postgres also passes the non-UUID name to the uuid-typed `getAllForDerivation` query (`schema_pg.ts:101`).
  - **Fix:** check `isDirectory` before unlinking and `continue` after handling a non-UUID entry.

- [ ] **37. Server-signing keypair check counts every tenant's keypairs** 🔍
  - **Where:** `cache/lib/startup_modules/modules/declarative-tenant.module.ts:60-69`
  - `tenant_is_referenced = true` runs for every keypair, not only `keypair.tenant === tenant_name`. A server-signing tenant with no keypair passes if another tenant has one; two tenants with their own keypairs can trigger a false "multiple Server-Side Keypairs" error.
  - **Fix:** set the flag only inside `if (keypair.tenant === tenant_name)`.

- [ ] **38. Deployment-key hash comparison is inverted** 🔍
  - **Where:** `cache/lib/startup_modules/modules/declarative-deployment-key.module.ts:157-159`
  - `hash_of_key === latest_version_value[0].hash` should be `!==`. Unchanged keys are rewritten on every boot (`created_at: Date.now()`), and a rotated key (only `plaintext_key` / `in_file` contents changed) is never updated, so the old key keeps working.

- [ ] **39. Keypair moved to another tenant: the old keypair is never deleted** 🔍
  - **Where:** `cache/lib/startup_modules/modules/declarative-keypairs.module.ts:108`, `:154`
  - Line 108 pushes the old keypair into `return_object.deleted`, then line 154 replaces the array with `deleted_keypairs`. The old keypair, its signing key and its `IGLU_SERVERSIDE_SIGNING_KEY` API key stay attached to the old tenant and drop out of the version state.
  - **Fix:** `return_object.deleted.push(...deleted_keypairs)`.

- [ ] **40. `tenant_schema` now requires `managed_by`, and REST routes validate bodies with it** 🔍
  - **Where:** `shared/utils/zod/zod_db_schemas.ts:14`; `cache/routes/api/v1/iglu/rest/tenants/index.ts:126`, `:166`; `tenants/[tenant]/index.ts:173`, `:202`
  - Existing clients that don't send `managed_by` (it isn't in `openapi/schema.openapi.json`) now get 422. Clients that do send it control it: they can relabel a config-managed tenant as `other` (so the reconciler skips deleting it) or create REST tenants labelled `configuration`.
  - **Fix:** validate request bodies with a schema that omits `managed_by` and set it on the server, as the access_rules routes already do (`managed_by: "other"`).
