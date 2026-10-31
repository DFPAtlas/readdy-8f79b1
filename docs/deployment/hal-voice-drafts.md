# HAL voice daily-log drafts

Mobile field capture lists active saved job assignments and opens the existing daily-log draft form. Recording supports browser-selected WebM/Opus or MP4, a two-minute automatic stop and a 6 MiB audio cap. The user explicitly transcribes, reviews/edits the transcript, adds it to Work completed, and separately saves a draft. Existing written text is appended to rather than overwritten; overlong combined text is rejected. No audio or transcript is stored in browser storage; unsaved recordings are discarded on navigation/account/company/job scope changes. Transcription failures retain the recording on the current page for an explicit retry. Cancelling a browser request does not guarantee a remote GPU operation stops.

The transcribe-daily-log Edge Function validates the Supabase user and explicitly checks active company membership, a saved job assignment, unarchived job/company, daily-log role (owner/admin/project_manager/site_supervisor) and billing locks. Its service-role queries fail closed. Authorization is checked before reading the upload, before forwarding it and before returning the result. No database writes, automatic log saves, publish actions, uploads to Storage or agent routing occur. HAL receives audio, English language hint and a server-generated correlation ID only, without job/company/account identifiers. Transcripts never go to the shared gateway broadcaster through the dedicated HAL endpoint. User-facing failures do not reveal upstream responses, tokens or stack traces.

## Rollout

No new database migration. Existing job_members, organisation_members, jobs, organisations and organisation_subscriptions are used. HAL Update v2 must already be installed and its dedicated path exposed. Keep the rest of the gateway private.

Set Supabase Edge Function secrets:

- HAL_TRANSCRIBE_URL=https://atlas-hal.tail3b5523.ts.net:10000/api/buildnerve/transcribe
- BUILDNERVE_TRANSCRIBE_TOKEN: the matching token in HAL's private service environment file (value only, no Bearer prefix).

The URL is deliberately restricted to the reviewed exact endpoint. Changing infrastructure requires reviewing the allowlist rather than accepting a user-supplied backend URL. Tokens are never included in browser code. CORS permits only the production apex/www domains; preview deployments need an explicit reviewed origin change.

Deploy transcribe-daily-log including index.ts and handler.ts, retaining JWT verification and application-level getUser checks. Pin @supabase/supabase-js to 2.57.4. Publish the frontend from merged main in Readdy. Existing daily-log RLS remains authoritative when saving.

## Verification

Automated tests exercise authentication before body reading, actual streaming byte caps, MIME validation, fixed destinations, access revocation during uploads/inference, upstream failures/no speech, output validation and real adapter policy checks for roles, assignments, archived resources and billing locks. TypeScript, lint and the production build cover the frontend. These are not browser microphone tests or an authenticated live audio test.

After deployment use an authorized, assigned daily-log role: record a short English note, play it back, explicitly transcribe, edit the result, add it to Work completed and save the draft. Check the saved text and that no client summary is published. Test microphone denial, cancellation, navigation/account changes, loss of connectivity and a failed transcription retry on a real phone. Confirm a worker without a daily-log role cannot invoke the relay.

HAL's shared model limits concurrency and its dedicated endpoint limits authenticated attempts to six/minute/process. The browser does not automatically retry audio sends. The Edge Function bounds uploads to 6 MiB plus multipart overhead, has a 30-second body-read deadline, a 100-second upstream request limit and bounds HAL JSON to 64 KiB. No commercial transcription provider or fallback is used.

Validation at preparation: 83 Node tests passed, frontend TypeScript, zero-warning lint, production build, and strict Deno checking of handler.ts passed. Full index.ts Deno dependency resolution was blocked by this environment refusing the esm.sh connection; the actual adapter logic is covered by the Node tests with a stub database client. No authenticated live recording or browser microphone lifecycle test has run.
