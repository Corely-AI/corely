import { describe, it, expect } from "vitest";
import {
  GetPublicRentalPropertyOutputSchema,
  ListPublicRentalPropertiesOutputSchema,
  ListRentalCategoriesOutputSchema,
  PublicPortfolioShowcaseListInputSchema,
  PublicPortfolioShowcasesOutputSchema,
} from "../index";

const now = new Date().toISOString();

describe("public site schemas", () => {
  it("parses public portfolio list inputs", () => {
    const result = PublicPortfolioShowcaseListInputSchema.parse({
      q: "studio",
      page: 1,
      pageSize: 10,
      type: "company",
    });

    expect(result.type).toBe("company");
  });

  it("parses public portfolio list output", () => {
    const payload = PublicPortfolioShowcasesOutputSchema.parse({
      items: [
        {
          id: "showcase-1",
          tenantId: "tenant-1",
          workspaceId: "workspace-1",
          type: "company",
          name: "Studio",
          slug: "studio",
          primaryDomain: null,
          isPublished: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      pageInfo: { page: 1, pageSize: 10, total: 1, hasNextPage: false },
    });

    expect(payload.items[0].slug).toBe("studio");
  });

  it("parses public rental list output", () => {
    const payload = ListPublicRentalPropertiesOutputSchema.parse([
      {
        id: "prop-1",
        status: "PUBLISHED",
        slug: "lake-house",
        name: "Lake House",
        summary: null,
        descriptionHtml: null,
        maxGuests: 4,
        coverImageFileId: null,
        price: 210,
        currency: "USD",
        images: [],
        categories: [],
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    expect(payload[0].slug).toBe("lake-house");
  });

  it("parses public rental detail output", () => {
    const payload = GetPublicRentalPropertyOutputSchema.parse({
      id: "prop-1",
      status: "PUBLISHED",
      slug: "lake-house",
      name: "Lake House",
      summary: null,
      descriptionHtml: null,
      maxGuests: 4,
      coverImageFileId: null,
      price: 210,
      currency: "USD",
      images: [],
      categories: [],
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    expect(payload.slug).toBe("lake-house");
  });

  it("parses rental category list output", () => {
    const payload = ListRentalCategoriesOutputSchema.parse([
      { id: "cat-1", name: "Cabin", slug: "cabin" },
    ]);

    expect(payload[0].slug).toBe("cabin");
  });
});
