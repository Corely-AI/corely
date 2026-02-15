# CRM Sequence Automation - Testing Guide

## 🚀 Quick Start

### Prerequisites
1. ✅ Database migrations applied (`pnpm prisma:migrate`)
2. ✅ Prisma client generated (`pnpm prisma:generate`)
3. ✅ API service running
4. ✅ Worker service configured
5. ✅ Web app running

### Environment Variables

Make sure your `.env` file has:

```bash
# Worker needs this to call the API
API_BASE_URL=http://localhost:3000

# Optional: Configure worker tick runners
WORKER_TICK_RUNNERS=sequences,invoices
```

## 📝 Step-by-Step Testing

### 1. Seed Test Data

First, get a tenant ID from your database:

```sql
SELECT id, name FROM "identity"."Tenant" LIMIT 1;
```

Then seed test sequences:

```bash
export TEST_TENANT_ID="your-tenant-id-here"
pnpm -F @corely/data tsx scripts/seed-test-sequence.ts
```

This creates:
- "New Lead Follow-up" sequence (3 steps)
- "Deal Nurture Campaign" sequence (2 steps)

### 2. Test API Endpoints

#### List Sequences
```bash
curl http://localhost:3000/crm/sequences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID"
```

Expected: JSON array of sequences with their steps

#### Create a Sequence
```bash
curl -X POST http://localhost:3000/crm/sequences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Sequence",
    "description": "Created via API",
    "steps": [
      {
        "stepOrder": 1,
        "type": "EMAIL_AUTO",
        "dayDelay": 0,
        "templateSubject": "Welcome!",
        "templateBody": "Thanks for signing up!"
      },
      {
        "stepOrder": 2,
        "type": "TASK",
        "dayDelay": 3,
        "templateSubject": "Follow up",
        "templateBody": "Remember to follow up"
      }
    ]
  }'
```

#### Enroll a Lead
```bash
# First create a lead (or use existing)
curl -X POST http://localhost:3000/crm/leads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Lead",
    "email": "test@example.com",
    "source": "MANUAL"
  }'

# Then enroll in sequence
curl -X POST http://localhost:3000/crm/sequences/enroll \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "sequenceId": "YOUR_SEQUENCE_ID",
    "entityType": "lead",
    "entityId": "YOUR_LEAD_ID"
  }'
```

### 3. Test Worker Execution

#### Check Current Enrollments
```sql
SELECT 
  e.id,
  e."currentStepOrder",
  e.status,
  e."nextExecutionAt",
  s.name as sequence_name
FROM "crm"."SequenceEnrollment" e
JOIN "crm"."Sequence" s ON e."sequenceId" = s.id
WHERE e.status = 'ACTIVE'
  AND e."nextExecutionAt" <= NOW();
```

#### Manually Trigger Worker Tick
```bash
pnpm dev:worker:tick
```

#### What Should Happen:
1. Worker calls `/internal/crm/sequences/run`
2. API processes due enrollments
3. Activities created based on step type:
   - `EMAIL_AUTO`: Creates completed TASK activity
   - `EMAIL_MANUAL`: Creates EMAIL_DRAFT activity
   - `CALL`: Creates TASK activity with due date
   - `TASK`: Creates TASK activity
4. Enrollment advances to next step or completes

#### Verify Results
```sql
-- Check created activities
SELECT 
  a.id,
  a.type,
  a.subject,
  a."createdAt"
FROM "crm"."Activity" a
WHERE a."createdAt" > NOW() - INTERVAL '5 minutes'
ORDER BY a."createdAt" DESC;

-- Check enrollment status
SELECT 
  id,
  "currentStepOrder",
  status,
  "nextExecutionAt"
FROM "crm"."SequenceEnrollment"
WHERE id = 'YOUR_ENROLLMENT_ID';
```

### 4. Test UI Components

#### View Sequences Page
1. Navigate to: `http://localhost:5173/crm/sequences`
2. You should see:
   - List of sequences as cards
   - Sequence name, description, step count
   - "New Sequence (Coming Soon)" button

#### Test Enrollment Card
1. Navigate to a lead detail page: `/crm/leads/YOUR_LEAD_ID`
2. Look for the "Automation" card in the sidebar
3. Select a sequence from dropdown
4. Click "Enroll" button
5. Verify enrollment success toast

### 5. Test AI Copilot Tools

#### In the CRM Chat Interface:

**Test CreateEmailDraftTool:**
```
Draft an email to follow up with John Smith about the enterprise deal
```

Expected: AI creates an email draft activity

**Test RecommendNextStepTool:**
```
What should I do next for deal XYZ?
```

Expected: AI analyzes timeline and suggests next step

**Test GetDealSummaryTool:**
```
Summarize the current status of our pipeline
```

Expected: AI provides deal summary

### 6. Test Edge Cases

#### Enroll Same Lead Twice
```bash
# Should succeed - leads can be in multiple sequences
curl -X POST http://localhost:3000/crm/sequences/enroll \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "sequenceId": "DIFFERENT_SEQUENCE_ID",
    "entityType": "lead",
    "entityId": "SAME_LEAD_ID"
  }'
```

#### Invalid Sequence
```bash
curl -X POST http://localhost:3000/crm/sequences/enroll \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "sequenceId": "non-existent-id",
    "entityType": "lead",
    "entityId": "YOUR_LEAD_ID"
  }'
```

Expected: 404 or validation error

#### Missing Entity
```bash
curl -X POST http://localhost:3000/crm/sequences/enroll \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "sequenceId": "YOUR_SEQUENCE_ID",
    "entityType": "lead",
    "entityId": ""
  }'
```

Expected: Validation error

## 🐛 Troubleshooting

### Worker Not Processing Enrollments

**Check 1: Worker Configuration**
```bash
# Ensure sequences runner is enabled
echo $WORKER_TICK_RUNNERS
```

**Check 2: API Connectivity**
```bash
# From worker container/process
curl http://localhost:3000/health
```

**Check 3: Service Token**
Verify `WORKER_SERVICE_TOKEN` is set and matches API configuration

### Activities Not Being Created

**Check enrollment status:**
```sql
SELECT * FROM "crm"."SequenceEnrollment" 
WHERE id = 'YOUR_ENROLLMENT_ID';
```

**Check API logs:**
```bash
# Look for errors in sequence execution
tail -f logs/api.log | grep sequence
```

### UI Not Showing Sequences

**Check browser console:**
- Look for API errors
- Verify authentication token

**Check API response:**
```bash
curl http://localhost:3000/crm/sequences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -v
```

## 📊 Monitoring Queries

### Active Enrollments Summary
```sql
SELECT 
  s.name,
  COUNT(*) as enrollment_count,
  COUNT(*) FILTER (WHERE e."nextExecutionAt" <= NOW()) as due_count
FROM "crm"."SequenceEnrollment" e
JOIN "crm"."Sequence" s ON e."sequenceId" = s.id
WHERE e.status = 'ACTIVE'
GROUP BY s.id, s.name
ORDER BY enrollment_count DESC;
```

### Sequence Performance
```sql
SELECT 
  s.name,
  COUNT(DISTINCT e.id) as total_enrollments,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'COMPLETED') as completed,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'ACTIVE') as active,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'CANCELED') as canceled
FROM "crm"."Sequence" s
LEFT JOIN "crm"."SequenceEnrollment" e ON s.id = e."sequenceId"
GROUP BY s.id, s.name
ORDER BY total_enrollments DESC;
```

### Recent Activity from Sequences
```sql
SELECT 
  a.type,
  a.subject,
  a."createdAt",
  s.name as sequence_name
FROM "crm"."Activity" a
JOIN "crm"."SequenceEnrollment" e ON (
  e."leadId" = a."leadId" OR e."partyId" = a."partyId"
)
JOIN "crm"."Sequence" s ON e."sequenceId" = s.id
WHERE a."createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY a."createdAt" DESC;
```

## ✅ Success Criteria

Your implementation is working correctly if:

1. ✅ Can create sequences via API
2. ✅ Can list sequences in UI
3. ✅ Can enroll leads/parties in sequences
4. ✅ Worker processes due enrollments
5. ✅ Activities are created based on step type
6. ✅ Enrollments advance through steps
7. ✅ Enrollments complete when all steps done
8. ✅ AI tools work in chat interface
9. ✅ No errors in API/Worker logs
10. ✅ UI shows sequences and enrollment card

## 🎯 Next Steps

Once basic testing is complete:

1. **Add Permissions**: Implement `crm.sequences.read` and `crm.sequences.manage`
2. **Email Integration**: Connect to actual email service for `EMAIL_AUTO` steps
3. **Sequence Builder UI**: Create visual editor for sequences
4. **Analytics**: Add performance tracking and reporting
5. **A/B Testing**: Support multiple sequence variations
6. **Conditional Logic**: Branch sequences based on engagement
7. **Rate Limiting**: Prevent spam with sending limits
8. **Unsubscribe**: Add opt-out mechanism

## 📚 Additional Resources

- [Implementation Summary](./implementation_summary_phase3.md)
- [Prisma Schema](./packages/data/prisma/schema/45_party_crm.prisma)
- [API Documentation](./docs/api/crm-sequences.md) (TODO)
- [Worker Configuration](./docs/worker-configuration.md) (TODO)
