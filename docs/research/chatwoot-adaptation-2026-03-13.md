# Chatwoot Adaptation For Ruptur

Date: 2026-03-13

## Decision

Do not vendor Chatwoot into Ruptur.

Adopt the product patterns that matter for our operation:

- queue-first inbox
- conversation-centered CRM actions
- richer lead metadata for triage
- background job discipline for messaging and automation
- pipeline views that can become kanban

## Why not import the whole project

Chatwoot is a mature helpdesk platform with a larger application surface and a different stack boundary. The official repository is a Rails monolith with Sidekiq workers, PostgreSQL and Redis, plus a broader support workload than Ruptur needs.

Relevant official sources:

- https://github.com/chatwoot/chatwoot
- https://www.chatwoot.com/hc/user-guide/articles/1677689344-how-to-use-custom-attributes
- https://www.chatwoot.com/hc/user-guide/articles/1677691027-how-to-create-custom-filters
- https://www.chatwoot.com/hc/user-guide/articles/1677696862-how-to-use-labels

Importing it directly would pull in:

- Ruby/Rails runtime and operational burden
- Redis/Sidekiq job semantics across the whole product
- multi-tenant support/helpdesk concepts we do not need
- a much larger permission and data model than the current Ruptur scope

## What Chatwoot gets right that we should absorb

### 1. Inbox is not just a message list

The conversation view is backed by queue semantics, agent action states and customer context. Ruptur was too close to a provider mirror. We need the UI to answer:

- who needs response now
- what stage the lead is in
- what changed last
- what action is safe to take next

### 2. Filters and saved operational views

Chatwoot leans on labels, custom attributes and custom filters. For Ruptur, the equivalent should be:

- queue state
- provider / instance
- source / campaign / sendflow origin
- pipeline stage
- lead score / hand raise / warmup risk

### 3. Background job posture

Chatwoot uses worker-backed processing because messaging, automation and state sync are not request/response concerns. Ruptur should treat these as queues:

- outbound message dispatch
- provider retry / failover
- follow-up scheduling
- pipeline automation
- campaign fanout

### 4. CRM action from inside conversation

The lead owner should not leave the conversation to update stage, qualify, or escalate. This pattern is directly applicable to Ruptur and is already partially reflected in our inbox.

### 5. Kanban is a derived operational view

Chatwoot is not a pure kanban CRM, but its filter/view model makes kanban-style customizations viable. In Ruptur, kanban should be derived from pipeline stage plus queue signals, not built as a disconnected board.

## Gap against current Ruptur

Current Ruptur already has:

- `leads`
- `conversations`
- `messages`
- `pipeline_stages`
- `pipeline_events`
- `lead_scores`
- `campaigns`
- `channel_health`
- workflow tables

Current missing pieces for a stronger Chatwoot-like operation:

- explicit queue state derived and exposed by API
- tags / labels on leads and conversations
- custom attributes for business-specific segmentation
- saved views for operators
- assignment / ownership
- reliable outbound job queue with retry state
- inbox SLAs and stale conversation detection

## What was implemented in this slice

- inbox redesigned around queue control, not just a dark message screen
- lightweight kanban-like stage strip added to the inbox
- lead API now exposes `last_message_direction`
- queue states can now be derived as:
  - `awaiting_us`
  - `awaiting_contact`
  - `no_conversation`
  - `active`

## Next implementation slices

### Slice 2: data model

- `lead_labels`
- `conversation_labels`
- `lead_attributes jsonb`
- `lead_assignments`
- `saved_views`

### Slice 3: backend

- `GET /crm/views`
- `POST /crm/views`
- `GET /crm/queues/summary`
- `PATCH /crm/leads/{id}/assign`
- message dispatch jobs with retry metadata

### Slice 4: frontend

- saved views rail
- kanban board with drag and guarded stage transition
- assignee and labels in the context panel
- SLA and stale conversation indicators

## Practical recommendation

Use Chatwoot as a reference model, not as a dependency.

Ruptur should remain opinionated around WhatsApp operations, pipeline movement, warmup and campaign routing. That is where our edge is.
