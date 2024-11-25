// Dependencies
const { ccUser, ncpUser } = require("../models/user.model");
const { argon2id, argon2Verify } = require("hash-wasm");
const jwt = require("jsonwebtoken");

// Local Imports
const {
  loginSchema,
  ncpRegisterSchema,
  resetPasswordSchema,
} = require("../utils/validators/auth");
const { s3Upload } = require("../utils/apis/s3");
const { sendEmailWithRetry } = require("../utils/apis/emailerConfig");
const {
  checkPasswordStrength,
} = require("../utils/validators/passwordStrengthChecker");
const { getUserDetailsShared } = require("./shared.controller");
const convertPdfToImage = require("../utils/apis/pdfToImage");
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

exports.login = async (req, res) => {
  try {
    // Required fields:
    // loginData = {
    //     id: String,
    //     password: String
    // }
    const loginData = req.body;

    if (!loginSchema.safeParse(loginData).success) {
      return res.status(400).json({ error: "Invalid login data" });
    }

    // Check if the user exists in ccUser or ncpUser
    let user = await ccUser.findOne({ ccId: loginData.id });
    if (!user) {
      user = await ncpUser.findOne({ ncpId: loginData.id });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
    }

    // Check if the user is deleted
    if (user.deleted) {
      return res.status(404).json({ error: "User account is deleted" });
    }

    // Check if the user is rejected
    if (user.verified === "REJECTED") {
      return res.status(401).json({ error: "User is rejected by the admin" });
    }

    // Check if the password is correct
    const isValid = await argon2Verify({
      password: loginData.password,
      hash: user.password,
    });

    if (!isValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        data: {
          userId: loginData.id,
        },
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 48, // 2 days
      },
      process.env.JWT_SECRET
    );

    return res.status(200).json({
      message: "User logged in successfully",
      data: {
        _id: user._id,
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    // Required fields: registerData = {
    //     firstName: String,
    //     lastName: String,
    //     email: String,
    //     phoneNumber: String,
    //     password: String,
    //     idProof: File (can be image or pdf)
    //     govtIdProof: File (can be image or pdf)
    // }
    const registerData = req.body;

    // Check if idProof and govtIdProof is uploaded
    if (
      !req.files.idProof ||
      !req.files.idProof.length > 0 ||
      !req.files.govtIdProof ||
      !req.files.govtIdProof.length > 0
    ) {
      return res
        .status(400)
        .json({ error: "ID proof and Govt IdProof are required" });
    }

    // Add the ID proof and govtIdProof to the register data before validation
    registerData.idProof = req.files.idProof[0];
    registerData.govtIdProof = req.files.govtIdProof[0];

    if (!ncpRegisterSchema.safeParse(registerData).success) {
      return res.status(400).json({ error: "Invalid register data" });
    }

    // Check if the password is strong
    const passwordErrors = checkPasswordStrength(registerData.password);

    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: passwordErrors,
      });
    }

    // Check if the user already exists
    const user = await ncpUser.findOne({
      $or: [
        { email: registerData.email },
        { phoneNumber: registerData.phoneNumber },
      ],
    });
    if (user) {
      return res.status(400).json({
        error: "User with same email or phone number already exists",
      });
    }

    // Hash the password
    const hashedPassword = await argon2id({
      ...hashOptions,
      password: registerData.password,
    });

    // Convert PDFs to images if necessary
    if (registerData.idProof.mimetype === "application/pdf") {
      registerData.idProof = await convertPdfToImage(registerData.idProof);
    }

    if (registerData.govtIdProof.mimetype === "application/pdf") {
      registerData.govtIdProof = await convertPdfToImage(
        registerData.govtIdProof
      );
    }

    // Upload the ID proof and govtIdProof (now guaranteed to be images)
    const idProofARN = await s3Upload(registerData.idProof);
    const idProofType = registerData.idProof.mimetype;
    const govtIdProofARN = await s3Upload(registerData.govtIdProof);
    const govtIdProofType = registerData.govtIdProof.mimetype;

    console.log(idProofType, govtIdProofType);
    // Generate a unique NCP ID
    let newNcpId;
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * (999 - 100 + 1)) + 100;
      newNcpId = "NCP" + randomNum;
      const existingUser = await ncpUser.findOne({ ncpId: newNcpId });
      if (!existingUser) {
        isUnique = true;
      }
    }

    // Create the user
    const newUser = new ncpUser({
      ncpId: newNcpId,
      idProofARN,
      govtIdProofARN,
      idProofURL: {
        fileType: idProofType.toString(),
        url: null,
        timeTillExpiry: null,
      },
      govtIdProofURL: {
        fileType: govtIdProofType.toString(),
        url: null,
        timeTillExpiry: null,
      },
      ...registerData,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        data: {
          userId: newUser._id,
        },
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 48, // 2 days
      },
      process.env.JWT_SECRET
    );

    // Finally save the user
    await newUser.save();

    // Remove unnecessary fields

    let formattedUser = await getUserDetailsShared(newUser._id);

    console.log(formattedUser);
    return res.status(200).json({
      message: "User registered successfully",
      data: {
        _id: newUser._id,
        token,
        newUser: formattedUser,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Only NCPs can reset their password , For CCs, contact the admin
exports.forgotPassword = async (req, res) => {
  try {
    // Required fields:
    // forgotPasswordData = {
    //     id: String,
    //     password: String
    // }
    const forgotPasswordData = req.body;

    if (!loginSchema.safeParse(forgotPasswordData).success) {
      return res.status(400).json({ error: "Invalid forgot password data" });
    }

    // Check if the user exists
    const user = await ncpUser.findOne({ ncpId: forgotPasswordData.id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user is deleted
    if (user.deleted) {
      return res.status(404).json({ error: "User account is deleted" });
    }

    // Check if the user is rejected
    if (user.verified === "REJECTED") {
      return res.status(401).json({ error: "User is rejected by the admin" });
    }

    // Check if the password is strong
    const passwordErrors = checkPasswordStrength(forgotPasswordData.password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: passwordErrors,
      });
    }

    // Send otp to the user's registered email
    // Create the otp
    const otp = Math.floor(Math.random() * 9000) + 1000;
    const otpExpiration = Date.now() + 1000 * 60 * 10; // 10 minutes from now

    // Create the mail options
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: "OTP for resetting password",
      text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
    };

    // Send the email
    await sendEmailWithRetry(mailOptions);

    // Update the user with the otp and otp expiration
    await ncpUser.findByIdAndUpdate(user._id, {
      otp,
      otpExpiration,
    });

    return res.status(200).json({
      message: "OTP sent successfully",
      data: {
        id: user.ncpId,
        password: forgotPasswordData.password,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    // Required fields:
    // resetPasswordData = {
    //     id: String,
    //     otp: String,
    //     password: String
    // }
    const resetPasswordData = req.body;

    if (!resetPasswordSchema.safeParse(resetPasswordData).success) {
      console.log(resetPasswordSchema.safeParse(resetPasswordData).error);
      return res.status(400).json({ error: "Invalid reset password data" });
    }

    // Check if the user exists
    const user = await ncpUser.findOne({ ncpId: resetPasswordData.id });

    // Check if the otp is correct
    if (user.otp !== resetPasswordData.otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Check if the otp has expired
    if (user.otpExpiration < Date.now()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    // Hash the password
    const hashedPassword = await argon2id({
      ...hashOptions,
      password: resetPasswordData.password,
    });

    // Update the user with the new password
    await ncpUser.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      otp: "",
      otpExpiration: null,
    });

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
