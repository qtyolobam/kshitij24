// Dependencies
const express = require("express");
const multer = require("multer");

// Multer config
const upload = multer({ storage: multer.memoryStorage() });

// Local imports
// Controllers
const {
  createAdmin,
  resetPassword,
  createUser,
  updateUser,
  deleteUser,
  getUser,
  getAllUsers,
  verifyUser,
  pollingUserData,
  confirmUser,
  replaceConfirmedUser,
  substituteEntriesForSolo,
  substituteEntriesForTeam,
  createOtseForSolo,
  createOtseForTeam,
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  getAllEvents,
  awardPoints,
  // getUsersForAwardingPoints,
  getUsersForConfirmation,
  createBet,
  getAllBets,
  getBetByUserId,
} = require("../controllers/admin.controller");

const router = express.Router();

// User Routes
// Create User
router.post(
  "/create-user/:type",
  upload.fields([
    { name: "idProof", maxCount: 1 },
    { name: "govtIdProof", maxCount: 1 },
  ]),
  createUser
); // done

// Update User
router.patch("/update-user", updateUser); // done

// Delete User
router.delete("/delete-user/:_id", deleteUser); // done

// Get User
router.get("/get-user/:userId", getUser);

// Get All Users
router.get("/get-all-users", getAllUsers); // done

// Verify User
router.patch("/verify-user", verifyUser);

// Polling user data for verification
router.get("/polling-user-data", pollingUserData);

// Confirm user for an event
router.patch("/confirm-user", confirmUser); // done

// Replace user with another user for a confirmed event
router.patch("/replace-user", replaceConfirmedUser);

// Substitute dummy entries with real entries for a confirmed event
router.patch(
  "/substitute-entries-for-solo",
  upload.fields([
    { name: "idProof", maxCount: 1 },
    { name: "govtIdProof", maxCount: 1 },
  ]),
  substituteEntriesForSolo
);

// Substitute dummy entries with real entries for a confirmed team event
router.patch(
  "/substitute-entries-for-team",
  upload.fields([
    { name: "teamMembers", maxCount: 10 },
    { name: "npaMembers", maxCount: 10 },
    { name: "npaMembersGovtIdProof", maxCount: 10 },
    { name: "teamMembersGovtIdProof", maxCount: 10 },
  ]),
  substituteEntriesForTeam
);

// Create otse user for solo events
router.post("/otse-solo", createOtseForSolo);

// Create otse user for team events
router.post("/otse-team", createOtseForTeam);

// Event Routes
// Create Event
router.post("/create-event/:type", createEvent);

// Update Event
router.patch("/update-event/:eventId", updateEvent);

// Delete Event
router.delete("/delete-event/:eventId", deleteEvent);

// Get Event
router.get("/get-event/:_id", getEvent);

// Get All Events
router.get("/get-all-events", getAllEvents);

// Award points
router.patch("/award-points/:id/:eventId", awardPoints);

// Wont be used
// // Get users for awarding points
// router.get("/get-users-for-awarding-points", getUsersForAwardingPoints);

// Get users for confirmation
router.get("/get-users-for-confirmation", getUsersForConfirmation);

// Bet Routes
// Create Bet
router.post("/create-bet", createBet);

// Get all bets
router.get("/get-all-bets", getAllBets);

// Get bet by userId
router.get("/get-bet/:userId", getBetByUserId);

// Admin Routes
// Create Admin
router.post("/create-admin", createAdmin);

// Reset Password
router.post("/reset-password", resetPassword);

module.exports = router;
