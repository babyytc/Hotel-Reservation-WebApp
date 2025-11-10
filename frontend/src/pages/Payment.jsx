import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../ui/Payment.css";

export default function Payment() {
  const { state } = useLocation();
  const booking = state?.booking;
  const booking_id = state?.booking_id ?? booking?.booking_id;
  const navigate = useNavigate();

  const [method, setMethod] = useState("");
  const [processing, setProcessing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.role === "ADMIN") setIsAdmin(true);
  }, []);

  const goBack = () => navigate("/BookingConfirmation");

  const handlePay = () => {
    if (!method) {
      alert("Please select a payment method.");
      return;
    }

    if (method === "QR") {
      setProcessing(true);
      setTimeout(() => {
        setProcessing(false);
        alert("Payment successful via QR!");
        goBack();
      }, 1800);
      return;
    }

    if (method === "Credit" || method === "Debit") {
      setProcessing(true);
      setTimeout(() => {
        setProcessing(false);
        alert("Card payment successful!");
        goBack();
      }, 1800);
      return;
    }

    if (method === "Cash") {
      if (isAdmin) {
        alert("Admin marked payment as received.");
        goBack();
      } else {
        alert("Only admin can mark cash as paid.");
      }
    }
  };

  return (
    <div className="payment-page">
      <Navbar />
      <main className="payment-container">
        <div className="payment-card">
          <h1>Payment for Booking #{booking_id ?? "-"}</h1>
          <p className="lead">Select your preferred payment method below:</p>

          <div className="payment-options">
            {[
              { label: "Credit Card", value: "Credit" },
              { label: "Debit Card", value: "Debit" },
              { label: "Cash", value: "Cash" },
              { label: "QR Code", value: "QR" },
            ].map((option) => (
              <label key={option.value} className={`option ${method === option.value ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="method"
                  value={option.value}
                  checked={method === option.value}
                  onChange={(e) => setMethod(e.target.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          {method === "QR" && (
            <div className="qr-section">
              <p>Scan the QR code to complete your payment:</p>
              <img src="/images/demo/demo-qr.png" alt="QR Code" className="qr-image" />
              {processing && <p className="loading-text">Processing...</p>}
            </div>
          )}

          {(method === "Credit" || method === "Debit") && (
            <div className="card-section">
              <h3>Enter Card Details</h3>
              <input type="text" placeholder="Cardholder Name" />
              <input type="text" placeholder="Card Number" />
              <div className="card-row">
                <input type="text" placeholder="MM" />
                <input type="text" placeholder="YY" />
                <input type="text" placeholder="CVV" />
              </div>
            </div>
          )}

          {method === "Cash" && (
            <div className="cash-section">
              <p>
                Please pay in cash at the reception desk.{" "}
                {!isAdmin && <span className="note">(Only admin can mark as paid)</span>}
              </p>
              {isAdmin && (
                <button className="admin-btn" onClick={handlePay} disabled={processing}>
                  Mark as Received
                </button>
              )}
            </div>
          )}

          <div className="payment-actions">
            <button className="pay-btn" onClick={handlePay} disabled={processing}>
              {processing ? "Processing..." : "Pay Now"}
            </button>
            <button className="cancel-btn" onClick={goBack} disabled={processing}>
              Cancel
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
