import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DriveAccountsPage from "./pages/DriveAccountsPage";

function App() {
  const isAuthenticated = !!localStorage.getItem("accessToken");

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/accounts"
          element={
            isAuthenticated ? <DriveAccountsPage /> : <Navigate to="/login" />
          }
        />
        <Route path="/" element={<Navigate to="/accounts" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
