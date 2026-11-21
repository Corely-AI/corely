-- Aggregates only. Suitable for a read-only monitoring identity.
SELECT "eventType", status, count(*) AS jobs,
       max(attempts) AS maximum_attempts,
       max(EXTRACT(EPOCH FROM now() - "availableAt")) FILTER
         (WHERE status = 'PENDING' AND "availableAt" <= now()) AS oldest_eligible_seconds
FROM workflow."OutboxEvent"
WHERE "eventType" LIKE 'sign.%'
GROUP BY "eventType", status;

SELECT status, "finalizationFailed", count(*) AS requests,
       percentile_cont(0.95) WITHIN GROUP
         (ORDER BY EXTRACT(EPOCH FROM "verifiedAt" - "sentAt")) AS p95_send_to_verified_seconds
FROM platform."SignCeremony"
GROUP BY status, "finalizationFailed";
