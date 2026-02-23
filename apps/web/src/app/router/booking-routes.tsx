import React from "react";
import { Route } from "react-router-dom";
import { BookingsPage } from "../../modules/booking/screens/BookingsPage";
import { ResourcesPage } from "../../modules/booking/screens/ResourcesPage";
import { ServicesPage } from "../../modules/booking/screens/ServicesPage";

const ComingSoonPlaceholder = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center p-12 text-muted-foreground border rounded-md bg-white">
    {title} coming soon
  </div>
);

export const bookingRoutes = (
  <>
    <Route path="/booking/bookings" element={<BookingsPage />} />
    <Route path="/booking/bookings/new" element={<ComingSoonPlaceholder title="New Booking" />} />
    <Route
      path="/booking/bookings/:id"
      element={<ComingSoonPlaceholder title="Booking Details" />}
    />
    <Route path="/booking/resources" element={<ResourcesPage />} />
    <Route path="/booking/resources/new" element={<ComingSoonPlaceholder title="New Resource" />} />
    <Route
      path="/booking/resources/:id"
      element={<ComingSoonPlaceholder title="Resource Details" />}
    />
    <Route path="/booking/services" element={<ServicesPage />} />
    <Route
      path="/booking/services/new"
      element={<ComingSoonPlaceholder title="New Service Offering" />}
    />
    <Route
      path="/booking/services/:id"
      element={<ComingSoonPlaceholder title="Service Details" />}
    />
  </>
);
