import "./RegisterPage.css";
import login from "./login-logo.png";
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function RegisterPage() {
  console.log("Rendering RegisterPage.jsx");
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    idNumber: "",
    accountNumber: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate(); // Define navigate

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await axios.post("/api/auth/register", formData, {
        withCredentials: true, // Required for session cookies
      });
      setMessage(response.data.message);
      setFormData({
        username: "",
        fullName: "",
        idNumber: "",
        accountNumber: "",
        password: "",
      });
      setTimeout(() => navigate("/login"), 1000); // Redirect to login page
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="split-register">
      <div className="left-register">
        <img
          style={{ width: "600px", height: "490px" }}
          src={login}
          alt="Student Login"
        />
      </div>
      <div className="right-register">
        <form className="register-box" onSubmit={handleSubmit}>
          <h3
            style={{
              fontFamily:
                "'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif",
              fontSize: "30px",
              color: "black",
            }}
          >
            Register
          </h3>
          {message && <p style={{ color: "green" }}>{message}</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
          <div className="text-field">
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            <span className="span"></span>
            <label>Username</label>
          </div>
          <div className="text-field">
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <span className="span"></span>
            <label>Full Name</label>
          </div>
          <div className="text-field">
            <input
              type="text"
              name="idNumber"
              value={formData.idNumber}
              onChange={handleChange}
              required
            />
            <span className="span"></span>
            <label>ID Number</label>
          </div>
          <div className="text-field">
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              required
            />
            <span className="span"></span>
            <label>Account Number</label>
          </div>
          <div className="text-field">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <span className="span"></span>
            <label>Password</label>
          </div>
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "center" }}
          >
            <input id="register-button" type="submit" value="REGISTER" />
            <input
              id="register-button"
              type="submit"
              value="LOGIN"
              onClick={() => navigate("/login")}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
