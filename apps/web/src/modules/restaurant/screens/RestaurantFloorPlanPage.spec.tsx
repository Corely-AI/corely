import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RestaurantFloorPlanPage from "./RestaurantFloorPlanPage";

vi.mock("../hooks/use-restaurant-admin", () => ({
  useRestaurantFloorPlan: () => ({
    isLoading: false,
    data: {
      rooms: [
        {
          id: "room_1",
          tenantId: "tenant_1",
          workspaceId: "workspace_1",
          name: "Main hall",
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tables: [
            {
              id: "table_1",
              tenantId: "tenant_1",
              workspaceId: "workspace_1",
              diningRoomId: "room_1",
              name: "T1",
              capacity: 4,
              posX: null,
              posY: null,
              shape: "SQUARE",
              availabilityStatus: "AVAILABLE",
              activeSessionId: null,
              activeOrderId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      ],
    },
  }),
  useUpsertDiningRoom: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpsertRestaurantTable: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("RestaurantFloorPlanPage", () => {
  it("renders dining rooms and tables", () => {
    render(
      <MemoryRouter>
        <RestaurantFloorPlanPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Restaurant floor plan")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Main hall" })).toBeInTheDocument();
    expect(screen.getByText("T1")).toBeInTheDocument();
  });
});
