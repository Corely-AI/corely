import {
  BrowserLanguageSelect,
  useBrowserLocale,
} from "@corely/web-shared/shared/i18n/browser-locale";
import messages from "@/shared/i18n/locales/directory.json";
import { type FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createIdempotencyKey } from "@corely/api-client";
import { Link, useParams } from "react-router-dom";
import type { CreateDirectoryLeadRequest } from "@corely/contracts";
import { directoryClient } from "@/shared/lib/api";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { LoadingState } from "@/shared/ui/loading-state";
import { useToast } from "@/shared/ui/toast";
import { directoryQueryKeys } from "../query-keys";

type LeadFormState = {
  name: string;
  contact: string;
  message: string;
};

const INITIAL_FORM: LeadFormState = {
  name: "",
  contact: "",
  message: "",
};

export const RestaurantDetailPage = () => {
  const locale = useBrowserLocale();
  const copy = messages[locale];
  const { slug } = useParams<{ slug: string }>();
  const { pushToast } = useToast();
  const [form, setForm] = useState<LeadFormState>(INITIAL_FORM);
  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: directoryQueryKeys.detail(slug ?? ""),
    enabled: Boolean(slug),
    queryFn: () => directoryClient.getRestaurantBySlug(slug ?? ""),
  });

  const mutation = useMutation({
    mutationFn: async (params: { input: CreateDirectoryLeadRequest; idempotencyKey: string }) => {
      return directoryClient.createLead(params.input, { idempotencyKey: params.idempotencyKey });
    },
    onSuccess: (response) => {
      setSubmittedLeadId(response.leadId);
      setForm(INITIAL_FORM);
      setActiveIdempotencyKey(null);
      pushToast(copy.success, "success");
    },
    onError: (error) => {
      pushToast(error instanceof Error ? error.message : copy.failedSend, "error");
    },
  });

  const restaurant = detailQuery.data?.restaurant;

  const canSubmit = useMemo(
    () => form.name.trim() && form.contact.trim() && form.message.trim(),
    [form.contact, form.message, form.name]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant || !canSubmit) {
      return;
    }

    const idempotencyKey = activeIdempotencyKey ?? createIdempotencyKey();
    if (!activeIdempotencyKey) {
      setActiveIdempotencyKey(idempotencyKey);
    }

    mutation.mutate({
      idempotencyKey,
      input: {
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
        name: form.name.trim(),
        contact: form.contact.trim(),
        message: form.message.trim(),
      },
    });
  };

  const updateField = (field: keyof LeadFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSubmittedLeadId(null);
    setActiveIdempotencyKey(null);
  };

  if (!slug) {
    return <EmptyState title={copy.missing} message={copy.missingSlug} />;
  }

  return (
    <div className="page">
      <BrowserLanguageSelect className="language-select" />
      <p>
        <Link className="link-back" to="/berlin">
          {copy.back}
        </Link>
      </p>

      {detailQuery.isLoading ? <LoadingState /> : null}

      {detailQuery.error ? (
        <ErrorState
          message={detailQuery.error instanceof Error ? detailQuery.error.message : copy.failedLoad}
          onRetry={() => detailQuery.refetch()}
        />
      ) : null}

      {!detailQuery.isLoading && !detailQuery.error && restaurant ? (
        <div className="detail-layout">
          <article className="detail-card">
            <div className="card-meta">
              <span>{restaurant.neighborhoodSlug ?? "Berlin"}</span>
              <span>{restaurant.priceRange ?? "$"}</span>
            </div>
            <h1>{restaurant.name}</h1>
            <p>{restaurant.shortDescription ?? copy.noDescription}</p>
            <ul className="detail-list">
              <li>
                <strong>{copy.address}</strong>
                <span>
                  {restaurant.addressLine}, {restaurant.postalCode} {restaurant.city}
                </span>
              </li>
              <li>
                <strong>{copy.phone}</strong>
                <span>{restaurant.phone ?? copy.notListed}</span>
              </li>
              <li>
                <strong>{copy.website}</strong>
                <span>
                  {restaurant.website ? (
                    <a href={restaurant.website} target="_blank" rel="noreferrer">
                      {restaurant.website}
                    </a>
                  ) : (
                    copy.notListed
                  )}
                </span>
              </li>
            </ul>

            <div className="tag-row">
              {restaurant.dishTags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </article>

          <section className="form-card">
            <h2>{copy.inquiry}</h2>
            <p>{copy.inquiryIntro}</p>

            <form className="lead-form" onSubmit={handleSubmit}>
              <label>
                {copy.name}
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.currentTarget.value)}
                  placeholder={copy.yourName}
                  required
                />
              </label>

              <label>
                {copy.contact}
                <input
                  value={form.contact}
                  onChange={(event) => updateField("contact", event.currentTarget.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                {copy.message}
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(event) => updateField("message", event.currentTarget.value)}
                  placeholder={copy.inquiryPlaceholder}
                  required
                />
              </label>

              <button className="btn" type="submit" disabled={!canSubmit || mutation.isPending}>
                {mutation.isPending ? copy.sending : copy.send}
              </button>

              {submittedLeadId ? (
                <p className="submit-hint">{copy.submitted.replace("{{id}}", submittedLeadId)}</p>
              ) : null}

              {mutation.isError ? (
                <p className="submit-hint submit-hint-error">{copy.submissionError}</p>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
};
