import React from "react";
import {
  WebsiteServicesGridBlockSchema,
  WebsitePriceMenuBlockSchema,
  WebsiteGalleryMasonryBlockSchema,
  WebsiteSignatureSetsBlockSchema,
  WebsiteTeamBlockSchema,
  WebsiteBookingStepsBlockSchema,
  WebsiteLocationHoursBlockSchema,
} from "@corely/contracts";
import {
  NailStudioServicesGrid,
  NailStudioPriceMenu,
  NailStudioGalleryMasonry,
  NailStudioSignatureSets,
  NailStudioTeam,
  NailStudioBookingSteps,
  NailStudioLocationHours,
} from "../templates/landing-nailstudio-v1.sections";
import {
  createDefinition,
  toComponentProps,
  toSectionCommonFields,
  type BlockDefinition,
} from "./block-registry.shared";

type NailStudioOnlyBlockType =
  | "servicesGrid"
  | "priceMenu"
  | "galleryMasonry"
  | "signatureSets"
  | "team"
  | "bookingSteps"
  | "locationHours";

export const nailStudioBlockRegistry: Record<NailStudioOnlyBlockType, BlockDefinition> = {
  servicesGrid: createDefinition({
    type: "servicesGrid",
    schema: WebsiteServicesGridBlockSchema,
    label: "Services Grid",
    description: "Grid of salon services",
    renderer: ({ block, context }) => (
      <NailStudioServicesGrid
        {...toComponentProps<React.ComponentProps<typeof NailStudioServicesGrid>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "items", label: "Services (JSON)", type: "json" },
      ...toSectionCommonFields(),
    ],
  }),
  priceMenu: createDefinition({
    type: "priceMenu",
    schema: WebsitePriceMenuBlockSchema,
    label: "Price Menu",
    description: "Service categories and pricing",
    renderer: ({ block, context }) => (
      <NailStudioPriceMenu
        {...toComponentProps<React.ComponentProps<typeof NailStudioPriceMenu>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "categories", label: "Categories (JSON)", type: "json" },
      ...toSectionCommonFields(),
    ],
  }),
  galleryMasonry: createDefinition({
    type: "galleryMasonry",
    schema: WebsiteGalleryMasonryBlockSchema,
    label: "Gallery Masonry",
    description: "Masonry image gallery",
    renderer: ({ block, context }) => (
      <NailStudioGalleryMasonry
        {...toComponentProps<React.ComponentProps<typeof NailStudioGalleryMasonry>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "imageFileIds", label: "Gallery Images", type: "fileIdList" },
      ...toSectionCommonFields(),
    ],
  }),
  signatureSets: createDefinition({
    type: "signatureSets",
    schema: WebsiteSignatureSetsBlockSchema,
    label: "Signature Sets",
    description: "Highlight premium signature sets",
    renderer: ({ block, context }) => (
      <NailStudioSignatureSets
        {...toComponentProps<React.ComponentProps<typeof NailStudioSignatureSets>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "sets", label: "Sets (JSON)", type: "json" },
      { key: "ctaLabel", label: "CTA Label", type: "text" },
      { key: "ctaHref", label: "CTA Link", type: "text" },
      ...toSectionCommonFields(),
    ],
  }),
  team: createDefinition({
    type: "team",
    schema: WebsiteTeamBlockSchema,
    label: "Team",
    description: "Artists and specialties",
    renderer: ({ block, context }) => (
      <NailStudioTeam
        {...toComponentProps<React.ComponentProps<typeof NailStudioTeam>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "members", label: "Members (JSON)", type: "json" },
      ...toSectionCommonFields(),
    ],
  }),
  bookingSteps: createDefinition({
    type: "bookingSteps",
    schema: WebsiteBookingStepsBlockSchema,
    label: "Booking Steps",
    description: "How customers book appointments",
    renderer: ({ block, context }) => (
      <NailStudioBookingSteps
        {...toComponentProps<React.ComponentProps<typeof NailStudioBookingSteps>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "steps", label: "Steps (JSON)", type: "json" },
      { key: "ctaLabel", label: "CTA Label", type: "text" },
      { key: "ctaHref", label: "CTA Link", type: "text" },
      ...toSectionCommonFields(),
    ],
  }),
  locationHours: createDefinition({
    type: "locationHours",
    schema: WebsiteLocationHoursBlockSchema,
    label: "Location & Hours",
    description: "Address, hours, map and policies",
    renderer: ({ block, context }) => (
      <NailStudioLocationHours
        {...toComponentProps<React.ComponentProps<typeof NailStudioLocationHours>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "address", label: "Address", type: "textarea" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "mapEmbedUrl", label: "Map URL", type: "text" },
      { key: "hours", label: "Hours (JSON)", type: "json" },
      { key: "policies", label: "Policies (JSON)", type: "json" },
      ...toSectionCommonFields(),
    ],
  }),
};
