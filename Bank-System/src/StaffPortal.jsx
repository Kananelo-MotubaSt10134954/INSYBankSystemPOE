import "./RegisterPage.css";
import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function StaffPortal() {
  const [payments, setPayments] = useState([]);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("/api/bankpayments", { withCredentials: true })
      .then((response) => setPayments(response.data))
      .catch(() => navigate("/staff-login"));
  }, [navigate]);

  const handleVerify = async (id) => {
    try {
      const response = await axios.patch(
        `/api/bankpayments/${id}/verify`,
        {},
        {
          withCredentials: true,
        }
      );
      setMessage(response.data.message);
      setPayments((prev) =>
        prev.map((p) => (p._id === id ? { ...p, status: "verified" } : p))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed");
    }
  };

  const handleSubmitToSwift = async () => {
    try {
      const response = await axios.post(
        "/api/bankpayments/submit-to-swift",
        { ids: selected },
        { withCredentials: true }
      );
      setMessage(response.data.message);
      setSelected([]);
      setPayments((prev) =>
        prev.map((p) =>
          selected.includes(p._id) ? { ...p, status: "submitted" } : p
        )
      );
    } catch (err) {
      setError(err.response?.data?.error || "Submission failed");
    }
  };

  const handleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <h3>International Payments Portal</h3>
      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Select</th>
            <th>Customer ID</th>
            <th>Amount</th>
            <th>Currency</th>
            <th>Payee Account</th>
            <th>SWIFT Code</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment._id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(payment._id)}
                  onChange={() => handleSelect(payment._id)}
                  disabled={payment.status !== "verified"}
                />
              </td>
              <td>{payment.customerId}</td>
              <td>{payment.amount}</td>
              <td>{payment.currency}</td>
              <td>{payment.payeeAccount}</td>
              <td>{payment.swiftCode}</td>
              <td>{payment.status}</td>
              <td>
                {payment.status === "pending" && (
                  <button onClick={() => handleVerify(payment._id)}>
                    Verify
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={handleSubmitToSwift}
        disabled={selected.length === 0}
        style={{ marginTop: "20px" }}
      >
        Submit to SWIFT
      </button>
    </div>
  );
}

export default StaffPortal;
