// Dependencies
const z = require("zod");

exports.createEventSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.enum(["USP", "FLAGSHIP", "POPULAR", "OTHERS"]),
  slots: z.any(),
  points: z.object({
    firstPodium: z.number(),
    secondPodium: z.number(),
    thirdPodium: z.number().optional(),
    registration: z.number(),
    qualification: z.number(),
    npr: z.number(),
    npq: z.number(),
  }),
  eventPhaseType: z.enum([
    "PRE_ELIMS_FINALS",
    "ELIMS_FINALS",
    "KNOCKOUTS",
    "DIRECT_FINALS",
  ]),
  date: z.string(),
  teamSize: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional(),
  npaAmount: z.number().optional(),
});

exports.awardPointsSchema = z.object({
  userId: z.string(),
  eventId: z.string(),
  points: z
    .enum([
      "firstPodium",
      "secondPodium",
      "thirdPodium",
      "qualification",
      "npr",
      "npq",
      "arbitraryPoints",
    ])
    .optional(),
});

exports.updateEventSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["USP", "FLAGSHIP", "POPULAR", "OTHERS"]).optional(),
  slots: z.any().optional(),
  points: z
    .object({
      firstPodium: z.number(),
      secondPodium: z.number(),
      thirdPodium: z.number().optional(),
      registration: z.number(),
      qualification: z.number(),
      npr: z.number(),
      npq: z.number(),
    })
    .optional(),
  eventPhaseType: z
    .enum(["PRE_ELIMS_FINALS", "ELIMS_FINALS", "KNOCKOUTS", "DIRECT_FINALS"])
    .optional(),
  date: z.string().optional(),
  teamSize: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional(),
  npaAmount: z.number().optional(),
});
