import "./RegisterPage.css";
import login from "./login-logo.png";
import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function PaymentPage() {
  const [formData, setFormData] = useState({
    amount: "",
    currency: "ZAR",
    payeeAccount: "",
    swiftCode: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Check if user is logged in
  useEffect(() => {
    axios
      .get("/api/health", { withCredentials: true })
      .catch(() => navigate("/login"));
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const response = await axios.post("/api/bankpayments", formData, {
        withCredentials: true,
      });
      setMessage(response.data.message);
      setFormData({
        amount: "",
        currency: "ZAR",
        payeeAccount: "",
        swiftCode: "",
      });
    } catch (err) {
      setError(err.response?.data?.error || "Payment submission failed");
    }
  };

  return (
    <div className="split-register">
      <div className="left-register">
        <img
          style={{ width: "600px", height: "490px" }}
          src={login}
          alt="Payment"
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
            Make International Payment
          </h3>
          {message && <p style={{ color: "green" }}>{message}</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
          <div className="text-field">
            <input
              type="text"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
            />
            <span className="span"></span>
            <label>Amount</label>
          </div>
          <div className="text-field">
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              required
            >
              <option value="ZAR">ZAR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>

            <span className="span"></span>
          </div>
          <div className="text-field">
            <input
              type="text"
              name="payeeAccount"
              value={formData.payeeAccount}
              onChange={handleChange}
              required
            />
            <span className="span"></span>
            <label>Payee Account</label>
          </div>
          <div className="text-field">
            <input
              type="text"
              name="swiftCode"
              value={formData.swiftCode}
              onChange={handleChange}
              required
            />
            <span className="span"></span>
            <label>SWIFT Code</label>
          </div>
          <input id="register-button" type="submit" value="Pay Now" />
        </form>
      </div>
    </div>
  );
}

export default PaymentPage;
