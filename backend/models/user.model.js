const mongoose = require("mongoose");

const CCUserSchema = new mongoose.Schema({
  ccId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  registeredSolos: {
    type: [
      {
        eventId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        }, // UserThroughCCId
        userId: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        confirmed: {
          type: Boolean,
          default: false,
        },
        verified: {
          type: String,
          enum: ["PENDING", "VERIFIED", "REJECTED"],
          default: "PENDING",
        },
        sex: {
          type: String,
          enum: ["male", "female"],
        },
        weightCategory: {
          type: String,
          enum: ["lightWeight", "middleWeight", "heavyWeight"],
        },
      },
    ],
    default: [],
  },
  registeredTeams: {
    type: [
      {
        eventId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        }, // UserThroughCCId
        teamMembers: {
          type: [mongoose.Schema.Types.Mixed],
          required: true,
        }, // UserThroughCCId
        npaMembers: {
          type: [mongoose.Schema.Types.Mixed],
          default: [],
        },
        verified: {
          type: String,
          enum: ["PENDING", "VERIFIED", "REJECTED"],
          default: "PENDING",
        },
        confirmed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    default: [],
  },
  points: {
    type: Number,
    default: 0,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  verified: {
    type: String,
    enum: ["PENDING", "VERIFIED", "REJECTED"],
    default: "VERIFIED",
  },
});

const NCPUserSchema = new mongoose.Schema({
  ncpId: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  idProofARN: {
    type: String,
    required: true,
  },
  idProofURL: {
    type: {
      fileType: String,
      url: String,
      timeTillExpiry: Date,
    },
    default: {},
  },
  govtIdProofARN: {
    type: String,
    required: true,
  },
  govtIdProofURL: {
    type: {
      fileType: String,
      url: String,
      timeTillExpiry: Date,
    },
    default: {},
  },
  verified: {
    type: String,
    enum: ["PENDING", "VERIFIED", "REJECTED"],
    default: "PENDING",
  },
  otp: {
    type: String,
    default: "",
  },
  otpExpiration: {
    type: Date,
    default: null,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  locked: {
    type: Boolean,
    default: false,
  },
});

const UserThroughCCSchema = new mongoose.Schema({
  ccId: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  idProofARN: {
    type: String,
    default: "",
  },
  idProofURL: {
    type: {
      fileType: String,
      url: String,
      timeTillExpiry: Date,
    },
    default: {},
  },
  govtIdProofARN: {
    type: String,
    default: "",
  },
  govtIdProofURL: {
    type: {
      fileType: String,
      url: String,
      timeTillExpiry: Date,
    },
    default: {},
  },
  verified: {
    type: String,
    enum: ["PENDING", "VERIFIED", "REJECTED"],
    default: "PENDING",
  },
  locked: {
    type: Boolean,
    default: false,
  },
});

const OtseUserSchema = new mongoose.Schema({
  otseId: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
});

module.exports = {
  ccUser: mongoose.model("CCUser", CCUserSchema),
  ncpUser: mongoose.model("NCPUser", NCPUserSchema),
  userThroughCC: mongoose.model("UserThroughCC", UserThroughCCSchema),
  otseUser: mongoose.model("OtseUser", OtseUserSchema),
};
