// Dependencies
const express = require("express");
const multer = require("multer");

// Multer Config
const upload = multer({ storage: multer.memoryStorage() });

// Local imports
const {
  login,
  register,
  forgotPassword,
  resetPassword,
} = require("../controllers/userAuth.controller");

const router = express.Router();

// Login
router.post("/login", login);

// Register
router.post(
  "/register",
  upload.fields([
    { name: "idProof", maxCount: 1 },
    { name: "govtIdProof", maxCount: 1 },
  ]),
  register
);

// Forgot Password
router.post("/forgot-password", forgotPassword);

// Reset Password
router.post("/reset-password", resetPassword);

module.exports = router;
