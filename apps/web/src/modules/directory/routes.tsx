import RestaurantsListScreen from "./screens/restaurants-list.screen";
import RestaurantDetailScreen from "./screens/restaurant-detail.screen";
import RestaurantFormScreen from "./screens/restaurant-form.screen";

export const directoryRoutes = [
  {
    path: "/directory/restaurants",
    element: <RestaurantsListScreen />,
  },
  {
    path: "/directory/restaurants/new",
    element: <RestaurantFormScreen />,
  },
  {
    path: "/directory/restaurants/:id",
    element: <RestaurantDetailScreen />,
  },
  {
    path: "/directory/restaurants/:id/edit",
    element: <RestaurantFormScreen />,
  },
];
