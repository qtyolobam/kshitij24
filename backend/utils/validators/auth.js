const z = require("zod");

// Login Schema
exports.loginSchema = z.object({
  id: z.string().min(1, { message: "ID is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// NCP Register Schema
exports.ncpRegisterSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email" }),
  phoneNumber: z
    .string()
    .refine(
      (value) => /^[6-9]\d{9}$/.test(value),
      "Should be a valid phone number"
    ),
  password: z.string(),
  idProof: z.object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z
      .string()
      .refine(
        (value) => value.startsWith("image/") || value === "application/pdf",
        "File must be an image or PDF"
      ),
    buffer: z.instanceof(Buffer),
    size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
  }),
  govtIdProof: z.object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z
      .string()
      .refine(
        (value) => value.startsWith("image/") || value === "application/pdf",
        "File must be an image or PDF"
      ),
    buffer: z.instanceof(Buffer),
    size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
  }),
});

// CC Register Schema
exports.ccRegisterSchema = z.object({
  ccId: z.string().min(1, { message: "CC ID is required" }),
  email: z.string().email({ message: "Invalid email" }),
  password: z.string(),
});

// Reset Password Schema
exports.resetPasswordSchema = z.object({
  id: z.string().min(1, { message: "ID is required" }),
  otp: z.string().min(1, { message: "OTP is required" }),
  password: z.string(),
});
