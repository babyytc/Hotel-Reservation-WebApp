import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../ui/ConfirmBooking.css";

const ensureScript = (id, src) =>
  new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Document is not available"));
      return;
    }

    const existing = document.getElementById(id);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.dataset.loaded = "false";
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", reject);
    document.head.appendChild(script);
  });

const loadHtml2Canvas = async () => {
  if (typeof window !== "undefined" && typeof window.html2canvas === "function") {
    return window.html2canvas;
  }
  await ensureScript(
    "html2canvas-lib",
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
  );
  if (typeof window.html2canvas !== "function") {
    throw new Error("html2canvas failed to load");
  }
  return window.html2canvas;
};

const loadJsPDF = async () => {
  if (typeof window !== "undefined" && window.jspdf?.jsPDF) {
    return window.jspdf.jsPDF;
  }
  await ensureScript(
    "jspdf-lib",
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js"
  );
  if (!window.jspdf?.jsPDF) {
    throw new Error("jsPDF failed to load");
  }
  return window.jspdf.jsPDF;
};

export default function ConfirmBooking() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const cardRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const autoPDFOnceRef = useRef(false);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const booking = state?.booking || {
    booking_id: state?.booking_id ?? 123456,
    member_id: user?.member_id ?? null,
    phone_entered: user?.phone ?? "0812345678",
    checkin_date: "2025-12-24",
    checkout_date: "2025-12-26",
    guest_count: 2,
    subtotal_amount: 4000,
    discount_amount: 0,
    total_amount: 4000,
    created_at: new Date().toISOString(),
  };

  const room = state?.room || {
    name: booking.room_type_name || "Deluxe",
    room_number: booking.room_number || "101",
    capacity: 2,
  };

  const payment = state?.payment || {
    payment_id: 5555,
    booking_id: booking.booking_id,
    amount: booking.total_amount,
    method: booking.payment_method || "QR",
    provider_txn_ref: booking.provider_txn_ref || "TXN-2025-1120-ABCDEF",
    payment_status: booking.payment_status || booking.booking_status || "Success",
    paid_at: booking.paid_at || new Date().toISOString(),
  };

  const fmt = (n) =>
    Number(n ?? 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "-";

  const nights = useMemo(() => {
    const ci = new Date(booking.checkin_date);
    const co = new Date(booking.checkout_date);
    const diff = co - ci;
    if (Number.isNaN(diff) || diff <= 0) return 1;
    return Math.max(1, diff / (1000 * 60 * 60 * 24));
  }, [booking.checkin_date, booking.checkout_date]);

  const fullName =
    booking.member_name ||
    user?.fullName ||
    (user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : "Guest");

  const saveAsImage = async () => {
    setSaveError("");
    setSaving(true);
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `booking_${booking.booking_id}.png`;
      link.click();
    } catch (err) {
      console.error(err);
      setSaveError("Cannot save image. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveAsPDF = async () => {
    setSaveError("");
    setSaving(true);
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 120));

      const el = cardRef.current;
      if (!el) throw new Error("Card element not found");

      const html2canvas = await loadHtml2Canvas();
      const jsPDF = await loadJsPDF();

      const safeScale = Math.min(2, Math.max(1, window.devicePixelRatio || 1.5));
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        scale: safeScale,
        removeContainer: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      if (imgH <= pageH) {
        pdf.addImage(imgData, "JPEG", 0, 0, imgW, imgH);
      } else {
        let position = 0;
        let heightLeft = imgH;

        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;

        while (heightLeft > 0) {
          pdf.addPage();
          position = heightLeft - imgH;
          pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
          heightLeft -= pageH;
        }
      }

      pdf.save(`booking_${booking.booking_id}.pdf`);
    } catch (err) {
      console.error(err);
      setSaveError("Failed to save PDF. Trying Print-to-PDF instead.");
      window.print();
    } finally {
      setSaving(false);
    }
  };

  const handleSavePDF = async () => {
    const ua = navigator.userAgent;
    const vendor = navigator.vendor || "";
    const isChrome = /Chrome/.test(ua) && /Google Inc/.test(vendor);

    try {
      if (isChrome) {
        await saveAsPDF();
      } else {
        window.print();
      }
    } catch (err) {
      console.error(err);
      window.print();
    }
  };

  useEffect(() => {
    if (autoPDFOnceRef.current) return;
    autoPDFOnceRef.current = true;

    const timer = setTimeout(() => {
      saveAsPDF().catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="confirm-page">
      <Navbar />

      <main className="confirm-container">
        <div className="confirm-card" ref={cardRef}>
          <div className="confirm-header">
            <div className="badge-success">Payment Success</div>
            <h1>Booking Confirmed</h1>
            <p className="muted">Thank you, {fullName}. Your reservation is confirmed.</p>
          </div>

          <div className="grid-two">
            <section className="panel">
              <h2 className="gold">Stay Details</h2>
              <div className="rows">
                <div className="row"><span>Booking ID</span><strong>{booking.booking_id}</strong></div>
                <div className="row"><span>Name</span><strong>{fullName}</strong></div>
                <div className="row"><span>Phone</span><strong>{booking.phone_entered}</strong></div>
                <div className="row"><span>Check-in</span><strong>{fmtDate(booking.checkin_date)}</strong></div>
                <div className="row"><span>Check-out</span><strong>{fmtDate(booking.checkout_date)}</strong></div>
                <div className="row"><span>Nights</span><strong>{nights}</strong></div>
                <div className="row"><span>Guests</span><strong>{booking.guest_count}</strong></div>
              </div>
            </section>

            <section className="panel">
              <h2 className="gold">Room & Payment</h2>
              <div className="rows">
                <div className="row"><span>Room</span><strong>{room.name} — No.{room.room_number}</strong></div>
                <div className="row"><span>Capacity</span><strong>{room.capacity} guests</strong></div>
                <div className="row"><span>Subtotal</span><strong>{fmt(booking.subtotal_amount)}</strong></div>
                <div className="row"><span>Discount</span><strong>-{fmt(booking.discount_amount)}</strong></div>
                <div className="row total"><span>Total</span><strong>{fmt(booking.total_amount)}</strong></div>
                <div className="row"><span>Method</span><strong>{payment.method}</strong></div>
                <div className="row"><span>Reference</span><strong>{payment.provider_txn_ref}</strong></div>
                <div className="row">
                  <span>Status</span>
                  <strong className={payment.payment_status?.toLowerCase() === "success" || payment.payment_status?.toLowerCase() === "confirmed" ? "ok" : "warn"}>
                    {payment.payment_status}
                  </strong>
                </div>
              </div>
            </section>
          </div>

          <div className="footer-note">
            Confirmation recorded on {fmtDate(booking.created_at)}.
          </div>
        </div>

        {saveError && <div className="error">{saveError}</div>}

        <div className="actions">
          <button className="btn btn-gold" onClick={() => navigate("/")}>
            Back to Home
          </button>
          <button className="btn" onClick={handleSavePDF} disabled={saving}>
            {saving ? "Saving…" : "Save as PDF"}
          </button>
          <button className="btn btn-dark" onClick={saveAsImage} disabled={saving}>
            {saving ? "Saving…" : "Save as PNG"}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
