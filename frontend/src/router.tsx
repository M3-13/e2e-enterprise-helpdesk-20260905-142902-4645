import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import TicketListPage from "./pages/TicketListPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "tickets", element: <TicketListPage /> },
      { path: "tickets/:id", element: <TicketDetailPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
]);
