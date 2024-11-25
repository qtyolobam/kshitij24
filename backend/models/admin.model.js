const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["SUPER_ADMIN", "ADMIN", "HEAD", "MEMBER"],
    default: "ADMIN",
  },
  password: {
    type: String,
    required: true,
  },
});

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
