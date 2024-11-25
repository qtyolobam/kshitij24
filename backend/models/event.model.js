const mongoose = require("mongoose");

const eventStatus = ["UPCOMING", "ONGOING", "COMPLETED"];
const eventType = ["USP", "FLAGSHIP", "POPULAR", "OTHERS"];
const eventPhaseType = [
  "PRE_ELIMS_FINALS",
  "ELIMS_FINALS",
  "KNOCKOUTS",
  "DIRECT_FINALS",
];

const soloEventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: eventType,
    required: true,
  },
  slots: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  userRegistrations: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  confirmedRegistrations: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  date: {
    type: Date,
    required: true,
  },
  points: {
    type: {
      firstPodium: {
        type: Number,
        required: true,
      },
      secondPodium: {
        type: Number,
        required: true,
      },
      thirdPodium: {
        type: Number,
      },
      registration: {
        type: Number,
        required: true,
      },
      qualification: {
        type: Number,
        required: true,
      },
      npr: {
        type: Number,
        required: true,
      },
      npq: {
        type: Number,
        required: true,
      },
    },
    required: true,
  },
  winners: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: String,
    enum: eventStatus,
    default: "UPCOMING",
  },
  eventPhaseType: {
    type: String,
    enum: eventPhaseType,
    default: "KNOCKOUTS",
  },
  deleted: {
    type: Boolean,
    default: false,
  },
});

const teamEventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: eventType,
    required: true,
  },
  slots: {
    type: Number,
    required: true,
  },
  teamSize: {
    type: {
      min: {
        type: Number,
        required: true,
      },
      max: {
        type: Number,
        required: true,
      },
    },
    required: true,
  },
  npaAmount: {
    type: Number,
    required: true,
  },
  userRegistrations: {
    type: [
      {
        teamName: {
          type: String,
          required: true,
        },
        registerer: {
          type: String,
          required: true,
        },
        teamMembers: {
          type: [mongoose.Schema.Types.Mixed],
          required: true,
        },
        npaMembers: {
          type: [mongoose.Schema.Types.Mixed],
          default: [],
        },
      },
    ],
    default: [],
  },
  confirmedRegistrations: {
    type: [
      {
        teamName: {
          type: String,
          required: true,
        },
        registerer: {
          type: String,
          required: true,
        },
        teamMembers: {
          type: [mongoose.Schema.Types.Mixed],
          required: true,
        },
        npaMembers: {
          type: [mongoose.Schema.Types.Mixed],
          default: [],
        },
      },
    ],
    default: [],
  },
  date: {
    type: Date,
    required: true,
  },
  points: {
    type: {
      firstPodium: {
        type: Number,
        required: true,
      },
      secondPodium: {
        type: Number,
        required: true,
      },
      thirdPodium: {
        type: Number,
      },
      registration: {
        type: Number,
        required: true,
      },
      qualification: {
        type: Number,
        required: true,
      },
      npr: {
        type: Number,
        required: true,
      },
      npq: {
        type: Number,
        required: true,
      },
    },
    required: true,
  },
  winners: {
    type: {
      first: {
        type: String,
        required: true,
      },
      second: {
        type: String,
        required: true,
      },
      third: {
        type: String,
      },
    },
    default: null,
  },
  status: {
    type: String,
    enum: eventStatus,
    default: "UPCOMING",
  },
  eventPhaseType: {
    type: String,
    enum: eventPhaseType,
    default: "KNOCKOUTS",
  },
  deleted: {
    type: Boolean,
    default: false,
  },
});

module.exports = {
  soloEvent: mongoose.model("soloEvent", soloEventSchema),
  teamEvent: mongoose.model("teamEvent", teamEventSchema),
};
