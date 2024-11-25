// Dependencies
const express = require("express");
const multer = require("multer");

// Local imports
const {
  getUser,
  getAllEvents,
  registerForSoloEvent,
  registerForTeamEvent,
} = require("../controllers/user.controller");

// Multer setup
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Getting all the events
router.get("/events/:userId", getAllEvents);

// Registering for a solo event
router.post(
  "/register/solo-event",
  upload.fields([
    { name: "idProof", maxCount: 1 },
    { name: "govtIdProof", maxCount: 1 },
  ]),
  registerForSoloEvent
);

// Registering for a team event
router.post(
  "/register/team-event",
  upload.fields([
    { name: "npaMembers", maxCount: 10 },
    { name: "teamMembers", maxCount: 10 },
    { name: "npaMembersGovtIdProof", maxCount: 10 },
    { name: "teamMembersGovtIdProof", maxCount: 10 },
  ]),
  registerForTeamEvent
);

// Getting user details
router.get("/:userId", getUser);

module.exports = router;
