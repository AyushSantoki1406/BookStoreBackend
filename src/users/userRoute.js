const express = require("express");
const User = require("./user.model");
const router = express.Router();

// Save any user (email + optional role)
router.post("/register", async (req, res) => {
  const { email, role = "user" } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json({ message: "User already exists" });
    }

    const newUser = new User({ email, role });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("User registration failed", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
