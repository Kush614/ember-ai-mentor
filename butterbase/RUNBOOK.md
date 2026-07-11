# Butterbase runbook — hackathon 07/11

Everything needed to go from mocks → live Butterbase → deployed → submitted.

## Tonight (5 minutes, per the organizers' email)

1. Sign up at https://dashboard.butterbase.ai
2. Billing → select **Launch plan** → promo code **BUTTER0711** (all caps, $20 credit)
3. API Keys page → generate a key (`bb_sk_...`)
4. Set it for the MCP server (already configured in `.cursor/mcp.json`):
   - PowerShell: `[Environment]::SetEnvironmentVariable("BUTTERBASE_API_KEY", "bb_sk_...", "User")` then restart Cursor
5. Join `#Butterbase-support` on Discord in case anything melts

## Event day — backend (MCP tools, ~5 min)

1. `init_app` with name `ember` → note the **app id** and API base URL
2. `apply_schema` with the contents of `butterbase/schema.json`
   (tables: `learners`, `transcripts`, `connector_events` — matches `src/lib/backend.ts`)
3. Generate a service key if the platform key shouldn't be reused: `manage_auth_config` action `generate_service_key`
4. Fill `.env`:
   ```
   VITE_BUTTERBASE_URL=https://api.butterbase.ai/v1/{app_id}
   VITE_BUTTERBASE_KEY=bb_sk_...
   ```
5. Restart `npm run dev` → director bar should show `backend:butterbase` green
6. CORS: `manage_app` action `update_cors` with your dev origin (`http://localhost:5174`) and the deployed `.pages.dev` origin once known

## Event day — deploy (frontend deployment, static Vite SPA)

1. `npm run build`
2. Zip the contents of `dist/`
3. `create_frontend_deployment` (framework `react-vite`) → upload URL
4. `curl -X PUT "{uploadUrl}" -H "Content-Type: application/zip" --data-binary @dist.zip`
5. `start_frontend_deployment` → live `.pages.dev` URL
6. If shipping real LLM keys is needed for judging, prefer `set_frontend_env` over
   committing them — but remember VITE_ vars are public in the bundle either way.
   Safest: move the Anthropic call into a Butterbase serverless function later.

## Submission

Submission happens through the `prep_and_submit_hackathon_entry` MCP tool
(it appears in the tool list while the hackathon submission window is open):

1. Call with `action: "prep"` + the **submission code from the organizers**
   → returns the hackathon slug, field schema, and a ready-made `next_call` template
2. Call with `action: "submit"`, the slug, the filled `data` fields, and **`app_id`**
   (strongly recommended so the entry is bound to the deployed app)
3. The submission code is only needed on the first submission; resubmits are fine after

Note: the $20 promo code (BUTTER0711) is for billing — the **submission code is
different** and comes from the organizers at the event.

## Gotchas

- The Data API base already includes `/v1/{app_id}` — the adapter appends `/transcripts`
  and `/connector_events` directly.
- Service keys (`bb_sk_`) bypass RLS — fine for the demo, don't ship one in a public
  frontend you care about.
- Video handoffs are stored as data URLs inside `connector_events.card_json` (jsonb) —
  a 20s webm is ~1–2 MB per row, acceptable for demo volume.
