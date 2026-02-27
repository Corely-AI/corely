import type {
  GetAvailabilityInput,
  GetAvailabilityOutput,
  BookingDto,
  BookingOutput,
  CancelBookingInput,
  CreateBookingInput,
  CreateBookingOutput,
  CreateResourceInput,
  CreateResourceOutput,
  CreateServiceOfferingInput,
  CreateServiceOfferingOutput,
  ListBookingsInput,
  ListResourcesInput,
  ListServiceOfferingsInput,
  PageInfo,
  ResourceDto,
  RescheduleBookingInput,
  ServiceOfferingDto,
  UpsertAvailabilityRuleInput,
  UpsertAvailabilityRuleOutput,
  UpdateResourceInput,
  UpdateServiceOfferingInput,
} from "@corely/contracts";
import { apiClient } from "./api-client";
import { buildListQuery } from "./api-query-utils";

type BookingListOutput = {
  items: BookingDto[];
  pageInfo: PageInfo;
};

type ResourceListOutput = {
  items: ResourceDto[];
  pageInfo: PageInfo;
};

type ServiceListOutput = {
  items: ServiceOfferingDto[];
  pageInfo: PageInfo;
};

const withQuery = (basePath: string, params?: Record<string, unknown>) => {
  const query = buildListQuery(params);
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
};

class BookingApi {
  async listServices(params: ListServiceOfferingsInput = {}): Promise<ServiceListOutput> {
    return apiClient.get<ServiceListOutput>(withQuery("/booking/services", params), {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getService(id: string): Promise<ServiceOfferingDto> {
    const result = await apiClient.get<{ service: ServiceOfferingDto }>(`/booking/services/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.service;
  }

  async createService(input: CreateServiceOfferingInput): Promise<CreateServiceOfferingOutput> {
    return apiClient.post<CreateServiceOfferingOutput>("/booking/services", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateService(
    id: string,
    patch: UpdateServiceOfferingInput
  ): Promise<CreateServiceOfferingOutput> {
    return apiClient.patch<CreateServiceOfferingOutput>(`/booking/services/${id}`, patch, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async deleteService(id: string): Promise<void> {
    await apiClient.delete(`/booking/services/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listResources(params: ListResourcesInput = {}): Promise<ResourceListOutput> {
    return apiClient.get<ResourceListOutput>(withQuery("/booking/resources", params), {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getResource(id: string): Promise<ResourceDto> {
    const result = await apiClient.get<{ resource: ResourceDto }>(`/booking/resources/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.resource;
  }

  async createResource(input: CreateResourceInput): Promise<CreateResourceOutput> {
    return apiClient.post<CreateResourceOutput>("/booking/resources", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateResource(id: string, patch: UpdateResourceInput): Promise<CreateResourceOutput> {
    return apiClient.patch<CreateResourceOutput>(`/booking/resources/${id}`, patch, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async deleteResource(id: string): Promise<void> {
    await apiClient.delete(`/booking/resources/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getAvailability(input: GetAvailabilityInput): Promise<GetAvailabilityOutput> {
    return apiClient.get<GetAvailabilityOutput>(withQuery("/booking/availability", input), {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertAvailabilityRule(
    resourceId: string,
    input: UpsertAvailabilityRuleInput
  ): Promise<UpsertAvailabilityRuleOutput> {
    return apiClient.put<UpsertAvailabilityRuleOutput>(
      `/booking/availability/${resourceId}`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async listBookings(params: ListBookingsInput = {}): Promise<BookingListOutput> {
    return apiClient.get<BookingListOutput>(withQuery("/booking/bookings", params), {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getBooking(id: string): Promise<BookingDto> {
    const result = await apiClient.get<BookingOutput>(`/booking/bookings/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.booking;
  }

  async createBooking(input: CreateBookingInput): Promise<CreateBookingOutput> {
    return apiClient.post<CreateBookingOutput>("/booking/bookings", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async rescheduleBooking(id: string, input: RescheduleBookingInput): Promise<BookingOutput> {
    return apiClient.patch<BookingOutput>(`/booking/bookings/${id}/reschedule`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async cancelBooking(id: string, input: CancelBookingInput = {}): Promise<BookingOutput> {
    return apiClient.post<BookingOutput>(`/booking/bookings/${id}/cancel`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const bookingApi = new BookingApi();
