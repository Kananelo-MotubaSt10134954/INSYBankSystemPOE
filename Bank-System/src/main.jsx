import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RegisterPage from "./RegisterPage.jsx";
import CustomerLoginPage from "./CustomerLoginPage.jsx";
import PaymentPage from "./PaymentPage.jsx";
import StaffLoginPage from "./StaffLoginPage.jsx";
import StaffPortal from "./StaffPortal.jsx";

console.log("Rendering main.jsx");
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/staff-login" element={<StaffLoginPage />} />
        <Route path="/staff-portal" element={<StaffPortal />} />
        <Route path="/register" element={<RegisterPage />} />
        {<Route path="/login" element={<CustomerLoginPage />} />}
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
