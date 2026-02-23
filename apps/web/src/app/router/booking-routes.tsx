import React from "react";
import { Route } from "react-router-dom";
import { BookingsPage } from "../../modules/booking/screens/BookingsPage";
import BookingDetailPage from "../../modules/booking/screens/BookingDetailPage";
import BookingEditorPage from "../../modules/booking/screens/BookingEditorPage";
import { ResourcesPage } from "../../modules/booking/screens/ResourcesPage";
import ResourceDetailPage from "../../modules/booking/screens/ResourceDetailPage";
import ResourceEditorPage from "../../modules/booking/screens/ResourceEditorPage";
import ServiceDetailPage from "../../modules/booking/screens/ServiceDetailPage";
import ServiceEditorPage from "../../modules/booking/screens/ServiceEditorPage";
import { ServicesPage } from "../../modules/booking/screens/ServicesPage";

export const bookingRoutes = (
  <>
    <Route path="/booking/bookings" element={<BookingsPage />} />
    <Route path="/booking/bookings/new" element={<BookingEditorPage />} />
    <Route path="/booking/bookings/:id" element={<BookingDetailPage />} />
    <Route path="/booking/bookings/:id/edit" element={<BookingEditorPage />} />

    <Route path="/booking/resources" element={<ResourcesPage />} />
    <Route path="/booking/resources/new" element={<ResourceEditorPage />} />
    <Route path="/booking/resources/:id" element={<ResourceDetailPage />} />
    <Route path="/booking/resources/:id/edit" element={<ResourceEditorPage />} />

    <Route path="/booking/services" element={<ServicesPage />} />
    <Route path="/booking/services/new" element={<ServiceEditorPage />} />
    <Route path="/booking/services/:id" element={<ServiceDetailPage />} />
    <Route path="/booking/services/:id/edit" element={<ServiceEditorPage />} />
  </>
);
