import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import RegisterPage from "../pages/RegisterPage";
import CheckPhonePage from "../pages/CheckPhonePage";
import CheckPasswordPage from "../pages/CheckPasswordPage";
import Home from "../pages/Home";
import MessagePage from "../components/MessagePage";
import { AuthLayouts } from "../layout";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPasswordPage from "../pages/ResetPassword";
import Login from "../pages/Login";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "login",
        element: (
          <AuthLayouts>
            <Login />
          </AuthLayouts>
        ),
      },
      {
        path: "register",
        element: (
          <AuthLayouts>
            <RegisterPage />
          </AuthLayouts>
        ),
      },
      {
        path: "phone",
        element: (
          <AuthLayouts>
            <CheckPhonePage />
          </AuthLayouts>
        ),
      },
      {
        path: "password",
        element: (
          <AuthLayouts>
            <CheckPasswordPage />
          </AuthLayouts>
        ),
      },
      {
        path: "forgot-password",
        element: (
          <AuthLayouts>
            <ForgotPassword />
          </AuthLayouts>
        ),
      },
      {
        path: "reset-password",
        element: (
          <AuthLayouts>
            <ResetPasswordPage />
          </AuthLayouts>
        ),
      },
      {
        path: "",
        element: <Home />,
        children: [{ path: ":userId", element: <MessagePage /> }],
      },
    ],
  },
]);

export default router;
