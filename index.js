const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://book-app-frontend-tau.vercel.app",
    ],
    credentials: true,
  })
);

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Routes
const bookRoutes = require("./src/books/book.route");
const orderRoutes = require("./src/orders/order.route");
const userRoutes = require("./src/users/user.route");
const adminRoutes = require("./src/stats/admin.stats");
const userRoutes2 = require("./src/users/userRoute");

app.use("/api/books", bookRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes2);

app.post("/api/create-order", async (req, res) => {
  const { amount, currency } = req.body;
  try {
    // Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid or missing amount" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(parseFloat(amount)), // Ensure integer (paise)
      currency: currency || "INR",
      receipt: `receipt_${Date.now()}`,
    });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({
      error: "Failed to create order",
      details: error.message || "Unknown error",
    });
  }
});

app.post("/api/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  try {
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature === razorpay_signature) {
      res.json({ status: "success" });
    } else {
      res.status(400).json({ error: "Invalid signature" });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

// Default route
app.get("/", (req, res) => {
  res.send("Book Store Server is running!");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server after MongoDB connection
async function main() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("MongoDB connected successfully!");
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

main();
