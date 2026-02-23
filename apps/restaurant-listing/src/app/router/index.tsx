import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BerlinListingPage } from "@/modules/directory/pages/berlin-listing-page";
import { RestaurantDetailPage } from "@/modules/directory/pages/restaurant-detail-page";

export const Router = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/berlin" replace />} />
      <Route path="/berlin" element={<BerlinListingPage />} />
      <Route path="/berlin/restaurants/:slug" element={<RestaurantDetailPage />} />
      <Route path="*" element={<Navigate to="/berlin" replace />} />
    </Routes>
  </BrowserRouter>
);
