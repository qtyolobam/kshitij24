const z = require("zod");

// Bet Schema
exports.betSchema = z.object({
  ccId: z.string().min(1, { message: "CCID is required" }),
  eventName: z.string().min(1, { message: "Event name is required" }),
  amount: z.number().min(1, { message: "Amount is required" }),
  category: z.string().optional(),
});

// Update CC User Schema
exports.updateCCUserSchema = z.object({
  email: z.string().email({ message: "Invalid email" }).optional(),
  password: z.string().optional(),
  verified: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional(),
  points: z.number().optional(),
});

// Update NCP User Schema
exports.updateNCPUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email({ message: "Invalid email" }).optional(),
  password: z.string().optional(),
  phoneNumber: z.string().optional(),
  verified: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional(),
});
