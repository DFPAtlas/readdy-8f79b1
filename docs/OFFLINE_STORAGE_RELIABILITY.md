# Confirm local offline storage transactions

The offline store previously resolved save/delete promises on individual request success. IndexedDB may still abort after that event, so callers could treat rolled-back changes as saved. All local write helpers now resolve only on transaction completion, reject transaction errors/aborts and propagate synchronous enqueue failures. This confirms a committed browser transaction; it is not a guarantee against storage eviction or device failure.

Expired cache reads now use a read/write transaction and return their result after any expiry deletion commits. The old read-only deletion could throw instead of returning a cache miss. Mutation-status updates reject absent records and prevent `extra` fields moving a record's identity/account/company or overriding the requested status.

IndexedDB schema version 2 adds missing organisation indexes on mutation and upload-session stores. Upgrade code adds missing indexes to existing stores without recreating them or deleting records. Concurrent opens share an open promise. Connections close on version changes; a blocked upgrade reports that other BuildNerve tabs must be closed, and a later retry can open successfully.

Company cleanup now covers job packs, mutations, cached data and upload sessions in one transaction, using the organisation indexes. An abort rolls back all four stores. Device metadata stays separate. This repair does not invoke cleanup automatically or change login/logout behaviour.

## Scope and rollout

This is a prerequisite repair for future offline job downloads. It does not add job-pack downloads, offline task/attendance edits, upload execution, sync or conflict resolution. Existing screens retain their unavailable-workflow messages. No Supabase migration, Edge Function, secret or scheduler changes are required. After approved merge, pull main into Readdy and publish. Browser-local databases upgrade on their next use; users may need to close older tabs. Full device/browser UAT remains deferred. No user-device data has been changed during implementation.

## Validation

Tests use pinned dev-only `fake-indexeddb` 6.2.7 and execute the real offline-store module. They force aborts after request success, confirm rollback of saves/deletes and all-store cleanup, exercise cache expiry, preserve other-company records, upgrade a version-one store with existing data, reject missing/identity-changing mutation updates, test unique-key failures, and recover after blocked upgrades. Full Node tests, TypeScript, zero-warning lint and production build are run before review. Existing Vite configuration/chunk warnings remain. Real browser quota/eviction behaviour and physical storage durability are outside these in-memory tests.
