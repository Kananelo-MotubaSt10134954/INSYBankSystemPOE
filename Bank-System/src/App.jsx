import RegisterPage from "./RegisterPage";
import { useNavigate } from "react-router-dom";
function App() {
  const navigate = useNavigate();

  return (
    <>
      <div className="App">
        <h1>Bank System</h1>
        <button id="register-button" onClick={() => navigate("/register")}>
          Register
        </button>
        <button id="LogInStaff-button" onClick={() => navigate("/staff-login")}>
          Staff Login
        </button>
        {/* <RegisterPage /> */}
      </div>
    </>
  );
}

export default App;
