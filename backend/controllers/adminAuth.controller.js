// Dependencies
const { argon2id, argon2Verify } = require("hash-wasm");
const jwt = require("jsonwebtoken");

// Local Imports
const Admin = require("../models/admin.model");

// Configs
// Hash Options
const hashOptions = {
  salt: Buffer.from("7d86f04bca684cd8e0ef6d2f16b6a242"),
  parallelism: 1,
  iterations: 256,
  memorySize: 512,
  hashLength: 56,
  outputType: "encoded",
};

const permissions = {
  SUPER_ADMIN: ["ADMIN", "HEAD", "MEMBER", "SUPER_ADMIN"],
  ADMIN: ["HEAD", "MEMBER"],
  HEAD: ["MEMBER"],
};

exports.hashOptions = hashOptions;
exports.permissions = permissions;

exports.login = async (req, res) => {
  try {
    // Required fields:
    //  adminId: String,
    //  password: String
    //
    const loginData = req.body;

    if (!loginData.adminId || !loginData.password) {
      return res
        .status(400)
        .json({ error: "adminId and password are required" });
    }

    // Check if the admin exists
    let admin = await Admin.findOne({ adminId: loginData.adminId });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Check if the password is correct
    const isValid = await argon2Verify({
      password: loginData.password,
      hash: admin.password,
    });

    if (!isValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        data: {
          _id: admin._id,
          type: admin.type,
        },
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 48,
      },
      process.env.ADMIN_JWT_SECRET
    );

    return res.status(200).json({
      message: "Admin logged in successfully",
      data: {
        adminId: admin.adminId,
        _id: admin._id,
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.protect = async (req, res, next) => {
  try {
    // Check if the login token is present and properly formatted
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required. Please provide a Bearer token",
      });
    }

    // Extract the token
    const token = authHeader.split(" ")[1];

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        error:
          err.name === "TokenExpiredError"
            ? "Token has expired"
            : "Invalid token",
      });
    }

    const currentAdminId = decoded.data._id;

    // Check if the admin exists
    const admin = await Admin.findById(currentAdminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Add admin details to request object
    req._id = admin._id;
    req.type = admin.type;

    next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.restrictTo = (...allowedTypes) => {
  try {
    const currentUserType = req.type;
    if (!allowedTypes.includes(currentUserType)) {
      return res.status(403).json({ error: "Unauthorized to access this" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
