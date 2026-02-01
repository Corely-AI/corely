# 1. Configuration (Verified from your context)
export PROJECT_ID="oneway8x-portfolio"
export SA_NAME="github-deployer"
export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
export POOL_NAME="corely-github-pool"
export PROVIDER_NAME="corely-github-provider"
export REPO="Corely-AI/corely"  # <--- I found this from your git config

# 2. Grant Deployment Permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/iam.serviceAccountUser"

# 3. Create Workload Identity Pool (It's okay if this says 'already exists')
gcloud iam workload-identity-pools create $POOL_NAME \
    --project=$PROJECT_ID \
    --location="global" \
    --display-name="Corely GitHub Actions Pool" || true

echo "Waiting for pool creation..."
sleep 5

# 4. Get the Pool ID
export WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe $POOL_NAME \
    --project=$PROJECT_ID \
    --location="global" \
    --format="value(name)")

# 5. Create the Provider (It's okay if this says 'already exists')
gcloud iam workload-identity-pools providers create-oidc $PROVIDER_NAME \
    --project=$PROJECT_ID \
    --location="global" \
    --workload-identity-pool=$POOL_NAME \
    --display-name="Corely GitHub Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --issuer-uri="https://token.actions.githubusercontent.com" || true

# 6. Allow GitHub Actions to use the Service Account
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
    --project=$PROJECT_ID \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${REPO}"

# 7. DONE! configuration
echo ""
echo "✅ COPY THESE VALUES TO GITHUB SECRETS:"
echo "GCP_PROJECT_ID: $PROJECT_ID"
echo "GCP_WIF_SA: $SA_EMAIL"
echo "GCP_WIF_PROVIDER: projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/$POOL_NAME/providers/$PROVIDER_NAME"