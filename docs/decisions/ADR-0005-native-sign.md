# ADR-0005. Native signing ownership

Proposed for the Corely Sign implementation. Sign owns immutable published template versions, requests, recipient authority, acceptance and artifact readiness. Documents owns bytes. Coaching owns engagement transitions. Keep legacy signing operational during opt-in adoption.

Store relational signing records in the existing platform bucket beside Documents. Use composite tenant/workspace/request or template references, a bounded versioned JSON field snapshot and optimistic revisions. Keep queryable recipient progress and unique acceptances relational. Extension settings cannot enforce those constraints. Do not store binary documents or signature images in JSON. No dedicated database or service is needed.

A signed action and a verified final artifact have separate lifetimes. Finalization failure retains accepted evidence and retries the same durable operation. Only emit business completion after independent verification and archival. Documents exposes a private scoped port for canonical and signed bytes. The recipient review and finalization paths share the isolated native renderer. Enablement requires configured trust, storage, and notification delivery.
