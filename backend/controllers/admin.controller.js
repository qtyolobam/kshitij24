// Dependencies
const { argon2id } = require("hash-wasm");
const mongoose = require("mongoose");

// Local imports

// Models
const Admin = require("../models/admin.model");
const {
  ccUser,
  ncpUser,
  userThroughCC,
  otseUser,
} = require("../models/user.model");
const { permissions, hashOptions } = require("./adminAuth.controller");
const { soloEvent, teamEvent } = require("../models/event.model");
const {
  checkPasswordStrength,
} = require("../utils/validators/passwordStrengthChecker");
const { s3Upload, s3SignedUrl } = require("../utils/apis/s3");
const { register } = require("../controllers/userAuth.controller");
const { ccRegisterSchema } = require("../utils/validators/auth");

const {
  updateCCUserSchema,
  updateNCPUserSchema,
} = require("../utils/validators/user");
const betModel = require("../models/bet.model");
const { betSchema } = require("../utils/validators/user");
const {
  createEventSchema,
  updateEventSchema,
} = require("../utils/validators/event");
const {
  getUserDetailsShared,
  confirmUserShared,
} = require("../controllers/shared.controller");
const { sendEmailWithRetry } = require("../utils/apis/emailerConfig");

// Users
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Create User
exports.createUser = async (req, res) => {
  try {
    // Required fields:
    // IF CC
    //   ccId: String,
    //   email: String,
    //   password: String
    // IF NCP
    //   firstName: String,
    //   lastName: String,
    //   email: String,
    //   password: String,
    //   phoneNumber: String,
    //   idProof : File
    const { type } = req.params;
    const userData = req.body;

    if (type === "CC") {
      // Validating the user data
      if (!ccRegisterSchema.safeParse(userData).success) {
        return res.status(400).json({ error: "Invalid CC user data" });
      }

      // Check if the ccId is already taken
      const existingUser = await ccUser.findOne({
        $or: [{ ccId: userData.ccId }, { email: userData.email }],
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ error: "CC ID or email is already taken" });
      }

      // Hash the password
      const hashedPassword = await argon2id({
        password: userData.password,
        ...hashOptions,
      });

      // Create the user
      const newUser = new ccUser({
        ...userData,
        password: hashedPassword,
      });

      // Save the user
      await newUser.save();

      // Remove unnecessary fields

      let formattedUser = await getUserDetailsShared(newUser._id);
      // Return the created user
      return res.status(200).json({
        message: "User created successfully",
        data: {
          newUser: formattedUser,
        },
      });
    } else if (type === "NCP") {
      // Register the user
      await register(req, res);
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Update User
exports.updateUser = async (req, res) => {
  try {
    // Required fields:
    // _id: String, => To be updated user's ID
    // userData: {
    //  with all the fields that are to be updated
    // }
    // If CC
    // can update:
    //   email: String,
    //   password: String,
    //   verified: String
    //   points: Number
    // If NCP
    // can update:
    //   firstName: String,
    //   lastName: String,
    //   email: String,
    //   password: String,
    //   phoneNumber: String,
    //   verified: String

    const { _id, userData } = req.body;

    // Check if the _id is valid
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Check if the user is CC or NCP
    let isNCP = false;
    let user = await ccUser.findById(_id);
    if (!user) {
      isNCP = true;
      user = await ncpUser.findById(_id);
    }

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user is deleted
    if (user.deleted) {
      return res.status(401).json({ error: "User account is deleted" });
    }

    // Update the user
    if (!isNCP) {
      // Validating the userData
      if (!updateCCUserSchema.safeParse(userData).success) {
        return res.status(400).json({ error: "Invalid CC user data" });
      }

      if (userData.password) {
        // Hash the password
        const hashedPassword = await argon2id({
          password: userData.password,
          ...hashOptions,
        });

        userData.password = hashedPassword;
      }

      await ccUser.findByIdAndUpdate(_id, userData);
    } else {
      // Validating the userData
      if (!updateNCPUserSchema.safeParse(userData).success) {
        return res.status(400).json({ error: "Invalid NCP user data" });
      }

      if (userData.password) {
        const passwordErrors = checkPasswordStrength(userData.password);
        if (passwordErrors.length > 0) {
          return res.status(400).json({
            error: passwordErrors,
          });
        }

        // Hash the password
        const hashedPassword = await argon2id({
          password: userData.password,
          ...hashOptions,
        });

        if (hashedPassword === user.password) {
          return res
            .status(400)
            .json({ error: "New password is same as old password" });
        }

        userData.password = hashedPassword;
      }

      // Update the user
      await ncpUser.findByIdAndUpdate(_id, userData);
    }

    // Return the updated user
    return res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Delete User
exports.deleteUser = async (req, res) => {
  try {
    // Required fields:
    // _id: String, => To be deleted user's ID

    const { _id } = req.params;

    // Check if the _id is valid
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Find the user
    let isNCP = false;
    let user = await ccUser.findById(_id);
    if (!user) {
      isNCP = true;
      user = await ncpUser.findById(_id);
    }

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete the user
    await user.updateOne({ deleted: true });

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Get User
exports.getUser = async (req, res) => {
  try {
    // Required Fields : userId
    const { userId } = req.params;

    // Checking if the userId is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: "Invalid userId",
      });
    }

    // Checking if the user is a CC or NCP
    let isNCP = false;
    let user = await ccUser.findById(userId).select("-password");
    if (!user) {
      user = await ncpUser
        .findById(userId)
        .select(
          "-password -idProofARN -idProofURL -govtIdProofARN -govtIdProofURL -otp -otpExpiration"
        );
      isNCP = true;
    }
    // User not found
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    let data = {};
    // Formatting the user details
    if (!isNCP) {
      data = {
        ccId: user.ccId,
        email: user.email,
        registeredSolos: [],
        registeredTeams: [],
        points: user.points,
        bets: [],
        verified: user.verified,
      };

      // Fetching the bets
      let bets = await betModel.find({ userId: userId });
      let modifiedBets = [];
      for (let i = 0; i < bets.length; i++) {
        let event =
          (await soloEvent
            .findOne({
              $and: [{ _id: bets[i].eventId }, { deleted: { $ne: true } }],
            })
            .select("name")) ||
          (await teamEvent
            .find({
              $and: [{ _id: bets[i].eventId }, { deleted: { $ne: true } }],
            })
            .select("name"));

        modifiedBets.push({
          eventName: event.name,
          eventType: bets[i].eventType,
          amount: bets[i].amount,
        });
      }
      data.bets = modifiedBets;

      // Fetching the registered solos
      if (user.registeredSolos.length > 0) {
        data.registeredSolos = [];
        for (let i = 0; i < user.registeredSolos.length; i++) {
          const solo = user.registeredSolos[i];
          let event = await soloEvent
            .findOne({
              $and: [{ _id: solo.eventId }, { deleted: { $ne: true } }],
            })
            .select("name");

          // If entry is dummyRef, then it is a dummy entry
          if (solo.userId.toString().includes("dummy")) {
            if (event.name === "Mr. and Ms. Kshitij") {
              data.registeredSolos.push({
                eventName: event.name,
                participant: "dummy",
                confirmed: solo.confirmed,
                verified: false,
                sex: solo.sex,
              });
            } else if (event.name === "MMA") {
              data.registeredSolos.push({
                eventName: event.name,
                participant: "dummy",
                confirmed: solo.confirmed,
                verified: false,
                weightCategory: solo.weightCategory,
              });
            } else {
              data.registeredSolos.push({
                eventName: event.name,
                participant: "dummy",
                confirmed: solo.confirmed,
                verified: false,
              });
            }
            continue;
          }

          const participant = await userThroughCC
            .findById(solo.userId)
            .select("firstName lastName verified");

          if (event.name === "Mr. and Ms. Kshitij") {
            data.registeredSolos.push({
              eventName: event.name,
              participant: `${participant.firstName} ${participant.lastName}`,
              confirmed: solo.confirmed,
              verified: participant.verified,
              sex: solo.sex,
            });
          } else if (event.name === "MMA") {
            data.registeredSolos.push({
              eventName: event.name,
              participant: `${participant.firstName} ${participant.lastName}`,
              confirmed: solo.confirmed,
              verified: participant.verified,
              weightCategory: solo.weightCategory,
            });
          } else {
            data.registeredSolos.push({
              eventName: event.name,
              participant: `${participant.firstName} ${participant.lastName}`,
              confirmed: solo.confirmed,
              verified: participant.verified,
            });
          }
        }
      }

      // Fetching the registered teams
      if (user.registeredTeams.length > 0) {
        data.registeredTeams = [];
        for (let j = 0; j < user.registeredTeams.length; j++) {
          const team = user.registeredTeams[j];
          const event = await teamEvent
            .findOne({
              $and: [{ _id: team.eventId }, { deleted: { $ne: true } }],
            })
            .select("name");

          // Fetching the team members names
          let wholeTeamVerified = true;
          let teamMembers = [];
          for (let i = 0; i < team.teamMembers.length; i++) {
            // If entry is empty, then it is a dummy entry
            if (team.teamMembers[i].toString().includes("dummy")) {
              teamMembers.push("dummy");
              wholeTeamVerified = false;
              break;
            }
            const user = await userThroughCC
              .findById(team.teamMembers[i])
              .select("firstName lastName verified");
            teamMembers.push(`${user.firstName} ${user.lastName}`);
            if (user.verified !== "VERIFIED") {
              wholeTeamVerified = false;
            }
          }

          // Fetching the NPA members names
          let wholeTeamNPAVerified = true;
          let npaMembers = [];
          for (let i = 0; i < team.npaMembers.length; i++) {
            // If entry is empty, then it is a dummy entry
            if (team.npaMembers[i].toString().includes("dummy")) {
              npaMembers.push("dummy");
              wholeTeamNPAVerified = false;
              break;
            }
            const user = await userThroughCC
              .findById(team.npaMembers[i])
              .select("firstName lastName verified");
            npaMembers.push(`${user.firstName} ${user.lastName}`);
            if (user.verified !== "VERIFIED") {
              wholeTeamNPAVerified = false;
            }
          }

          data.registeredTeams.push({
            eventName: event.name,
            teamMembers: teamMembers,
            npaMembers: npaMembers,
            confirmed: team.confirmed,
            verified: wholeTeamVerified && wholeTeamNPAVerified,
          });
        }
      }
    } else {
      data = {
        ncpId: user.ncpId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        verified: user.verified,
        registeredSolos: [],
        registeredTeams: [],
      };

      // Fetching solo events user is registered for
      let soloEvents = await soloEvent.find({
        userRegistrations: { $in: [userId] },
      });

      // Checking if the user is registered for Mr. and Ms. Kshitij
      let MrAndMsKshitijEvent = await soloEvent.findOne({
        $or: [
          { "userRegistrations.0.male": userId },
          { "userRegistrations.0.female": userId },
        ],
      });

      // Checking if the user is registered for MMA
      let MMAEvent = await soloEvent.findOne({
        $or: [
          { "userRegistrations.0.lightWeight": userId },
          { "userRegistrations.0.middleWeight": userId },
          { "userRegistrations.0.heavyWeight": userId },
        ],
      });

      if (MrAndMsKshitijEvent) {
        soloEvents = [...soloEvents, MrAndMsKshitijEvent];
      }
      if (MMAEvent) {
        soloEvents = [...soloEvents, MMAEvent];
      }

      // Fetching team events user is registered for
      let teamEvents = await teamEvent.find({
        $or: [
          { "userRegistrations.registerer": userId },
          { "userRegistrations.teamMembers": { $in: [userId] } },
          { "userRegistrations.npaMembers": { $in: [userId] } },
        ],
      });

      teamEvents = teamEvents.map((event) => {
        event.userRegistrations = event.userRegistrations.filter(
          (registration) => {
            return (
              registration.registerer === userId ||
              registration.teamMembers.includes(userId) ||
              registration.npaMembers.includes(userId)
            );
          }
        );
        return event;
      });

      // Checking if the team user is registered for is verified
      let teamVerified = [];
      let wholeTeamVerified = true;
      for (let i = 0; i < teamEvents.length; i++) {
        const event = teamEvents[i];
        // Checking if the team members are verified
        for (let j = 0; j < event.userRegistrations.length; j++) {
          for (
            let k = 0;
            k < event.userRegistrations[j].teamMembers.length;
            k++
          ) {
            if (event.userRegistrations[j].teamMembers[k] === "") {
              wholeTeamVerified = false;
              break;
            } else {
              const user = await ncpUser.findById(
                event.userRegistrations[j].teamMembers[k]
              );
              if (user.verified !== "VERIFIED") {
                wholeTeamVerified = false;
                break;
              }
            }
          }
        }

        let wholeTeamNPAVerified = true;
        // Checking if the NPA members are verified
        for (let j = 0; j < event.userRegistrations.length; j++) {
          for (
            let k = 0;
            k < event.userRegistrations[j].npaMembers.length;
            k++
          ) {
            if (event.userRegistrations[j].npaMembers[k] === "") {
              wholeTeamNPAVerified = false;
              break;
            } else {
              const user = await ncpUser.findById(
                event.userRegistrations[j].npaMembers[k]
              );
              if (user.verified !== "VERIFIED") {
                wholeTeamNPAVerified = false;
                break;
              }
            }
          }
        }

        if (wholeTeamVerified && wholeTeamNPAVerified) {
          teamVerified.push(true);
        } else {
          teamVerified.push(false);
        }
      }

      // Formatting the solo events
      for (let i = 0; i < soloEvents.length; i++) {
        const event = soloEvents[i];
        if (event.name === "Mr. and Ms. Kshitij") {
          if (
            event.confirmedRegistrations.length > 0 &&
            (event.confirmedRegistrations[0].male.includes(userId) ||
              event.confirmedRegistrations[0].female.includes(userId))
          ) {
            data.registeredSolos.push({
              eventName: event.name,
              confirmed: true,
              sex: event.confirmedRegistrations[0].male.includes(userId)
                ? "male"
                : "female",
            });
          } else {
            data.registeredSolos.push({
              eventName: event.name,
              confirmed: false,
              sex: event.userRegistrations[0].male.includes(userId)
                ? "male"
                : "female",
            });
          }
        } else if (event.name === "MMA") {
          if (
            event.confirmedRegistrations.length > 0 &&
            (event.confirmedRegistrations[0].lightWeight.includes(userId) ||
              event.confirmedRegistrations[0].middleWeight.includes(userId) ||
              event.confirmedRegistrations[0].heavyWeight.includes(userId))
          ) {
            data.registeredSolos.push({
              eventName: event.name,
              confirmed: true,
              weightCategory:
                event.confirmedRegistrations[0].lightWeight.includes(userId)
                  ? "lightWeight"
                  : event.confirmedRegistrations[0].middleWeight.includes(
                      userId
                    )
                  ? "middleWeight"
                  : "heavyWeight",
            });
          } else {
            data.registeredSolos.push({
              eventName: event.name,
              confirmed: false,
              weightCategory: event.userRegistrations[0].lightWeight.includes(
                userId
              )
                ? "lightWeight"
                : event.userRegistrations[0].middleWeight.includes(userId)
                ? "middleWeight"
                : "heavyWeight",
            });
          }
        } else {
          if (
            event.confirmedRegistrations.length > 0 &&
            event.confirmedRegistrations.includes(userId)
          ) {
            data.registeredSolos.push({
              eventName: event.name,
              confirmed: true,
            });
          } else {
            data.registeredSolos.push({
              eventName: event.name,
              confirmed: false,
            });
          }
        }
      }

      // Formatting the team events
      for (let i = 0; i < teamEvents.length; i++) {
        const event = teamEvents[i];
        if (
          event.confirmedRegistrations.length > 0 &&
          (event.confirmedRegistrations.registerer === userId ||
            event.confirmedRegistrations.teamMembers.includes(userId) ||
            event.confirmedRegistrations.npaMembers.includes(userId))
        ) {
          data.registeredTeams.push({
            eventName: event.name,
            confirmed: true,
            verified: teamVerified[i],
          });
        } else {
          data.registeredTeams.push({
            eventName: event.name,
            confirmed: false,
            verified: teamVerified[i],
          });
        }
      }
    }

    // Sending the user details
    res.status(200).json({
      message: "User details fetched successfully",
      data: data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Get All Users
exports.getAllUsers = async (req, res) => {
  try {
    // Required fields: None

    // Fetching all users
    let ccUsers = await ccUser.find({}).select("-password");
    let ncpUsers = await ncpUser
      .find({})
      .select(
        "-password -idProofARN -idProofURL -govtIdProofARN -govtIdProofURL -otp -otpExpiration"
      );
    let otseUsers = await otseUser.find({});

    // Formatting the CC users
    for (let i = 0; i < ccUsers.length; i++) {
      const user = await getUserDetailsShared(ccUsers[i]._id);
      ccUsers[i] = user;
    }

    // Formatting the NCP users
    for (let i = 0; i < ncpUsers.length; i++) {
      const user = await getUserDetailsShared(ncpUsers[i]._id);
      ncpUsers[i] = user;
    }

    // Formatting the OTSE users
    for (let i = 0; i < otseUsers.length; i++) {
      const user = otseUsers[i];
      const data = {
        type: "OTSE",
        _id: user._id,
        otseId: user.otseId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        registeredSolos: [],
        registeredTeams: [],
      };

      // Fetching solo events user is registered for
      let soloEvents = await soloEvent.find({
        $or: [
          { confirmedRegistrations: { $in: [user._id.toString()] } }, // For regular events
          { "confirmedRegistrations.0.male": user._id.toString() }, // For Mr. and Ms. Kshitij
          { "confirmedRegistrations.0.female": user._id.toString() }, // For Mr. and Ms. Kshitij
          { "confirmedRegistrations.0.lightWeight": user._id.toString() }, // For MMA
          { "confirmedRegistrations.0.middleWeight": user._id.toString() }, // For MMA
          { "confirmedRegistrations.0.heavyWeight": user._id.toString() }, // For MMA
        ],
      });

      let teamEvents = await teamEvent.find({
        $or: [
          { "confirmedRegistrations.registerer": user._id.toString() },
          {
            "confirmedRegistrations.teamMembers": {
              $in: [user._id.toString()],
            },
          },
          {
            "confirmedRegistrations.npaMembers": { $in: [user._id.toString()] },
          },
        ],
      });

      teamEvents = teamEvents.map((event) => {
        event.confirmedRegistrations = event.confirmedRegistrations.filter(
          (registration) => {
            return (
              registration.registerer.toString() === user._id.toString() ||
              registration.teamMembers.includes(user._id.toString()) ||
              registration.npaMembers.includes(user._id.toString())
            );
          }
        );
        return event;
      });

      // Formatting the solo events
      for (let i = 0; i < soloEvents.length; i++) {
        const event = soloEvents[i];
        if (event.name === "Mr. and Ms. Kshitij") {
          data.registeredSolos.push({
            eventName: event.name,
            confirmed: true,
            sex: event.confirmedRegistrations[0].male.includes(
              user._id.toString()
            )
              ? "male"
              : "female",
          });
        } else if (event.name === "MMA") {
          data.registeredSolos.push({
            eventName: event.name,
            confirmed: true,
            weightCategory:
              event.confirmedRegistrations[0].lightWeight.includes(
                user._id.toString()
              )
                ? "lightWeight"
                : event.confirmedRegistrations[0].middleWeight.includes(
                    user._id.toString()
                  )
                ? "middleWeight"
                : "heavyWeight",
          });
        } else {
          data.registeredSolos.push({
            eventName: event.name,
            confirmed: true,
          });
        }
      }

      // Formatting the team events
      for (let i = 0; i < teamEvents.length; i++) {
        const event = teamEvents[i];
        let teamMembers = [];
        for (let j = 0; j < event.confirmedRegistrations.length; j++) {
          for (
            let k = 0;
            k < event.confirmedRegistrations[j].teamMembers.length;
            k++
          ) {
            const user = await otseUser.findById(
              event.confirmedRegistrations[j].teamMembers[k]
            );
            if (user) {
              teamMembers.push(user.otseId);
            }
          }
        }
        const registerer = await otseUser.findById(
          event.confirmedRegistrations[0].registerer
        );
        data.registeredTeams.push({
          eventName: event.name,
          confirmed: true,
          verified: "VERIFIED",
          teamMembers,
          npaMembers: [],
          registerer: registerer.otseId,
        });
      }
      otseUsers[i] = data;
    }

    return res.status(200).json({
      message: "Users fetched successfully",
      data: [...ccUsers, ...ncpUsers, ...otseUsers],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Verify User (VERIFIED/REJECTED)
exports.verifyUser = async (req, res) => {
  try {
    // Required fields:
    // {
    //   _id: String,
    //   verified: "VERIFIED"/"REJECTED"
    // }

    const { _id, verified } = req.body;
    console.log(_id, verified);

    // Check if the _id is valid
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Check if the verified is valid
    if (verified !== "VERIFIED" && verified !== "REJECTED") {
      return res.status(400).json({ error: "Invalid verification status" });
    }

    // Find the user
    let user = await ncpUser.findById(_id);
    if (!user) {
      user = await userThroughCC.findById(_id);
    }

    // User doesnt exist
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.locked) {
      return res
        .status(400)
        .json({ error: "User is already being verified by other admin" });
    }

    // Check if the user is already verified
    if (user.verified === "VERIFIED" || user.verified === "REJECTED") {
      return res.status(400).json({ error: "User already checked" });
    }

    // Lock the user
    await user.updateOne({ locked: true });

    // Update the user
    await user.updateOne({ verified });

    // Unlock the user
    await user.updateOne({ locked: false });

    return res.status(200).json({
      message: "User verified successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Polling user data for verification
exports.pollingUserData = async (req, res) => {
  try {
    // Required fields: None

    // Fetching all users
    let ncpUsers = await ncpUser
      .find({
        $and: [{ verified: "PENDING" }, { locked: false }, { deleted: false }],
      })
      .select("-password");
    let userThroughCCUsers = await userThroughCC
      .find({
        $and: [{ verified: "PENDING" }, { locked: false }],
      })
      .select("-password");

    const ncpUserList = [];
    // Formatting the ncp users
    for (let i = 0; i < ncpUsers.length; i++) {
      const ncpUser = ncpUsers[i];
      const ncpData = {
        _id: ncpUser._id,
        ncpId: ncpUser.ncpId,
        firstName: ncpUser.firstName,
        lastName: ncpUser.lastName,
        verified: ncpUser.verified,
        email: ncpUser.email,
        phoneNumber: ncpUser.phoneNumber,
        idProofURL: ncpUser.idProofURL,
        govtIdProofURL: ncpUser.govtIdProofURL,
      };
      if (
        !ncpUser.idProofURL.url ||
        ncpUser.idProofURL.timeTillExpiry < new Date()
      ) {
        ncpUser.idProofURL.url = await s3SignedUrl(ncpUser.idProofARN);
        ncpUser.idProofURL.timeTillExpiry = new Date(
          new Date().getTime() + 6 * 24 * 60 * 60 * 1000
        );
        await ncpUser.save();
        ncpData.idProofURL.url = ncpUser.idProofURL.url;
        ncpData.idProofURL.timeTillExpiry = ncpUser.idProofURL.timeTillExpiry;
      }
      if (
        !ncpUser.govtIdProofURL.url ||
        ncpUser.govtIdProofURL.timeTillExpiry < new Date()
      ) {
        ncpUser.govtIdProofURL.url = await s3SignedUrl(ncpUser.govtIdProofARN);
        ncpUser.govtIdProofURL.timeTillExpiry = new Date(
          new Date().getTime() + 6 * 24 * 60 * 60 * 1000
        );
        await ncpUser.save();
        ncpData.govtIdProofURL.url = ncpUser.govtIdProofURL.url;
        ncpData.govtIdProofURL.timeTillExpiry =
          ncpUser.govtIdProofURL.timeTillExpiry;
      }
      ncpUserList.push(ncpData);
    }

    const userThroughCCList = [];
    // Formatting the userThroughCC users
    for (let i = 0; i < userThroughCCUsers.length; i++) {
      const userThroughCCUser = userThroughCCUsers[i];
      const userThroughCCData = {
        _id: userThroughCCUser._id,
        firstName: userThroughCCUser.firstName,
        lastName: userThroughCCUser.lastName,
        ccId: "",
        verified: userThroughCCUser.verified,
        email: userThroughCCUser.email,
        phoneNumber: userThroughCCUser.phoneNumber,
        idProofURL: userThroughCCUser.idProofURL,
        govtIdProofURL: userThroughCCUser.govtIdProofURL,
      };
      const tempCCID = await ccUser.findOne({ _id: userThroughCCUser.ccId });
      userThroughCCData.ccId = tempCCID.ccId;
      if (
        !userThroughCCUser.idProofURL.url ||
        userThroughCCUser.idProofURL.timeTillExpiry < new Date()
      ) {
        console.log("generating id proof url");
        userThroughCCUser.idProofURL.url = await s3SignedUrl(
          userThroughCCUser.idProofARN
        );
        userThroughCCUser.idProofURL.timeTillExpiry = new Date(
          new Date().getTime() + 6 * 24 * 60 * 60 * 1000
        );
        await userThroughCCUser.save();
        userThroughCCData.idProofURL.url = userThroughCCUser.idProofURL.url;
        userThroughCCData.idProofURL.timeTillExpiry =
          userThroughCCUser.idProofURL.timeTillExpiry;
      }
      if (
        !userThroughCCUser.govtIdProofURL.url ||
        userThroughCCUser.govtIdProofURL.timeTillExpiry < new Date()
      ) {
        console.log("generating govt id proof url");
        userThroughCCUser.govtIdProofURL.url = await s3SignedUrl(
          userThroughCCUser.govtIdProofARN
        );
        userThroughCCUser.govtIdProofURL.timeTillExpiry = new Date(
          new Date().getTime() + 6 * 24 * 60 * 60 * 1000
        );
        await userThroughCCUser.save();
        userThroughCCData.govtIdProofURL.url =
          userThroughCCUser.govtIdProofURL.url;
        userThroughCCData.govtIdProofURL.timeTillExpiry =
          userThroughCCUser.govtIdProofURL.timeTillExpiry;
      }
      userThroughCCList.push(userThroughCCData);
    }
    return res.status(200).json({
      message: "Users fetched successfully",
      data: [...ncpUserList, ...userThroughCCList],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Confirming user for an event
exports.confirmUser = async (req, res) => {
  try {
    // Required fields:
    // {
    //   _id: String,
    //   eventId: String
    //   Optional fields:
    //   sex: "male/female" => for Mr. and Ms. Kshitij
    //   weightCategory: "lightWeight/middleWeight/heavyWeight" => for MMA
    // }

    let { _id, eventId } = req.body;

    // Check if the eventId is valid
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    // Find the event
    let isSolo = true;
    let event = await soloEvent.findOne({
      $and: [{ _id: eventId }, { deleted: false }],
    });
    if (!event) {
      event = await teamEvent.findOne({
        $and: [{ _id: eventId }, { deleted: false }],
      });
      isSolo = false;
    }

    // Event doesnt exist
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Find the user
    let isNCP = true;
    let user = await ncpUser.findOne({
      $and: [{ ncpId: _id }, { deleted: false }],
    });
    if (!user) {
      user = await ccUser.findOne({
        $and: [{ ccId: _id }, { deleted: false }],
      });
      isNCP = false;
    }

    // User doesnt exist
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    _id = user._id;

    // Check if the user is registered for the event
    if (!isNCP) {
      if (isSolo) {
        if (event.name === "Mr. and Ms. Kshitij") {
          const registeredSolos = user.registeredSolos.filter(
            (solo) =>
              solo.eventId.toString() === eventId.toString() &&
              solo.sex === req.body.sex
          );
          if (registeredSolos.length === 0) {
            return res.status(400).json({
              error: `User not registered for Mr. and Ms. Kshitij as a ${req.body.sex} to confirm`,
            });
          }
        } else if (event.name === "MMA") {
          const registeredSolos = user.registeredSolos.filter(
            (solo) =>
              solo.eventId.toString() === eventId.toString() &&
              solo.weightCategory === req.body.weightCategory
          );
          if (registeredSolos.length === 0) {
            return res.status(400).json({
              error: `User not registered for MMA to confirm`,
            });
          }
        } else {
          // Check in user.registeredSolos to check if the user is registered for the event
          const registeredSolos = user.registeredSolos.find(
            (solo) => solo.eventId.toString() === eventId.toString()
          );
          if (!registeredSolos) {
            return res.status(400).json({
              error: `User not registered for ${event.name} to confirm`,
            });
          }
        }
      } else {
        // Check in user.registeredTeams to check if the user is registered for the event
        const registeredTeams = user.registeredTeams.find(
          (team) => team.eventId.toString() === eventId.toString()
        );
        if (!registeredTeams) {
          return res.status(400).json({
            error: `User not registered for ${event.name} to confirm`,
          });
        }
      }
    } else {
      if (isSolo) {
        // Check if user is registered for Mr. and Ms. Kshitij
        if (event.name === "Mr. and Ms. Kshitij") {
          const isRegistered =
            event.userRegistrations[0]?.["male"]?.includes(_id) ||
            event.userRegistrations[0]?.["female"]?.includes(_id);
          if (!isRegistered) {
            return res.status(400).json({
              error: `User is not registered for Mr. and Ms. Kshitij to confirm`,
            });
          }
        } // Check if user is registered for MMA
        else if (event.name === "MMA") {
          const isRegistered =
            event.userRegistrations[0]?.["lightWeight"]?.includes(_id) ||
            event.userRegistrations[0]?.["middleWeight"]?.includes(_id) ||
            event.userRegistrations[0]?.["heavyWeight"]?.includes(_id);
          if (!isRegistered) {
            return res.status(400).json({
              error: `User is not registered for MMA to confirm`,
            });
          }
        }
        // Checking if the user is already registered for event
        else {
          const isRegistered = event.userRegistrations.includes(_id);
          if (!isRegistered) {
            return res.status(400).json({
              error: `User is not registered for ${event.name} to confirm`,
            });
          }
        }
      } else {
        const userRegistrations = event.userRegistrations.find(
          (registration) => {
            return registration.registerer.toString() === _id.toString();
          }
        );
        if (!userRegistrations) {
          return res.status(400).json({
            error: `User is not registered for ${event.name} to confirm`,
          });
        }
      }
    }

    // Confirming the user
    if (!isNCP) {
      if (isSolo) {
        if (event.name === "Mr. and Ms. Kshitij") {
          // Checking if event slots are available
          if (event.slots[req.body.sex] === 0) {
            return res.status(400).json({
              error: `No slots available for ${event.name} as a ${req.body.sex}`,
            });
          }
          const regUser = user.registeredSolos.filter(
            (solo) =>
              solo.eventId.toString() === eventId.toString() &&
              solo.sex === req.body.sex
          );
          regUser[0].confirmed = true;
          user.markModified("registeredSolos");
          await user.save();
          if (event.confirmedRegistrations.length === 0) {
            if (req.body.sex === "male") {
              event.confirmedRegistrations = [
                { male: [regUser[0].userId.toString()], female: [] },
              ];
            } else {
              event.confirmedRegistrations = [
                { male: [], female: [regUser[0].userId.toString()] },
              ];
            }
          } else {
            // Check if the user is already confirmed for the event
            if (
              event.confirmedRegistrations[0][req.body.sex].includes(
                regUser[0].userId.toString()
              )
            ) {
              return res
                .status(400)
                .json({ error: "User already confirmed for the event" });
            }
            event.confirmedRegistrations[0][req.body.sex].push(
              regUser[0].userId.toString()
            );
          }
          user.points += event.points.registration;
          user.markModified("points");
          await user.save();
          event.slots[req.body.sex] -= 1;
          event.markModified("slots");
          event.markModified("confirmedRegistrations");
          await event.save();
        } else if (event.name === "MMA") {
          // Checking if event slots are available
          if (event.slots[req.body.weightCategory] === 0) {
            return res.status(400).json({
              error: `No slots available for ${event.name} as a ${req.body.weightCategory}`,
            });
          }
          const regUser = user.registeredSolos.filter(
            (solo) =>
              solo.eventId.toString() === eventId.toString() &&
              solo.weightCategory === req.body.weightCategory
          );
          regUser[0].confirmed = true;
          user.markModified("registeredSolos");
          await user.save();

          if (event.confirmedRegistrations.length === 0) {
            if (req.body.weightCategory === "lightWeight") {
              event.confirmedRegistrations = [
                {
                  lightWeight: [regUser[0].userId.toString()],
                  middleWeight: [],
                  heavyWeight: [],
                },
              ];
            } else if (req.body.weightCategory === "middleWeight") {
              event.confirmedRegistrations = [
                {
                  lightWeight: [],
                  middleWeight: [regUser[0].userId.toString()],
                  heavyWeight: [],
                },
              ];
            } else {
              event.confirmedRegistrations = [
                {
                  lightWeight: [],
                  middleWeight: [],
                  heavyWeight: [regUser[0].userId.toString()],
                },
              ];
            }
          } else {
            // Check if the user is already confirmed for the event
            if (
              event.confirmedRegistrations[0][req.body.weightCategory].includes(
                regUser[0].userId.toString()
              )
            ) {
              return res
                .status(400)
                .json({ error: "User already confirmed for the event" });
            }
            event.confirmedRegistrations[0][req.body.weightCategory].push(
              regUser[0].userId.toString()
            );
          }
          user.points += event.points.registration;
          user.markModified("points");
          await user.save();
          event.slots[req.body.weightCategory] -= 1;
          event.markModified("slots");
          event.markModified("confirmedRegistrations");
          await event.save();
        } else {
          // Checking if event slots are available
          if (event.slots === 0) {
            return res.status(400).json({
              error: `No slots available for ${event.name}`,
            });
          }
          let regUser = user.registeredSolos.filter(
            (solo) => solo.eventId.toString() === eventId.toString()
          );
          regUser[0].confirmed = true;
          user.markModified("registeredSolos");
          await user.save();

          // Check if the user is already confirmed for the event
          if (
            event.confirmedRegistrations.includes(regUser[0].userId.toString())
          ) {
            return res
              .status(400)
              .json({ error: "User already confirmed for the event" });
          }
          // Adding the user to the confirmed registrations
          user.points += event.points.registration;
          event.confirmedRegistrations.push(regUser[0].userId.toString());
          event.slots -= 1;
          user.markModified("points");
          event.markModified("slots");
          event.markModified("confirmedRegistrations");
          await user.save();
          await event.save();
        }
      } else {
        // Checking if event slots are available
        if (event.slots === 0) {
          return res.status(400).json({
            error: `No slots available for ${event.name}`,
          });
        }
        let registeredTeam = user.registeredTeams.find(
          (team) => team.eventId.toString() === eventId.toString()
        );

        if (registeredTeam.confirmed) {
          return res
            .status(400)
            .json({ error: "Team already confirmed for the event" });
        }

        registeredTeam.confirmed = true;
        user.markModified("registeredTeams");
        await user.save();
        event.confirmedRegistrations.push({
          teamName: _id.toString(),
          registerer: _id.toString(),
          teamMembers: registeredTeam.teamMembers,
          npaMembers: registeredTeam.npaMembers,
        });
        user.points += event.points.registration;
        event.slots -= 1;
        user.markModified("points");
        event.markModified("confirmedRegistrations");
        event.markModified("slots");
        await user.save();
        await event.save();
      }
    } else {
      if (isSolo) {
        if (event.name === "Mr. and Ms. Kshitij") {
          // Checking if event slots are available
          if (event.slots[req.body.sex] === 0) {
            return res.status(400).json({
              error: `No slots available for ${event.name} as a ${req.body.sex}`,
            });
          }
          if (event.confirmedRegistrations.length === 0) {
            if (req.body.sex === "male") {
              event.confirmedRegistrations = [
                { male: [_id.toString()], female: [] },
              ];
            } else {
              event.confirmedRegistrations = [
                { male: [], female: [_id.toString()] },
              ];
            }
          } else {
            // Check if the user is already confirmed for the event
            if (
              event.confirmedRegistrations[0][req.body.sex].includes(
                _id.toString()
              )
            ) {
              return res
                .status(400)
                .json({ error: "User already confirmed for the event" });
            }
            event.confirmedRegistrations[0][req.body.sex].push(_id.toString());
          }

          event.slots[req.body.sex] -= 1;
          event.markModified("slots");
          event.markModified("confirmedRegistrations");
          await event.save();
        } else if (event.name === "MMA") {
          // Checking if event slots are available
          if (event.slots[req.body.weightCategory] === 0) {
            return res.status(400).json({
              error: `No slots available for ${event.name} as a ${req.body.weightCategory}`,
            });
          }
          if (event.confirmedRegistrations.length === 0) {
            if (req.body.weightCategory === "lightWeight") {
              event.confirmedRegistrations = [
                {
                  lightWeight: [_id.toString()],
                  middleWeight: [],
                  heavyWeight: [],
                },
              ];
            } else if (req.body.weightCategory === "middleWeight") {
              event.confirmedRegistrations = [
                {
                  lightWeight: [],
                  middleWeight: [_id.toString()],
                  heavyWeight: [],
                },
              ];
            } else {
              event.confirmedRegistrations = [
                {
                  lightWeight: [],
                  middleWeight: [],
                  heavyWeight: [_id.toString()],
                },
              ];
            }
          } else {
            // Check if the user is already confirmed for the event
            if (
              event.confirmedRegistrations[0][req.body.weightCategory].includes(
                _id.toString()
              )
            ) {
              return res
                .status(400)
                .json({ error: "User already confirmed for the event" });
            }
            event.confirmedRegistrations[0][req.body.weightCategory].push(
              _id.toString()
            );
          }

          event.slots[req.body.weightCategory] -= 1;
          event.markModified("slots");
          event.markModified("confirmedRegistrations");
          await event.save();
        } else {
          // Checking if event slots are available
          if (event.slots === 0) {
            return res.status(400).json({
              error: `No slots available for ${event.name}`,
            });
          }

          // Check if the user is already confirmed for the event
          if (event.confirmedRegistrations.includes(_id.toString())) {
            return res
              .status(400)
              .json({ error: "User already confirmed for the event" });
          }
          event.confirmedRegistrations.push(_id.toString());
          event.slots -= 1;
          event.markModified("slots");
          event.markModified("confirmedRegistrations");
          await event.save();
        }
      } else {
        // Checking if event slots are available
        if (event.slots === 0) {
          return res.status(400).json({
            error: `No slots available for ${event.name}`,
          });
        }
        const registeredTeam = event.userRegistrations.find(
          (registration) =>
            registration.registerer.toString() === _id.toString()
        );
        // Check if the team is already confirmed for the event
        if (
          event.confirmedRegistrations.find(
            (registration) =>
              registration.registerer.toString() === _id.toString()
          )
        ) {
          return res
            .status(400)
            .json({ error: "Team already confirmed for the event" });
        }
        event.confirmedRegistrations.push(registeredTeam);
        event.slots -= 1;
        event.markModified("slots");
        event.markModified("confirmedRegistrations");
        await event.save();
      }
    }

    // Sending the mail
    const mailOptions = {
      from: "levandumped@gmail.com",
      to: user.email,
      subject: "Registration confirmed",
      text: `Your registration has been confirmed for the event ${event.name}`,
    };

    await sendEmailWithRetry(mailOptions);

    return res.status(200).json({ message: "User confirmed successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Replacing user with another user for a confirmed event
exports.replaceConfirmedUser = async (req, res) => {
  try {
    // Required fields:
    // {
    //   _id: String,
    //   eventId: String,
    //   replacementUserId: String
    //   sex // Only for Mr. and Ms. Kshitij
    //   weightCategory // Only for MMA
    // }
    const { _id, eventId, replacementUserId } = req.body;

    // Checking if the user id is same as the replacement user id
    if (_id === replacementUserId) {
      return res
        .status(400)
        .json({ error: "User ID and replacement user ID cannot be the same" });
    }

    // Finding the user
    let isNCP = false;
    let user = await ccUser.findOne({
      $and: [{ ccId: _id }, { deleted: false }],
    });
    if (!user) {
      isNCP = true;
      user = await ncpUser.findOne({
        $and: [{ ncpId: _id }, { deleted: false }],
      });
    }
    // User not found
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Checking the replacement user
    let replacementUser = await ccUser.findOne({
      $and: [{ ccId: replacementUserId }, { deleted: false }],
    });
    if (!replacementUser) {
      replacementUser = await ncpUser.findOne({
        $and: [{ ncpId: replacementUserId }, { deleted: false }],
      });
    }
    // Replacement user not found
    if (!replacementUser) {
      return res.status(404).json({ error: "Replacement user not found" });
    }

    // Finding the event
    let isSolo = true;
    let event = await soloEvent.findOne({
      $and: [{ _id: eventId }, { deleted: false }],
    });
    if (!event) {
      isSolo = false;
      event = await teamEvent.findOne({
        $and: [{ _id: eventId }, { deleted: false }],
      });
    }
    // Event not found
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Checking if the _id is confirmed for the event
    if (
      user.registeredSolos.find(
        (solo) =>
          solo.eventId.toString() === eventId.toString() && !solo.confirmed
      )
    ) {
      return res
        .status(400)
        .json({ error: "User not confirmed for the event" });
    }

    // Adding a temporary slot for the replacement user
    if (event.name === "Mr. and Ms. Kshitij") {
      event.slots[req.body.sex] += 1;
    } else if (event.name === "MMA") {
      event.slots[req.body.weightCategory] += 1;
    } else {
      event.slots += 1;
    }
    event.markModified("slots");
    await event.save();

    // Confirming the user
    req.body._id = replacementUserId;
    await confirmUserShared(req, res);
    event = await (isSolo ? soloEvent : teamEvent).findOne({
      $and: [{ _id: eventId }, { deleted: false }],
    });

    // Cleaning the replaced User
    if (!isNCP) {
      if (isSolo) {
        if (event.name === "Mr. and Ms. Kshitij") {
          // Finding the user in the user's registeredSolos
          let regUser = user.registeredSolos.find(
            (solo) =>
              solo.eventId.toString() === eventId.toString() &&
              solo.sex === req.body.sex
          );

          // Removing the user from the confirmed registrations
          event.confirmedRegistrations[0][regUser.sex] =
            event.confirmedRegistrations[0][regUser.sex].filter(
              (registration) =>
                registration.toString() !== regUser.userId.toString()
            );

          // Changing the confirmed field of the entry in the user's registeredSolos to false
          user.registeredSolos = user.registeredSolos.map((solo) => {
            if (
              solo.eventId.toString() === eventId.toString() &&
              solo.sex === req.body.sex
            ) {
              return {
                ...solo,
                confirmed: false,
              };
            }
            return solo;
          });

          user.markModified("registeredSolos");
          await user.save();
          event.slots[req.body.sex] -= 1;
          event.markModified("slots");
          event.markModified("confirmedRegistrations");
          await event.save();
        } else if (event.name === "MMA") {
          // Finding the user in the user's registeredSolos
          let regUser = user.registeredSolos.find(
            (solo) =>
              solo.eventId.toString() === eventId.toString() &&
              solo.weightCategory === req.body.weightCategory
          );

          event.confirmedRegistrations[0][regUser.weightCategory] =
            event.confirmedRegistrations[0][regUser.weightCategory].filter(
              (registration) =>
                registration.toString() !== regUser.userId.toString()
            );

          // Changing the confirmed field of the entry in the user's registeredSolos to false
          user.registeredSolos = user.registeredSolos.map((solo) => {
            if (
              solo.eventId.toString() === eventId.toString() &&
              solo.weightCategory === req.body.weightCategory
            ) {
              return {
                ...solo,
                confirmed: false,
              };
            }
            return solo;
          });

          user.markModified("registeredSolos");
          await user.save();
          event.slots[req.body.weightCategory] -= 1;
          await event.save();
        } else {
          // Finding the user in the user's registeredSolos
          let regUser = user.registeredSolos.find(
            (solo) => solo.eventId.toString() === eventId.toString()
          );

          // Removing the user from the confirmed registrations
          event.confirmedRegistrations = event.confirmedRegistrations.filter(
            (registration) =>
              registration.toString() !== regUser.userId.toString()
          );

          // Changing the confirmed field of the entry in the user's registeredSolos to false
          user.registeredSolos = user.registeredSolos.map((solo) => {
            if (solo.eventId.toString() === eventId.toString()) {
              return {
                ...solo,
                confirmed: false,
              };
            }
            return solo;
          });
          event.slots -= 1;
          await event.save();
        }
      } else {
        // Finding the team in the user's registeredTeams
        let regTeam = user.registeredTeams.find(
          (team) => team.eventId.toString() === eventId.toString()
        );

        // Removing the team from the confirmed registrations
        event.confirmedRegistrations = event.confirmedRegistrations.filter(
          (registration) =>
            registration.registerer.toString() !== regTeam.registerer.toString()
        );

        // Changing the confirmed field of the entry in the user's registeredTeams to false
        user.registeredTeams = user.registeredTeams.map((team) => {
          if (team.eventId.toString() === eventId.toString()) {
            return {
              ...team,
              confirmed: false,
            };
          }
          return team;
        });

        user.markModified("registeredTeams");
        await user.save();

        event.slots -= 1;
        event.markModified("slots");
        event.markModified("confirmedRegistrations");
        await event.save();
      }
    } else {
      if (isSolo) {
        if (event.name === "Mr. and Ms. Kshitij") {
          // Removing the user from the confirmed registrations
          event.confirmedRegistrations[0][req.body.sex] =
            event.confirmedRegistrations[0][req.body.sex].filter(
              (registration) => registration.toString() !== _id.toString()
            );
          event.slots[req.body.sex] -= 1;
          await event.save();
        } else if (event.name === "MMA") {
          // Removing the user from the confirmed registrations
          event.confirmedRegistrations[0][req.body.weightCategory] =
            event.confirmedRegistrations[0][req.body.weightCategory].filter(
              (registration) => registration.toString() !== _id.toString()
            );
          event.slots[req.body.weightCategory] -= 1;
          await event.save();
        } else {
          // Removing the user from the confirmed registrations
          event.confirmedRegistrations = event.confirmedRegistrations.filter(
            (registration) => registration.toString() !== _id.toString()
          );
          event.slots -= 1;
          await event.save();
        }
      } else {
        // Removing the team from the confirmed registrations
        event.confirmedRegistrations = event.confirmedRegistrations.filter(
          (registration) =>
            registration.registerer.toString() !== _id.toString()
        );

        event.slots -= 1;
        event.markModified("slots");
        event.markModified("confirmedRegistrations");
        await event.save();
      }
    }

    // Giving npr to the replaced user and registration points are already added to the replacement user while confirming.
    if (!isNCP) {
      user.points -= event.points.npr;
      await user.save();
    }

    return res.status(200).json({ message: "User replaced successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Substituing dummy entries with real entries for a confirmed event
exports.substituteEntriesForSolo = async (req, res) => {
  try {
    // Required fields: (Only CCs can substitute dummy entries and replace users)
    // userId: String
    // eventId: String
    // isDummy: Boolean ( true if substituting a dummy entry, false if substituting a user )
    // substituteData: { firstName, lastName, phoneNumber, email } for dummy entry substitution
    // for user substitution
    //{
    //   substituteData: { firstName, lastName, phoneNumber, email }, // For CC User
    //   toBeReplacedUser { firstName, lastName, phoneNumber } // CC User
    //}
    const { userId, eventId } = req.body;
    let isDummy = req.body.isDummy;
    let substituteData = JSON.parse(req.body.substituteData);
    let toBeReplacedUser =
      req.body.toBeReplacedUser && JSON.parse(req.body.toBeReplacedUser);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    // Finding the user
    let isNCP = false;
    let user = await ccUser.findOne({
      $and: [{ ccId: userId }, { deleted: false }],
    });
    if (!user) {
      isNCP = true;
      user = await ncpUser.findOne({
        $and: [{ ncpId: userId }, { deleted: false }],
      });
    }

    // User not found
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Finding the event
    let event = await soloEvent.findById(eventId);

    // Event not found
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Searching the dummy entries
    if (!isNCP) {
      if (isDummy) {
        // Finding the dummy entry
        const eventUserWantsToSubstitute = user.registeredSolos.find(
          (solo) =>
            solo.eventId.toString() === eventId.toString() &&
            solo.userId.toString().includes("dummy")
        );
        // No dummy entry found
        if (!eventUserWantsToSubstitute) {
          return res
            .status(400)
            .json({ error: "No dummy entry found in the event registered" });
        }

        // Finding if the details match with any user in the database
        let newUser = await userThroughCC.findOne({
          $and: [
            { ccId: user._id },
            { firstName: substituteData.firstName },
            { lastName: substituteData.lastName },
            { phoneNumber: substituteData.phoneNumber },
          ],
        });

        // Creating the new user
        if (!newUser) {
          newUser = await userThroughCC.create({
            ccId: user._id,
            firstName: substituteData.firstName,
            lastName: substituteData.lastName,
            phoneNumber: substituteData.phoneNumber,
            email: substituteData.email,
            idProofARN: "",
            govtIdProofARN: "",
            verified: "VERIFIED",
          });
        }

        // Changing the dummy entry with the new user in the event
        if (event.name === "Mr. and Ms. Kshitij") {
          event.userRegistrations[0][eventUserWantsToSubstitute.sex] =
            event.userRegistrations[0][eventUserWantsToSubstitute.sex].map(
              (registration) => {
                if (
                  registration.toString() ===
                  eventUserWantsToSubstitute.userId.toString()
                ) {
                  return newUser._id;
                }
                return registration;
              }
            );
        } else if (event.name === "MMA") {
          event.userRegistrations[0][
            eventUserWantsToSubstitute.weightCategory
          ] = event.userRegistrations[0][
            eventUserWantsToSubstitute.weightCategory
          ].map((registration) => {
            if (
              registration.toString() ===
              eventUserWantsToSubstitute.userId.toString()
            ) {
              return newUser._id;
            }
            return registration;
          });
        } else {
          event.userRegistrations = event.userRegistrations.map(
            (registration) => {
              if (
                registration.toString() ===
                eventUserWantsToSubstitute.userId.toString()
              ) {
                return newUser._id;
              }
              return registration;
            }
          );
        }

        eventUserWantsToSubstitute.userId = newUser._id.toString();
        // Updating the dummy entry with the new user in the user's registeredSolos
        // Uploading the idProof
        if (newUser.idProofARN === "") {
          // Uploading the idProof
          const idProofARN = await s3Upload(req.files.idProof[0]);
          // Uploading the govtIdProof
          const govtIdProofARN = await s3Upload(req.files.govtIdProof[0]);
          // Getting the file types
          const idProofType = req.files.idProof[0].mimetype;
          const govtIdProofType = req.files.govtIdProof[0].mimetype;
          // Updating the user
          newUser.idProofARN = idProofARN;
          newUser.govtIdProofARN = govtIdProofARN;
          newUser.idProofType = idProofType;
          newUser.govtIdProofType = govtIdProofType;
        }
        await newUser.save();
        await user.save();
        event.markModified("userRegistrations");
        await event.save();
        await event.save();
      } else {
        // Replacing a user
        let userThroughCCUser = await userThroughCC.findOne({
          $and: [
            { ccId: user._id },
            { firstName: toBeReplacedUser.firstName },
            { lastName: toBeReplacedUser.lastName },
            { phoneNumber: toBeReplacedUser.phoneNumber },
          ],
        });

        if (!userThroughCCUser) {
          return res
            .status(400)
            .json({ error: "To be replaced user not found" });
        }

        // Finding the user in the user's registeredSolos
        let toBeReplacedUserInRegiSolo = user.registeredSolos.find(
          (solo) =>
            solo.eventId.toString() === eventId.toString() &&
            solo.userId.toString() === userThroughCCUser._id.toString()
        );

        // User not found
        if (!toBeReplacedUserInRegiSolo) {
          return res.status(400).json({
            error:
              "To be replaced user not found in the event registered to be substituted",
          });
        }

        // Finding if the details match with any user in the database
        let newUser = await userThroughCC.findOne({
          $and: [
            { ccId: user._id },
            { firstName: substituteData.firstName },
            { lastName: substituteData.lastName },
            { phoneNumber: substituteData.phoneNumber },
          ],
        });
        // Creating the new user
        if (!newUser) {
          newUser = await userThroughCC.create({
            ccId: user.ccId,
            firstName: substituteData.firstName,
            lastName: substituteData.lastName,
            phoneNumber: substituteData.phoneNumber,
            email: substituteData.email,
            idProofARN: "",
            govtIdProofARN: "",
            verified: "VERIFIED",
          });
        }

        // Changing the dummy entry with the new user in the event
        if (event.name === "Mr. and Ms. Kshitij") {
          event.userRegistrations[0][toBeReplacedUserInRegiSolo.sex] =
            event.userRegistrations[0][toBeReplacedUserInRegiSolo.sex].map(
              (registration) => {
                return registration.toString() ===
                  toBeReplacedUserInRegiSolo.userId.toString()
                  ? newUser._id.toString()
                  : registration;
              }
            );
        } else if (event.name === "MMA") {
          event.userRegistrations[0][
            toBeReplacedUserInRegiSolo.weightCategory
          ] = event.userRegistrations[0][
            toBeReplacedUserInRegiSolo.weightCategory
          ].map((registration) => {
            console.log("hi");
            return registration.toString() ===
              toBeReplacedUserInRegiSolo.userId.toString()
              ? newUser._id
              : registration;
          });
        } else {
          event.userRegistrations = event.userRegistrations.map(
            (registration) => {
              if (
                registration.toString() ===
                toBeReplacedUserInRegiSolo.userId.toString()
              ) {
                return newUser._id;
              }
              return registration;
            }
          );
        }

        toBeReplacedUserInRegiSolo.userId = newUser._id.toString();
        // Uploading the idProof
        if (newUser.idProofARN === "") {
          // Uploading the idProof
          const idProofARN = await s3Upload(req.files.idProof[0]);
          // Uploading the govtIdProof
          const govtIdProofARN = await s3Upload(req.files.govtIdProof[0]);
          // Getting the file types
          const idProofType = req.files.idProof[0].mimetype;
          const govtIdProofType = req.files.govtIdProof[0].mimetype;
          // Updating the user
          newUser.idProofARN = idProofARN;
          newUser.govtIdProofARN = govtIdProofARN;
          newUser.idProofType = idProofType;
          newUser.govtIdProofType = govtIdProofType;
        }
        await newUser.save();
        // Changing the dummy entry with the new user in the user's registeredSolos

        await user.save();
        event.markModified("userRegistrations");
        await event.save();
      }
    } else {
      return res
        .status(400)
        .json({ error: "NCP Solo Event substitution not allowed" });
    }

    res.status(200).json({ message: "Substitution successful" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Substituting dummy entries for a confirmed team event
exports.substituteEntriesForTeam = async (req, res) => {
  try {
    // Required fields:
    // userId: String
    // eventId: String
    // isDummy: Boolean ( true if substituting a dummy entry, false if substituting a user )
    // substituteData: [ { firstName, lastName, phoneNumber, email } ] for dummy entry substitution
    // for user substitution
    //
    //   // CC User
    //   substituteData: { teamMembers: [ { firstName, lastName, phoneNumber, email } ],
    //                    npaMembers: [ { firstName, lastName, phoneNumber, email } ] },
    //   teamMembers: [ images ],
    //   npaMembers: [ images ],
    //   toBeReplacedUser { teamMembers: [ { firstName, lastName, phoneNumber } ],
    //                    npaMembers: [ { firstName, lastName, phoneNumber } ] },
    //   //NCP User
    //   toBeReplacedUser { teamMembers: [ { ncpId } ],
    //                    npaMembers: [ { ncpId } ] },
    //   substituteData: { teamMembers: [ { ncpId } ],
    //                    npaMembers: [ { ncpId } ] }
    //
    const { userId, eventId, isDummy } = req.body;
    let substituteData = JSON.parse(req.body.substituteData);
    let toBeReplacedUser =
      req.body.toBeReplacedUser && JSON.parse(req.body.toBeReplacedUser);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    // Finding the user
    let isNCP = false;
    let user = await ccUser.findOne({ ccId: userId, deleted: false });
    if (!user) {
      isNCP = true;
      user = await ncpUser.findOne({ ncpId: userId, deleted: false });
    }

    // User not found
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Finding the event
    let event = await teamEvent.findById(eventId);

    // Event not found
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (!isNCP) {
      if (isDummy) {
        // Replacing dummy entries

        // Finding the team in which dummy entries are to be replaced
        const eventWithDummyEntries = user.registeredTeams.find(
          (team) => team.eventId.toString() === eventId.toString()
        );

        // Replacing the dummy entries with the substitute data
        let teamCount = 0;
        // Replacing the teamMembers
        if (
          substituteData.teamMembers &&
          substituteData.teamMembers.length > 0
        ) {
          for (let i = 0; i < eventWithDummyEntries.teamMembers.length; i++) {
            if (
              eventWithDummyEntries.teamMembers[i].toString().includes("dummy")
            ) {
              // Check if valid phone number
              if (
                !/^[6-9]\d{9}$/.test(
                  substituteData.teamMembers[teamCount].phoneNumber
                )
              ) {
                return res.status(400).json({
                  error: `Invalid phone number for team member (${
                    substituteData.teamMembers[teamCount].firstName +
                    " " +
                    substituteData.teamMembers[teamCount].lastName
                  })`,
                });
              }

              // Check if valid email
              if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                  substituteData.teamMembers[teamCount].email
                )
              ) {
                return res.status(400).json({
                  error: `Invalid email for team member (${
                    substituteData.teamMembers[teamCount].firstName +
                    " " +
                    substituteData.teamMembers[teamCount].lastName
                  })`,
                });
              }

              let newUser = await userThroughCC.findOne({
                $and: [
                  { ccId: user._id },
                  {
                    firstName: substituteData.teamMembers[teamCount].firstName,
                  },
                  { lastName: substituteData.teamMembers[teamCount].lastName },
                  {
                    phoneNumber:
                      substituteData.teamMembers[teamCount].phoneNumber,
                  },
                ],
              });
              if (!newUser) {
                newUser = await userThroughCC.create({
                  ccId: user._id,
                  firstName: substituteData.teamMembers[teamCount].firstName,
                  lastName: substituteData.teamMembers[teamCount].lastName,
                  phoneNumber:
                    substituteData.teamMembers[teamCount].phoneNumber,
                  email: substituteData.teamMembers[teamCount].email,
                  verified: "VERIFIED",
                  idProofARN: "",
                  govtIdProofARN: "",
                });

                // Uploading the idProof
                const idProofARN = await s3Upload(
                  req.files.teamMembers[teamCount]
                );
                // Uploading the govtIdProof
                const govtIdProofARN = await s3Upload(
                  req.files.teamMembersGovtIdProof[teamCount]
                );
                // Getting the file types
                const idProofType = req.files.teamMembers[teamCount].mimetype;
                const govtIdProofType =
                  req.files.teamMembersGovtIdProof[teamCount].mimetype;
                // Updating the user
                newUser.idProofARN = idProofARN;
                newUser.govtIdProofARN = govtIdProofARN;
                newUser.idProofType = idProofType;
                newUser.govtIdProofType = govtIdProofType;
                await newUser.save();
              }
              // Updating the teamMembers array
              eventWithDummyEntries.teamMembers[i] = newUser._id;
              teamCount++;
            }
          }
        }

        let npaCount = 0;
        // Replacing the npaMembers
        if (substituteData.npaMembers && substituteData.npaMembers.length > 0) {
          for (let i = 0; i < eventWithDummyEntries.npaMembers.length; i++) {
            if (
              eventWithDummyEntries.npaMembers[i].toString().includes("dummy")
            ) {
              // Check if valid phone number
              if (
                !/^[6-9]\d{9}$/.test(
                  substituteData.npaMembers[npaCount].phoneNumber
                )
              ) {
                return res.status(400).json({
                  error: `Invalid phone number for NPA member (${
                    substituteData.npaMembers[npaCount].firstName +
                    " " +
                    substituteData.npaMembers[npaCount].lastName
                  })`,
                });
              }

              // Check if valid email
              if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                  substituteData.npaMembers[npaCount].email
                )
              ) {
                return res.status(400).json({
                  error: `Invalid email for NPA member (${
                    substituteData.npaMembers[npaCount].firstName +
                    " " +
                    substituteData.npaMembers[npaCount].lastName
                  })`,
                });
              }

              let newUser = await userThroughCC.findOne({
                $and: [
                  { ccId: user._id },
                  { firstName: substituteData.npaMembers[npaCount].firstName },
                  { lastName: substituteData.npaMembers[npaCount].lastName },
                  {
                    phoneNumber:
                      substituteData.npaMembers[npaCount].phoneNumber,
                  },
                ],
              });
              if (!newUser) {
                newUser = await userThroughCC.create({
                  ccId: user._id,
                  firstName: substituteData.npaMembers[npaCount].firstName,
                  lastName: substituteData.npaMembers[npaCount].lastName,
                  phoneNumber: substituteData.npaMembers[npaCount].phoneNumber,
                  email: substituteData.npaMembers[npaCount].email,
                  verified: "VERIFIED",
                  idProofARN: "",
                  govtIdProofARN: "",
                });
                // Uploading the idProof
                const idProofARN = await s3Upload(
                  req.files.npaMembers[npaCount]
                );
                // Uploading the govtIdProof
                const govtIdProofARN = await s3Upload(
                  req.files.npaMembersGovtIdProof[npaCount]
                );
                // Getting the file types
                const idProofType = req.files.npaMembers[npaCount].mimetype;
                const govtIdProofType =
                  req.files.npaMembersGovtIdProof[npaCount].mimetype;
                // Updating the user
                newUser.idProofARN = idProofARN;
                newUser.govtIdProofARN = govtIdProofARN;
                newUser.idProofType = idProofType;
                newUser.govtIdProofType = govtIdProofType;
                await newUser.save();
              }
              // Updating the teamMembers array
              eventWithDummyEntries.npaMembers[i] = newUser._id;
              npaCount++;
            }
          }
        }

        if (npaCount + teamCount === 0) {
          return res
            .status(400)
            .json({ error: "No dummy entries found in team or NPA" });
        }

        user.markModified("registeredTeams");
        await user.save();

        // Updating the event
        const userRegistration = event.userRegistrations.find(
          (registration) =>
            registration.registerer.toString() === user._id.toString()
        );
        userRegistration.teamMembers = user.registeredTeams.find(
          (team) => team.eventId.toString() === event._id.toString()
        ).teamMembers;
        userRegistration.npaMembers = user.registeredTeams.find(
          (team) => team.eventId.toString() === event._id.toString()
        ).npaMembers;

        event.markModified("userRegistrations");
        await event.save();
      } else {
        // Replacing a user
        const eventWithEntriesToBeReplaced = user.registeredTeams.find(
          (team) => team.eventId.toString() === eventId.toString()
        );

        let teamChange = false;
        if (
          (toBeReplacedUser.teamMembers &&
            toBeReplacedUser.teamMembers.length > 0) ||
          (substituteData.teamMembers && substituteData.teamMembers.length > 0)
        ) {
          // Replacing the teamMembers
          for (let i = 0; i < toBeReplacedUser.teamMembers.length; i++) {
            let toBeReplacedUserId = userThroughCC.find({
              $and: [
                { ccId: user.ccId },
                { firstName: toBeReplacedUser.teamMembers[i].firstName },
                { lastName: toBeReplacedUser.teamMembers[i].lastName },
                { phoneNumber: toBeReplacedUser.teamMembers[i].phoneNumber },
              ],
            });

            // User not found
            if (!toBeReplacedUserId) {
              return res
                .status(400)
                .json({ error: "To be replaced user not found" });
            }
            toBeReplacedUserId = toBeReplacedUserId._id;

            if (
              eventWithEntriesToBeReplaced.teamMembers.includes(
                toBeReplacedUserId.toString()
              )
            ) {
              let newUser = await userThroughCC.findOne({
                $and: [
                  { ccId: user._id },
                  { firstName: substituteData.teamMembers[i].firstName },
                  { lastName: substituteData.teamMembers[i].lastName },
                  { phoneNumber: substituteData.teamMembers[i].phoneNumber },
                ],
              });
              if (!newUser) {
                newUser = await userThroughCC.create({
                  ccId: user._id,
                  firstName: substituteData.teamMembers[i].firstName,
                  lastName: substituteData.teamMembers[i].lastName,
                  phoneNumber: substituteData.teamMembers[i].phoneNumber,
                  email: substituteData.teamMembers[i].email,
                  verified: "VERIFIED",
                  idProofARN: "",
                  govtIdProofARN: "",
                });
                // Uploading the idProof
                const idProofARN = await s3Upload(req.body.teamMembers[i]);
                // Uploading the govtIdProof
                const govtIdProofARN = await s3Upload(
                  req.body.teamMembersGovtIdProof[i]
                );
                // Getting the file types
                const idProofType = req.body.teamMembers[i].mimetype;
                const govtIdProofType =
                  req.body.teamMembersGovtIdProof[i].mimetype;
                // Updating the user
                newUser.idProofARN = idProofARN;
                newUser.govtIdProofARN = govtIdProofARN;
                newUser.idProofType = idProofType;
                newUser.govtIdProofType = govtIdProofType;
                await newUser.save();
              }
              eventWithEntriesToBeReplaced.teamMembers[
                eventWithEntriesToBeReplaced.teamMembers.indexOf(
                  toBeReplacedUserId.toString()
                )
              ] = newUser._id;
            } else {
              return res.status(400).json({
                error:
                  "To be replaced user not found the user's registered list (Team List)",
              });
            }
            teamChange = true;
          }
        }

        let npaChange = false;
        if (
          (toBeReplacedUser.npaMembers &&
            toBeReplacedUser.npaMembers.length > 0) ||
          (substituteData.npaMembers && substituteData.npaMembers.length > 0)
        ) {
          // Replacing the npaMembers
          for (let i = 0; i < toBeReplacedUser.npaMembers.length; i++) {
            let toBeReplacedUserId = userThroughCC.find({
              $and: [
                { ccId: user._id },
                { firstName: toBeReplacedUser.npaMembers[i].firstName },
                { lastName: toBeReplacedUser.npaMembers[i].lastName },
                { phoneNumber: toBeReplacedUser.npaMembers[i].phoneNumber },
              ],
            });
            if (!toBeReplacedUserId) {
              return res
                .status(400)
                .json({ error: "To be replaced user not found" });
            }
            toBeReplacedUserId = toBeReplacedUserId._id;
            if (
              eventWithEntriesToBeReplaced.npaMembers.includes(
                toBeReplacedUserId.toString()
              )
            ) {
              let newUser = await userThroughCC.findOne({
                $and: [
                  { ccId: user._id },
                  { firstName: substituteData.npaMembers[i].firstName },
                  { lastName: substituteData.npaMembers[i].lastName },
                  { phoneNumber: substituteData.npaMembers[i].phoneNumber },
                ],
              });
              if (!newUser) {
                newUser = await userThroughCC.create({
                  ccId: user.ccId,
                  firstName: substituteData.npaMembers[i].firstName,
                  lastName: substituteData.npaMembers[i].lastName,
                  phoneNumber: substituteData.npaMembers[i].phoneNumber,
                  email: substituteData.npaMembers[i].email,
                  verified: "VERIFIED",
                  idProofARN: "",
                  govtIdProofARN: "",
                });
                // Uploading the idProof
                const idProofARN = await s3Upload(req.body.npaMembers[i]);
                // Uploading the govtIdProof
                const govtIdProofARN = await s3Upload(
                  req.body.npaMembersGovtIdProof[i]
                );
                // Getting the file types
                const idProofType = req.body.npaMembers[i].mimetype;
                const govtIdProofType =
                  req.body.npaMembersGovtIdProof[i].mimetype;
                // Updating the user
                newUser.idProofARN = idProofARN;
                newUser.govtIdProofARN = govtIdProofARN;
                newUser.idProofType = idProofType;
                newUser.govtIdProofType = govtIdProofType;
                await newUser.save();
              }
              eventWithEntriesToBeReplaced.npaMembers[
                eventWithEntriesToBeReplaced.npaMembers.indexOf(
                  toBeReplacedUserId.toString()
                )
              ] = newUser._id;
            } else {
              return res.status(400).json({
                error:
                  "To be replaced user not found the user's registered list (NPA List)",
              });
            }
          }
          npaChange = true;
        }

        if (!teamChange && !npaChange) {
          return res.status(400).json({
            error: "No changes made.",
          });
        }

        // Updating the user
        user.markModified("registeredTeams");
        await user.save();

        // Updating the event
        const userRegistration = event.userRegistrations.find(
          (registration) =>
            registration.registerer.toString() === user._id.toString()
        );
        userRegistration.teamMembers = user.registeredTeams.find(
          (team) => team.eventId.toString() === event._id.toString()
        ).teamMembers;
        userRegistration.npaMembers = user.registeredTeams.find(
          (team) => team.eventId.toString() === event._id.toString()
        ).npaMembers;

        event.markModified("userRegistrations");
        await event.save();
      }
    } else {
      // Not being used
      // // Replacing a user
      // const eventWithEntriesToBeReplaced = event.userRegistrations.find(
      //   (registration) =>
      //     registration.registerer.toString() === user._id.toString()
      // );
      // // Replacing the teamMembers
      // if (
      //   toBeReplacedUser.teamMembers &&
      //   toBeReplacedUser.teamMembers.length > 0
      // ) {
      //   for (let i = 0; i < toBeReplacedUser.teamMembers.length; i++) {
      //     const toBeReplacedUserId = await ncpUser.findOne({
      //       ncpId: toBeReplacedUser.teamMembers[i],
      //     });
      //     const replacementUserId = await ncpUser.findOne({
      //       ncpId: substituteData.teamMembers[i],
      //     });
      //     if (
      //       eventWithEntriesToBeReplaced.teamMembers.includes(
      //         toBeReplacedUserId._id.toString()
      //       )
      //     ) {
      //       eventWithEntriesToBeReplaced.teamMembers[
      //         eventWithEntriesToBeReplaced.teamMembers.indexOf(
      //           toBeReplacedUserId._id.toString()
      //         )
      //       ] = replacementUserId._id;
      //     } else {
      //       return res.status(400).json({
      //         error:
      //           "To be replaced user not found the user's registered list (Team List)",
      //       });
      //     }
      //   }
      // }
      // // Replacing the npaMembers
      // if (
      //   toBeReplacedUser.npaMembers &&
      //   toBeReplacedUser.npaMembers.length > 0
      // ) {
      //   for (let i = 0; i < toBeReplacedUser.npaMembers.length; i++) {
      //     const toBeReplacedUserId = await ncpUser.findOne({
      //       ncpId: toBeReplacedUser.npaMembers[i],
      //     });
      //     const replacementUserId = await ncpUser.findOne({
      //       ncpId: substituteData.npaMembers[i],
      //     });
      //     if (
      //       eventWithEntriesToBeReplaced.npaMembers.includes(
      //         toBeReplacedUserId._id.toString()
      //       )
      //     ) {
      //       eventWithEntriesToBeReplaced.npaMembers[
      //         eventWithEntriesToBeReplaced.npaMembers.indexOf(
      //           toBeReplacedUserId._id.toString()
      //         )
      //       ] = replacementUserId._id;
      //     } else {
      //       return res.status(400).json({
      //         error:
      //           "To be replaced user not found the user's registered list (NPA List)",
      //       });
      //     }
      //   }
      // }
    }
    // Updating the event
    await event.save();

    return res.status(200).json({ message: "User replaced successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Creating an otse for soloEvents
exports.createOtseForSolo = async (req, res) => {
  try {
    // Required fields:
    //{
    //   firstName: String,
    //   lastName: String,
    //   email: String,
    //   phoneNumber: String,
    //   eventId: String,
    //   sex: male/female Only for Mr. and Ms. Kshitij
    //   weightCategory: lightWeight/middleWeight/heavyWeight ( Only for MMA )
    // }

    // Fetching the data
    const { firstName, lastName, email, phoneNumber, eventId } = req.body;
    const sex = req.body.sex;
    const weightCategory = req.body.weightCategory;
    // Checking if the event id is valid
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    // Finding the event
    const event = await soloEvent.findById(eventId);
    if (!event) {
      return res.status(400).json({ error: "Event not found" });
    }

    // Check if the otse already exists
    let newOtse = await otseUser.findOne({
      $and: [{ email }, { phoneNumber }],
    });
    if (!newOtse) {
      let newOtseId;
      let isUnique = false;
      while (!isUnique) {
        const randomNum = Math.floor(Math.random() * (999 - 100 + 1)) + 100;
        newOtseId = "OTSE" + randomNum;
        const existingUser = await otseUser.findOne({ otseId: newOtseId });
        if (!existingUser) {
          isUnique = true;
        }
      }

      // Creating the otse
      newOtse = await otseUser.create({
        otseId: newOtseId,
        firstName,
        lastName,
        email,
        phoneNumber,
      });
    }

    if (event.name === "Mr. and Ms. Kshitij") {
      if (event.slots[sex] > 0) {
        if (event.confirmedRegistrations.length === 0) {
          event.confirmedRegistrations.push({
            male: [],
            female: [],
          });
        }
        event.confirmedRegistrations[0][sex].push(newOtse._id.toString());
        event.slots[sex]--;
      } else {
        return res.status(400).json({ error: "No slots left for this event" });
      }
    } else if (event.name === "MMA") {
      if (event.slots[weightCategory] > 0) {
        if (event.confirmedRegistrations.length === 0) {
          event.confirmedRegistrations.push({
            lightWeight: [],
            middleWeight: [],
            heavyWeight: [],
          });
        }
        event.confirmedRegistrations[0][weightCategory].push(
          newOtse._id.toString()
        );
        event.slots[weightCategory]--;
      } else {
        return res.status(400).json({ error: "No slots left for this event" });
      }
    } else {
      if (event.slots > 0) {
        event.confirmedRegistrations.push(newOtse._id.toString());
        event.slots--;
      } else {
        return res.status(400).json({ error: "No slots left for this event" });
      }
    }

    await event.save();

    return res
      .status(200)
      .json({ message: "OTSE for solo event created successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Create an otse for teamEvents
exports.createOtseForTeam = async (req, res) => {
  try {
    // Required Fields
    // {
    //   registerer : {
    //     firstName: String,
    //     lastName: String,
    //     email: String,
    //     phoneNumber: String
    //   },
    //   teamName: String,
    //   eventId: String,
    //   teamMembers: [{
    //     firstName: String,
    //     lastName: String,
    //     email: String,
    //     phoneNumber: String
    //   }]
    // }

    const { teamName, eventId, teamMembers, registerer } = req.body;

    // Checking if the event id is valid
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    // Finding the event
    const event = await teamEvent.findById(eventId);
    if (!event) {
      return res.status(400).json({ error: "Event not found" });
    }

    // Checking if the teamMembers length is greater than the event's max team size
    if (
      teamMembers.length >
      event.teamSize.max - 1 /* -1 because the registerer is also included */
    ) {
      return res
        .status(400)
        .json({ error: "Team size exceeds the event's max team size" });
    }

    // Checking if the team name is already taken
    if (
      event.confirmedRegistrations.find(
        (registration) => registration.teamName === teamName
      )
    ) {
      return res.status(400).json({ error: "Team name already taken" });
    }

    let newRegisterer = await otseUser.findOne({
      $and: [
        { email: registerer.email },
        { phoneNumber: registerer.phoneNumber },
      ],
    });
    if (!newRegisterer) {
      let newOtseId;
      let isUnique = false;
      while (!isUnique) {
        const randomNum = Math.floor(Math.random() * (999 - 100 + 1)) + 100;
        newOtseId = "OTSE" + randomNum;
        const existingUser = await otseUser.findOne({ otseId: newOtseId });
        if (!existingUser) {
          isUnique = true;
        }
      }
      newRegisterer = await otseUser.create({
        otseId: newOtseId,
        ...registerer,
      });
    }

    // Creating otse users for the team members
    const newTeamMembers = [];
    for (let i = 0; i < teamMembers.length; i++) {
      let newTeamMember = await otseUser.findOne({
        $and: [
          { email: teamMembers[i].email },
          { phoneNumber: teamMembers[i].phoneNumber },
        ],
      });
      if (!newTeamMember) {
        let newOtseId;
        let isUnique = false;
        while (!isUnique) {
          const randomNum = Math.floor(Math.random() * (999 - 100 + 1)) + 100;
          newOtseId = "OTSE" + randomNum;
          const existingUser = await otseUser.findOne({ otseId: newOtseId });
          if (!existingUser) {
            isUnique = true;
          }
        }
        newTeamMember = await otseUser.create({
          otseId: newOtseId,
          ...teamMembers[i],
        });
      }
      newTeamMembers.push(newTeamMember._id.toString());
    }

    // Creating the new team
    event.confirmedRegistrations.push({
      teamName,
      registerer: newRegisterer._id.toString(),
      teamMembers: newTeamMembers,
      npaMembers: [],
    });

    // Decreasing the event's slots
    event.slots--;

    await event.save();

    return res
      .status(200)
      .json({ message: "OTSE for team event created successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Get users for confirmation
exports.getUsersForConfirmation = async (req, res) => {
  try {
    // Required fields: None
    // Finding all the events
    let soloEvents = await soloEvent.find({});
    let teamEvents = await teamEvent.find({});

    // Formatting the events
    let formattedSoloEvents = [];
    for (let i = 0; i < soloEvents.length; i++) {
      if (soloEvents[i].name === "Mr. and Ms. Kshitij") {
        // Formatting the event
        formattedSoloEvents.push({
          eventId: soloEvents[i]._id,
          eventName: soloEvents[i].name,
          eventSlots: {
            male: soloEvents[i].slots.male,
            female: soloEvents[i].slots.female,
          },
          type: "solo",
          userRegistrations: {
            male: [],
            female: [],
          },
          confirmedUsers: {
            male: [],
            female: [],
          },
        });

        if (soloEvents[i].userRegistrations.length > 0) {
          for (
            let j = 0;
            j < soloEvents[i].userRegistrations[0].male.length;
            j++
          ) {
            let toBeFoundUser;
            if (
              soloEvents[i].userRegistrations[0].male[j]
                .toString()
                .includes("dummy")
            ) {
              toBeFoundUser = soloEvents[i].userRegistrations[0].male[j]
                .toString()
                .split(" ")[1];
            } else {
              toBeFoundUser = soloEvents[i].userRegistrations[0].male[j];
            }

            // Finding the user
            let user = await userThroughCC
              .findById(toBeFoundUser)
              .select(
                "-password -idProofURL -idProofARN -govtIdProofURL -govtIdProofARN -locked"
              );
            if (user) {
              user = await ccUser.findById(user.ccId).select("-password");
            }
            if (!user) {
              user = await ncpUser
                .findById(toBeFoundUser)
                .select(
                  "-password -idProofARN -idProofURL -govtIdProofARN -govtIdProofURL -locked"
                );
            }
            if (user === null) {
              user = await ccUser.findById(toBeFoundUser).select("-password");
            }
            if (
              soloEvents[i].confirmedRegistrations &&
              soloEvents[i].confirmedRegistrations.length > 0 &&
              (soloEvents[i].confirmedRegistrations[0].male.includes(
                user._id.toString()
              ) ||
                soloEvents[i].confirmedRegistrations[0].male.includes(
                  `dummyRef: ${user._id.toString()}`
                ))
            ) {
              formattedSoloEvents[i].confirmedUsers.male.push(
                user.ccId ? user.ccId : user.ncpId
              );
            } else {
              formattedSoloEvents[i].userRegistrations.male.push(
                user.ccId ? user.ccId : user.ncpId
              );
            }
          }
        }
        // Is an otse user
        if (soloEvents[i].confirmedRegistrations.length > 0) {
          for (
            let j = 0;
            j < soloEvents[i].confirmedRegistrations[0].male.length;
            j++
          ) {
            let toBeFoundUser = soloEvents[i].confirmedRegistrations[0].male[j];
            let user = await otseUser.findById(toBeFoundUser);
            if (
              soloEvents[i].confirmedRegistrations &&
              soloEvents[i].confirmedRegistrations.length > 0 &&
              soloEvents[i].confirmedRegistrations[0].male.includes(
                user._id.toString()
              )
            ) {
              formattedSoloEvents[i].confirmedUsers.male.push(
                user.otseId.toString()
              );
            }
          }
        }

        if (soloEvents[i].userRegistrations.length > 0) {
          for (
            let j = 0;
            j < soloEvents[i].userRegistrations[0].female.length;
            j++
          ) {
            let toBeFoundUser;
            if (
              soloEvents[i].userRegistrations[0].female[j]
                .toString()
                .includes("dummy")
            ) {
              toBeFoundUser = soloEvents[i].userRegistrations[0].female[j]
                .toString()
                .split(" ")[1];
            } else {
              toBeFoundUser = soloEvents[i].userRegistrations[0].female[j];
            }

            // Finding the user
            let user = await userThroughCC
              .findById(toBeFoundUser)
              .select(
                "-password -idProofURL -idProofARN -govtIdProofURL -govtIdProofARN -locked"
              );
            if (user) {
              user = await ccUser.findById(user.ccId).select("-password");
            }
            if (!user) {
              user = await ncpUser
                .findById(toBeFoundUser)
                .select(
                  "-password -idProofARN -idProofURL -govtIdProofARN -govtIdProofURL -locked"
                );
            }
            if (user === null) {
              user = await ccUser.findById(toBeFoundUser).select("-password");
            }
            if (
              soloEvents[i].confirmedRegistrations &&
              soloEvents[i].confirmedRegistrations.length > 0 &&
              (soloEvents[i].confirmedRegistrations[0].female.includes(
                user._id.toString()
              ) ||
                soloEvents[i].confirmedRegistrations[0].female.includes(
                  `dummyRef: ${user._id.toString()}`
                ))
            ) {
              formattedSoloEvents[i].confirmedUsers.female.push(
                user.ccId ? user.ccId : user.ncpId
              );
            } else {
              formattedSoloEvents[i].userRegistrations.female.push(
                user.ccId ? user.ccId : user.ncpId
              );
            }
          }
        }
        // Is an otse user
        if (soloEvents[i].confirmedRegistrations.length > 0) {
          for (
            let j = 0;
            j < soloEvents[i].confirmedRegistrations[0].female.length;
            j++
          ) {
            let toBeFoundUser =
              soloEvents[i].confirmedRegistrations[0].female[j];
            let user = await otseUser.findById(toBeFoundUser);
            if (user) {
              formattedSoloEvents[i].confirmedUsers.female.push(
                user.otseId.toString()
              );
            }
          }
        }
      } else if (soloEvents[i].name === "MMA") {
        // Formatting the event
        formattedSoloEvents.push({
          eventId: soloEvents[i]._id,
          eventName: soloEvents[i].name,
          eventSlots: {
            lightWeight: soloEvents[i].slots.lightWeight,
            middleWeight: soloEvents[i].slots.middleWeight,
            heavyWeight: soloEvents[i].slots.heavyWeight,
          },
          eventConfirmedUsers: soloEvents[i].confirmedRegistrations[0],
          type: "solo",
          userRegistrations: {
            lightWeight: [],
            middleWeight: [],
            heavyWeight: [],
          },
          confirmedUsers: {
            lightWeight: [],
            middleWeight: [],
            heavyWeight: [],
          },
        });

        if (soloEvents[i].userRegistrations.length > 0) {
          for (
            let j = 0;
            j < soloEvents[i].userRegistrations[0].lightWeight.length;
            j++
          ) {
            let toBeFoundUser;
            if (
              soloEvents[i].userRegistrations[0].lightWeight[j]
                .toString()
                .includes("dummy")
            ) {
              toBeFoundUser = soloEvents[i].userRegistrations[0].lightWeight[j]
                .toString()
                .split(" ")[1];
            } else {
              toBeFoundUser = soloEvents[i].userRegistrations[0].lightWeight[j];
            }

            // Finding the user
            let user = await userThroughCC
              .findById(toBeFoundUser)
              .select(
                "-password -idProofURL -idProofARN -govtIdProofURL -govtIdProofARN -locked"
              );
            if (user) {
              user = await ccUser.findById(user.ccId).select("-password");
            }
            if (!user) {
              user = await ncpUser
                .findById(toBeFoundUser)
                .select(
                  "-password -idProofARN -idProofURL -govtIdProofARN -govtIdProofURL -locked"
                );
            }
            if (user === null) {
              user = await ccUser.findById(toBeFoundUser).select("-password");
            }
            if (
              soloEvents[i].confirmedRegistrations &&
              soloEvents[i].confirmedRegistrations.length > 0 &&
              (soloEvents[i].confirmedRegistrations[0].lightWeight.includes(
                user._id.toString()
              ) ||
                soloEvents[i].confirmedRegistrations[0].lightWeight.includes(
                  `dummyRef: ${user._id.toString()}`
                ))
            ) {
              formattedSoloEvents[i].confirmedUsers.lightWeight.push(
                user.ccId ? user.ccId : user.ncpId
              );
            } else {
              formattedSoloEvents[i].userRegistrations.lightWeight.push(
                user.ccId ? user.ccId : user.ncpId
              );
            }
          }
        }
        // Is an otse user
        if (soloEvents[i].confirmedRegistrations.length > 0) {
          for (
            let j = 0;
            j < soloEvents[i].confirmedRegistrations[0].lightWeight.length;
            j++
          ) {
            let toBeFoundUser =
              soloEvents[i].confirmedRegistrations[0].lightWeight[j];
            let user = await otseUser.findById(toBeFoundUser);
            if (user) {
              formattedSoloEvents[i].confirmedUsers.lightWeight.push(
                user.otseId.toString()
              );
            }
          }
        }

        if (soloEvents[i].userRegistrations.length > 0) {
          for (
            let j = 0;
            j < soloEvents[i].userRegistrations[0].middleWeight.length;
            j++
          ) {
            let toBeFoundUser;
            if (
              soloEvents[i].userRegistrations[0].middleWeight[j]
                .toString()
                .includes("dummy")
            ) {
              toBeFoundUser = soloEvents[i].userRegistrations[0].middleWeight[j]
                .toString()
                .split(" ")[1];
            } else {
              toBeFoundUser =
                soloEvents[i].userRegistrations[0].middleWeight[j];
            }

            // Finding the user
            let user = await userThroughCC
              .findById(toBeFoundUser)
              .select(
                "-password -idProofURL -idProofARN -govtIdProofURL -govtIdProofARN -locked"
              );
            if (user) {
              user = await ccUser.findById(user.ccId).select("-password");
            }
            if (!user) {
              user = await ncpUser
                .findById(toBeFoundUser)
                .select(
                  "-password -idProofARN -idProofURL -govtIdProofARN -govtIdProofURL -locked"
                );
            }
            if (user === null) {
              user = await ccUser.findById(toBeFoundUser).select("-password");
            }
            if (
              soloEvents[i].confirmedRegistrations &&
              soloEvents[i].confirmedRegistrations.length > 0 &&
              (soloEvents[i].confirmedRegistrations[0].middleWeight.includes(
                user._id.toString()
              ) ||
                soloEvents[i].confirmedRegistrations[0].middleWeight.includes(
                  `dummyRef: ${user._id.toString()}`
                ))
            ) {
              formattedSoloEvents[i].confirmedUsers.middleWeight.push(
                user.ccId ? user.ccId : user.ncpId
              );
            } else {
              formattedSoloEvents[i].userRegistrations.middleWeight.push(
                user.ccId ? user.ccId : user.ncpId
              );
            }
          }
        }
        // Is an otse user
        if (soloEvents[i].confirmedRegistrations.length > 0) {
          for (
            let j = 0;
            j < soloEvents[i].confirmedRegistrations[0].middleWeight.length;
            j++
          ) {
            let toBeFoundUser =
              soloEvents[i].confirmedRegistrations[0].middleWeight[j];
            let user = await otseUser.findById(toBeFoundUser);
            if (user) {
              formattedSoloEvents[i].confirmedUsers.middleWeight.push(
                user.otseId.toString()
              );
            }
          }
        }

        if (soloEvents[i].userRegistrations.length > 0) {
          for (
            let j = 0;
            j < soloEvents[i].userRegistrations[0].heavyWeight.length;
            j++
          ) {
            let toBeFoundUser;
            if (
              soloEvents[i].userRegistrations[0].heavyWeight[j]
                .toString()
                .includes("dummy")
            ) {
              toBeFoundUser = soloEvents[i].userRegistrations[0].heavyWeight[j]
                .toString()
                .split(" ")[1];
            } else {
              toBeFoundUser = soloEvents[i].userRegistrations[0].heavyWeight[j];
            }
            // Finding the user
            let user = await userThroughCC
              .findById(toBeFoundUser)
              .select(
                "-password -idProofURL -idProofARN -govtIdProofURL -govtIdProofARN -locked"
              );
            if (user) {
              user = await ccUser.findById(user.ccId).select("-password");
            }
            if (!user) {
              user = await ncpUser
                .findById(toBeFoundUser)
                .select(
                  "-password -idProofARN -idProofURL -govtIdProofARN -govtIdProofURL -locked"
                );
            }
            if (user === null) {
              user = await ccUser.findById(toBeFoundUser).select("-password");
            }
            if (
              soloEvents[i].confirmedRegistrations &&
              soloEvents[i].confirmedRegistrations.length > 0 &&
              (soloEvents[i].confirmedRegistrations[0].heavyWeight.includes(
                user._id.toString()
              ) ||
                soloEvents[i].confirmedRegistrations[0].heavyWeight.includes(
                  `dummyRef: ${user._id.toString()}`
                ))
            ) {
              formattedSoloEvents[i].confirmedUsers.heavyWeight.push(
                user.ccId ? user.ccId : user.ncpId
              );
            } else {
              formattedSoloEvents[i].userRegistrations.heavyWeight.push(
                user.ccId ? user.ccId : user.ncpId
              );
            }
          }
        }
        // Is an otse user
        if (soloEvents[i].confirmedRegistrations.length > 0) {
          for (
            let j = 0;
            j < soloEvents[i].confirmedRegistrations[0].heavyWeight.length;
            j++
          ) {
            let toBeFoundUser =
              soloEvents[i].confirmedRegistrations[0].heavyWeight[j];
            let user = await otseUser.findById(toBeFoundUser);
            if (user) {
              formattedSoloEvents[i].confirmedUsers.heavyWeight.push(
                user.otseId.toString()
              );
            }
          }
        }
      } else {
        // Formatting the event
        formattedSoloEvents.push({
          eventId: soloEvents[i]._id,
          eventName: soloEvents[i].name,
          eventSlots: soloEvents[i].slots,
          eventConfirmedUsers: soloEvents[i].confirmedRegistrations,
          type: "solo",
          userRegistrations: [],
          confirmedUsers: [],
        });

        for (let j = 0; j < soloEvents[i].userRegistrations.length; j++) {
          // Finding the user
          let toBeFoundUser;
          if (soloEvents[i].userRegistrations[j].toString().includes("dummy")) {
            toBeFoundUser = soloEvents[i].userRegistrations[j]
              .toString()
              .split(" ")[1];
          } else {
            toBeFoundUser = soloEvents[i].userRegistrations[j];
          }
          let user = await userThroughCC
            .findById(toBeFoundUser)
            .select(
              "-password -idProofURL -idProofARN -govtIdProofURL -govtIdProofARN -locked"
            );
          if (user) {
            user = await ccUser.findById(user.ccId).select("-password");
          }
          if (!user) {
            user = await ncpUser
              .findById(toBeFoundUser)
              .select(
                "-password -idProofARN -idProofURL -govtIdProofARN -govtIdProofURL -locked"
              );
          }
          if (user === null) {
            user = await ccUser.findById(toBeFoundUser).select("-password");
          }
          if (
            soloEvents[i].confirmedRegistrations &&
            soloEvents[i].confirmedRegistrations.length > 0 &&
            (soloEvents[i].confirmedRegistrations.includes(
              user._id.toString()
            ) ||
              soloEvents[i].confirmedRegistrations.includes(
                `dummyRef: ${user._id.toString()}`
              ))
          ) {
            formattedSoloEvents[i].confirmedUsers.push(
              user.ccId ? user.ccId : user.ncpId
            );
          } else {
            formattedSoloEvents[i].userRegistrations.push(
              user.ccId ? user.ccId : user.ncpId
            );
          }
        }

        // Is an otse user
        for (let j = 0; j < soloEvents[i].confirmedRegistrations.length; j++) {
          let toBeFoundUser = soloEvents[i].confirmedRegistrations[j];
          let user = await otseUser.findById(toBeFoundUser);
          if (user) {
            formattedSoloEvents[i].confirmedUsers.push(user.otseId.toString());
          }
        }
      }
    }

    let formattedTeamEvents = [];
    for (let i = 0; i < teamEvents.length; i++) {
      formattedTeamEvents.push({
        eventId: teamEvents[i]._id,
        eventName: teamEvents[i].name,
        eventSlots: teamEvents[i].slots,
        eventConfirmedUsers: teamEvents[i].confirmedRegistrations,
        type: "team",
        userRegistrations: [],
        confirmedUsers: [],
      });
      for (let j = 0; j < teamEvents[i].userRegistrations.length; j++) {
        let user = await userThroughCC
          .findById(teamEvents[i].userRegistrations[j].registerer)
          .select(
            "-password -idProofURL -idProofARN -govtIdProofURL -govtIdProofARN -locked"
          );
        if (user) {
          user = await ccUser.findById(user.ccId).select("-password");
        }
        if (!user) {
          user = await ncpUser
            .findById(teamEvents[i].userRegistrations[j].registerer)
            .select(
              "-password -idProofARN -idProofURL -govtIdProofARN -govtIdProofURL -locked"
            );
        }
        if (user === null) {
          user = await ccUser
            .findById(teamEvents[i].userRegistrations[j].registerer)
            .select("-password");
        }
        if (
          teamEvents[i].confirmedRegistrations &&
          teamEvents[i].confirmedRegistrations.length > 0 &&
          teamEvents[i].confirmedRegistrations.find((user) => {
            return (
              user.teamName === teamEvents[i].userRegistrations[j].teamName ||
              user.registerer === teamEvents[i].userRegistrations[j].registerer
            );
          })
        ) {
          formattedTeamEvents[i].confirmedUsers.push({
            teamName: teamEvents[i].userRegistrations[j].teamName,
            user: user.ccId ? user.ccId : user.ncpId,
          });
        } else {
          formattedTeamEvents[i].userRegistrations.push({
            teamName: teamEvents[i].userRegistrations[j].teamName,
            user: user.ccId ? user.ccId : user.ncpId,
          });
        }
      }
      // Is an otse user
      for (let j = 0; j < teamEvents[i].confirmedRegistrations.length; j++) {
        let toBeFoundUser = teamEvents[i].confirmedRegistrations[j].registerer;
        let user = await otseUser.findById(toBeFoundUser);
        if (user) {
          formattedTeamEvents[i].confirmedUsers.push({
            teamName: teamEvents[i].confirmedRegistrations[j].teamName,
            user: user.otseId.toString(),
          });
        }
      }
    }

    // Returning the events
    return res.status(200).json({
      data: [...formattedSoloEvents, ...formattedTeamEvents],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Events
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Create Event  ( Only use for creation while feeding the DB )
exports.createEvent = async (req, res) => {
  try {
    // Required fields:
    // {
    //   name: String,
    //   description: String,
    //   type: String,
    //   slots: Number ( Object if event is Mr. and Ms. Kshitij or MMA),
    //   points: {
    //     firstPodium: Number,     All podiums should be same for Mr. and Ms. Kshitij
    //     secondPodium: Number,
    //     thirdPodium: Number,
    //     registration: Number,
    //     qualification: Number,
    //     npr: Number,
    //     npq: Number
    //   },
    //   eventPhaseType: String,
    //   date: Date
    // }

    const type = req.params.type;
    const eventData = req.body;

    // Checking if the event data is valid
    if (!createEventSchema.safeParse(eventData).success) {
      console.log(createEventSchema.safeParse(eventData).error);
      return res.status(400).json({ error: "Invalid event data" });
    }

    let eventModel;
    // Checking if the event name is already taken
    if (type === "SOLO") {
      const existingEvent = await soloEvent.findOne({
        $and: [{ name: eventData.name }, { deleted: false }],
      });
      if (existingEvent) {
        return res.status(400).json({ error: "Event name already taken" });
      }
      eventModel = soloEvent;
    } else {
      const existingEvent = await teamEvent.findOne({
        $and: [{ name: eventData.name }, { deleted: false }],
      });
      if (existingEvent) {
        return res.status(400).json({ error: "Event name already taken" });
      }
      eventModel = teamEvent;
    }

    // Creating the event
    const newEvent = await eventModel.create(eventData);

    // Returning the new event
    return res.status(200).json({
      message: "Event created successfully",
      data: {
        event: newEvent,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Update Event  ( Only use for updation while feeding the DB )
exports.updateEvent = async (req, res) => {
  try {
    // Required fields:
    // eventId: String,
    // eventData: {
    //   name: String,
    //   description: String,
    //   type: String,
    //   slots: Number ( Object if event is Mr. and Ms. Kshitij or MMA),
    //   points: {
    //     firstPodium: Number,
    //     secondPodium: Number,
    //     thirdPodium: Number,
    //     registration: Number,
    //     qualification: Number,
    //     npr: Number,
    //     npq: Number
    //   },
    //   eventPhaseType: String,
    //   date: Date
    // }

    const eventId = req.params.eventId;
    const eventData = req.body;
    console.log(eventId);
    console.log(eventData);

    // Checking if the event id is valid
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    // Checking if the event data is valid
    if (!updateEventSchema.safeParse(eventData).success) {
      return res.status(400).json({ error: "Invalid event data" });
    }

    // Checking if the event exists
    let isSolo = true;
    let event = await soloEvent.findOne({
      $and: [{ _id: eventId }, { deleted: false }],
    });
    if (!event) {
      isSolo = false;
      event = await teamEvent.findOne({
        $and: [{ _id: eventId }, { deleted: false }],
      });
    }
    // Event not found
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Dont allow if the event has already started
    if (event.status !== "UPCOMING") {
      return res.status(400).json({ error: "Event has already started" });
    }

    // Updating the event
    const updatedEvent = await (isSolo
      ? soloEvent
      : teamEvent
    ).findByIdAndUpdate(eventId, eventData, {
      new: true,
    });

    // Returning the updated event
    return res.status(200).json({
      message: "Event updated successfully",
      data: {
        event: updatedEvent,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Delete Event  ( Only use for deletion while feeding the DB )
exports.deleteEvent = async (req, res) => {
  try {
    // Required fields:
    // eventId: String

    const eventId = req.params.eventId;

    // Check if the event id is valid
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    let isSolo = true;
    // Finding the event
    let event = await soloEvent.findById(eventId);
    if (!event) {
      isSolo = false;
      event = await teamEvent.findById(eventId);
    }

    // Event not found
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Soft deleting the event
    event.deleted = true;
    await event.save();

    // Dont do anything about the points that are already awarded

    // Returning the deleted event
    return res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Get Event
exports.getEvent = async (req, res) => {
  try {
    // Required fields:
    // eventId: String

    const eventId = req.params.eventId;

    // Check if the event id is valid
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    // Finding the event
    let isSolo = true;
    let event = await soloEvent.findById(eventId);
    if (!event) {
      isSolo = false;
      event = await teamEvent.findById(eventId);
    }

    // Event not found
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Returning the event
    return res.status(200).json({
      message: "Event fetched successfully",
      data: {
        event: event,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Get All Events
exports.getAllEvents = async (req, res) => {
  try {
    // Required fields: None

    // Finding the events
    const teamEvents = await teamEvent.find({});
    const soloEvents = await soloEvent.find({});

    // Returning the events
    return res.status(200).json({
      message: "Events fetched successfully",
      data: { teamEvents, soloEvents },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Award points
exports.awardPoints = async (req, res) => {
  try {
    // Required Fields:
    // {
    //   userId: String,
    //   eventName: String,
    //   points: Enum String [ "firstPodium", "secondPodium", "thirdPodium",
    //     "qualification", "npr", "npq", "arbitraryPoints" ]
    //   arbitraryPoints: Number ( Only if points is "arbitraryPoints" )
    // }
    // TODO: Optional fields:
    //   sex: String ( Only if event is Mr. and Ms. Kshitij )
    //   weightCategory: String ( Only if event is MMA )

    const { userId, eventName, points } = req.body;
    const sex = req.body.sex;
    const weightCategory = req.body.weightCategory;

    // Checking if the userId and eventId are valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Checking if the points are valid
    if (!awardPointsSchema.safeParse(req.body).success) {
      return res.status(400).json({ error: "Invalid points" });
    }

    // Finding the user
    let isNCP = false;
    let user = await ccUser.findById(userId);
    if (!user) {
      isNCP = true;
      user = await ncpUser.findById(userId);
    }

    // Checking if the user was otse for the event
    let isOtse = false;
    if (!user) {
      isOtse = true;
      user = await otseUser.findById(userId);
    }

    // User not found
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Finding the event
    let isSolo = true;
    let event = await soloEvent.findOne({ name: eventName, deleted: false });
    if (!event) {
      isSolo = false;
      event = await teamEvent.findOne({ name: eventName, deleted: false });
    }

    // Event not found
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const eventId = event._id;

    // Checking if the user was otse for the event
    if (isOtse) {
      if (isSolo) {
        if (event.name === "Mr. and Ms. Kshitij") {
          isMale = event.confirmedRegistrations[0].male.includes(userId);
          isFemale = event.confirmedRegistrations[0].female.includes(userId);
          if (!isMale && !isFemale) {
            return res
              .status(400)
              .json({ error: "User was not confirmed for the event" });
          }
          if (isMale) {
            event.winners.male = userId;
          } else if (isFemale) {
            event.winners.female = userId;
          }
          await event.save();
          return res.status(200).json({
            message: `Points awarded to ${userId} successfully`,
          });
        } else if (event.name === "MMA") {
          if (!event.winners) {
            event.winners = {
              lightWeight: {
                first: null,
                second: null,
                third: null,
              },
              middleWeight: {
                first: null,
                second: null,
                third: null,
              },
              heavyWeight: {
                first: null,
                second: null,
                third: null,
              },
            };
          }
          isLightWeight =
            event.confirmedRegistrations[0].lightWeight.includes(userId);
          isMiddleWeight =
            event.confirmedRegistrations[0].middleWeight.includes(userId);
          isHeavyWeight =
            event.confirmedRegistrations[0].heavyWeight.includes(userId);
          if (!isLightWeight && !isMiddleWeight && !isHeavyWeight) {
            return res
              .status(400)
              .json({ error: "User was not confirmed for the event" });
          }
          if (isLightWeight) {
            event.winners.lightWeight[points] = userId;
          } else if (isMiddleWeight) {
            event.winners.middleWeight[points] = userId;
          } else if (isHeavyWeight) {
            event.winners.heavyWeight[points] = userId;
          }
          await event.save();
          return res.status(200).json({
            message: `Points awarded to ${userId} successfully`,
          });
        } else {
          // Creating the winners object if it doesn't exist
          if (!event.winners) {
            event.winners = {
              first: null,
              second: null,
              third: null,
            };
          }
          if (!event.confirmedRegistrations.includes(userId)) {
            return res
              .status(400)
              .json({ error: "User was not confirmed for the event" });
          }
          event.winners[points] = userId;
          await event.save();
          return res.status(200).json({
            message: `Points awarded to ${userId} successfully`,
          });
        }
      } else {
        let found = false;
        if (!event.winners) {
          event.winners = {
            first: null,
            second: null,
            third: null,
          };
        }
        event.confirmedRegistrations.forEach((registration) => {
          if (registration.registerer === userId) {
            found = true;
            if (points === "firstPodium") {
              event.winners.first = registration.teamName;
            } else if (points === "secondPodium") {
              event.winners.second = registration.teamName;
            } else if (points === "thirdPodium") {
              if (event.winners.third) {
                event.winners.third = registration.teamName;
              } else {
                return res
                  .status(400)
                  .json({ error: "Third podium not found" });
              }
            }
          }
        });

        if (!found) {
          return res
            .status(400)
            .json({ error: "User was not registered for the event" });
        }
        await event.save();
        return res.status(200).json({
          message: `Points awarded to ${userId} successfully`,
        });
      }
    }

    if (isNCP && isSolo) {
      // Check if the user actually participated in that event through the confirmed list
      if (event.name === "Mr. and Ms. Kshitij") {
        isMale = event.confirmedRegistrations[0].male.includes(userId);
        isFemale = event.confirmedRegistrations[0].female.includes(userId);
        // Creating the winners object if it doesn't exist
        if (!event.winners) {
          event.winners = {
            male: null,
            female: null,
          };
        }
        // Award points
        if (isMale) {
          event.winners.male = userId;
        } else if (isFemale) {
          event.winners.female = userId;
        }
        await event.save();
        return res.status(200).json({
          message: `Points awarded to ${userId} successfully`,
        });
      } else if (event.name === "MMA") {
        let isLightWeight =
          event.confirmedRegistrations[0]["lightWeight"].includes(userId);
        let isMiddleWeight =
          event.confirmedRegistrations[0]["middleWeight"].includes(userId);
        let isHeavyWeight =
          event.confirmedRegistrations[0]["heavyWeight"].includes(userId);
        if (!event.winners) {
          event.winners = {
            lightWeight: {
              first: null,
              second: null,
              third: null,
            },
            middleWeight: {
              first: null,
              second: null,
              third: null,
            },
            heavyWeight: {
              first: null,
              second: null,
              third: null,
            },
          };
        }
        if (isLightWeight) {
          event.winners.lightWeight[points] = userId;
        } else if (isMiddleWeight) {
          event.winners.middleWeight[points] = userId;
        } else if (isHeavyWeight) {
          if (isHeavyWeight) {
            event.winners.heavyWeight[points] = userId;
          }
          await event.save();
          return res.status(200).json({
            message: `Points awarded to ${userId} successfully`,
          });
        }
      } else {
        let found = false;
        for (let i = 0; i < event.confirmedRegistrations.length; i++) {
          if (event.confirmedRegistrations[i] === userId) {
            found = true;
            break;
          }
        }

        if (!found) {
          return res.status(400).json({
            error: `User ${user.ncpId} not found to be confirmed for the event to award points.`,
          });
        }

        if (!event.winners) {
          event.winners = {
            first: null,
            second: null,
            third: null,
          };
        }

        if (pointsType === "firstPodium") {
          event.winners.first = user.ncpId;
        }
        if (pointsType === "secondPodium") {
          event.winners.second = user.ncpId;
        }
        if (pointsType === "thirdPodium") {
          if (event.winners.third) {
            event.winners.third = user.ncpId;
          } else {
            return res.status(400).json({
              ...clientErrors[400],
              error: "Third podium not found.",
            });
          }
        }
        await event.save();
        return res.status(200).json({
          message: `Points awarded to ${user.ncpId} successfully`,
        });
      }
    } else if (isNCP && !isSolo) {
      // Check if the user actually participated in that event through the confirmed list
      let found = false;
      let teamName;
      for (let i = 0; i < event.confirmedRegistrations.length; i++) {
        if (event.confirmedRegistrations[i].registerer === userId) {
          found = true;
          teamName = event.confirmedRegistrations[i].teamName;
          break;
        }
      }
      if (!found) {
        return res.status(400).json({
          ...clientErrors[400],
          error:
            "User not found to be confirmed for the event to award points.",
        });
      }

      if (!event.winners) {
        event.winners = {
          first: null,
          second: null,
          third: null,
        };
      }
      if (pointsType === "firstPodium") {
        event.winners.first = teamName;
      }
      if (pointsType === "secondPodium") {
        event.winners.second = teamName;
      }
      if (pointsType === "thirdPodium") {
        if (event.winners.third) event.winners.third = teamName;
        else {
          return res.status(400).json({
            ...clientErrors[400],
            error: "Third podium not found.",
          });
        }
      }

      // Return the response
      return res.status(200).json({
        message: `Points awarded to ${teamName} successfully`,
      });
    } else if (!isNCP && isSolo) {
      // Check if the user actually participated in that event through the registeredSolos list
      if (["firstPodium", "secondPodium", "thirdPodium"].includes(points)) {
        if (event.name === "Mr. and Ms. Kshitij") {
          if (!event.winners) {
            event.winners = {
              male: null,
              female: null,
            };
          }
          for (let i = 0; i < user.registeredSolos.length; i++) {
            if (
              user.registeredSolos[i].eventId === eventId &&
              user.registeredSolos[i].confirmed &&
              user.registeredSolos[i].sex.toString().toLowerCase() ===
                sex.toString().toLowerCase()
            ) {
              event.winners[sex] = user.ccId;
              await event.save();
              user.points += event.points["firstPodium"];
              await user.save();
              return res.status(200).json({
                message: `Points awarded to ${user.ccId} successfully`,
              });
            }
          }

          return res.status(400).json({
            error: `User ${user.ccId} not found to be confirmed for the event to award points.`,
          });
        } else if (event.name === "MMA") {
          if (!event.winners) {
            event.winners = {
              lightWeight: {
                first: null,
                second: null,
                third: null,
              },
              middleWeight: {
                first: null,
                second: null,
                third: null,
              },
              heavyWeight: {
                first: null,
                second: null,
                third: null,
              },
            };
          }

          // Check if the user actually participated in that event through the registeredSolos list
          for (let i = 0; i < user.registeredSolos.length; i++) {
            if (
              user.registeredSolos[i].eventId === eventId &&
              user.registeredSolos[i].confirmed &&
              user.registeredSolos[i].weightCategory
                .toString()
                .toLowerCase() === weightCategory.toString().toLowerCase()
            ) {
              event.winners[weightCategory][points] = user.ccId;
              user.ccId;
              await event.save();
              user.points += event.points[points];
              await user.save();
              return res.status(200).json({
                message: `Points awarded to ${user.ccId} successfully`,
              });
            }
          }

          return res.status(400).json({
            error: `User ${user.ccId} not found to be confirmed for the event to award points.`,
          });
        } else {
          if (!event.winners) {
            event.winners = {
              first: null,
              second: null,
              third: null,
            };
          }
          for (let i = 0; i < user.registeredSolos.length; i++) {
            if (
              user.registeredSolos[i].eventId === eventId &&
              user.registeredSolos[i].confirmed
            ) {
              if (pointsType === "firstPodium") {
                event.winners.first = user.ccId;
              }
              if (pointsType === "secondPodium") {
                event.winners.second = user.ccId;
              }
              if (pointsType === "thirdPodium") {
                if (event.winners.third) event.winners.third = user.ccId;
                else {
                  return res.status(400).json({
                    ...clientErrors[400],
                    error: "Third podium not found.",
                  });
                }
              }

              // Return the response
              await event.save();
              user.points += event.points[points];
              await user.save();
              return res.status(200).json({
                message: `Points awarded to ${user.ccId} successfully`,
              });
            }
          }

          return res.status(400).json({
            error: `User ${user.ccId} not found to be confirmed for the event to award points.`,
          });
        }
      } else {
        // Qualification, NPR, NPQ
        if (points === "arbitraryPoints")
          user.points += req.body.arbitraryPoints;
        else if (points === "npr") user.points -= event.points["npr"];
        else if (points === "npq") user.points -= event.points["npq"];
        else user.points += event.points[points];
        await user.save();
        return res.status(200).json({
          message: `${event.points[points]} points awarded to ${user.ccId} successfully`,
        });
      }
    } else if (!isNCP && !isSolo) {
      // Check if the user actually participated in that event through the registeredTeams list
      if (["firstPodium", "secondPodium", "thirdPodium"].includes(points)) {
        if (!event.winners) {
          event.winners = {
            first: null,
            second: null,
            third: null,
          };
        }
        for (let i = 0; i < user.registeredTeams.length; i++) {
          if (
            user.registeredTeams[i].eventId === eventId &&
            user.registeredTeams[i].confirmed
          ) {
            if (points === "firstPodium") {
              event.winners.first = user.registeredTeams[i].teamName;
              await event.save();
              user.points += event.points[points];
              await user.save();
              return res.status(200).json({
                message: `Points awarded to ${user.registeredTeams[i].teamName} successfully`,
              });
            } else if (points === "secondPodium") {
              event.winners.second = user.registeredTeams[i].teamName;
              await event.save();
              user.points += event.points[points];
              await user.save();
              return res.status(200).json({
                message: `Points awarded to ${user.registeredTeams[i].teamName} successfully`,
              });
            } else if (points === "thirdPodium") {
              if (event.winners.third) {
                event.winners.third = user.registeredTeams[i].teamName;
                await event.save();
                user.points += event.points[points];
                await user.save();
                return res.status(200).json({
                  message: `Points awarded to ${user.registeredTeams[i].teamName} successfully`,
                });
              } else {
                return res.status(400).json({
                  ...clientErrors[400],
                  error: "Third podium not found.",
                });
              }
            }
          }
        }
      } else {
        // Qualification, NPR, NPQ
        if (points === "arbitraryPoints")
          user.points += req.body.arbitraryPoints;
        else if (points === "npr") user.points -= event.points["npr"];
        else if (points === "npq") user.points -= event.points["npq"];
        else user.points += event.points[points];
        await user.save();
        return res.status(200).json({
          message: `${event.points[points]} points awarded to ${user.ccId} successfully`,
        });
      }
      return res.status(400).json({
        error: `User ${user.ccId} not found to be confirmed for the event to award points.`,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Wont be used
// // Get users for each event for awarding points
// exports.getUsersForAwardingPoints = async (req, res) => {
//   try {
//     // Required fields: None

//     // Finding all the events
//     let soloEvents = await soloEvent.find({});
//     let teamEvents = await teamEvent.find({});

//     // Formatting the events
//     let formattedSoloEvents = [];
//     for (let i = 0; i < soloEvents.length; i++) {
//       if (soloEvents[i].name === "Mr. and Ms. Kshitij") {
//         // Formatting the event
//         formattedSoloEvents.push({
//           eventId: soloEvents[i]._id,
//           confirmedRegistrations: {
//             male: [],
//             female: [],
//           },
//         });
//         if (soloEvents[i].confirmedRegistrations.length > 0) {
//           for (
//             let j = 0;
//             j < soloEvents[i].confirmedRegistrations[0].male.length;
//             j++
//           ) {
//             // Finding the user
//             let user = await userThroughCC
//               .findById(soloEvents[i].confirmedRegistrations[0].male[j])
//               .select("-password idProofURL idProofARN locked");
//             if (user) {
//               user = await ccUser.findById(user.ccId).select("-password");
//             }
//             if (!user) {
//               user = await ncpUser
//                 .findById(soloEvents[i].confirmedRegistrations[0].male[j])
//                 .select("-password idProofARN idProofURL locked");
//             }
//             if (!user) {
//               user = await otseUser.findById(
//                 soloEvents[i].confirmedRegistrations[0].male[j]
//               );
//             }
//             formattedSoloEvents[i].confirmedRegistrations.male.push(user);
//           }
//         }

//         if (soloEvents[i].confirmedRegistrations.length > 0) {
//           for (
//             let j = 0;
//             j < soloEvents[i].confirmedRegistrations[0].female.length;
//             j++
//           ) {
//             // Finding the user
//             let user = await userThroughCC
//               .findById(soloEvents[i].confirmedRegistrations[0].female[j])
//               .select("-password idProofURL idProofARN locked");
//             if (user) {
//               user = await ccUser.findById(user.ccId).select("-password");
//             }
//             if (!user) {
//               user = await ncpUser
//                 .findById(soloEvents[i].confirmedRegistrations[0].female[j])
//                 .select("-password idProofARN idProofURL locked");
//             }
//             if (!user) {
//               user = await otseUser.findById(
//                 soloEvents[i].confirmedRegistrations[0].female[j]
//               );
//             }
//             formattedSoloEvents[i].confirmedRegistrations.female.push(user);
//           }
//         }
//       } else if (soloEvents[i].name === "MMA") {
//         // Formatting the event
//         formattedSoloEvents.push({
//           eventId: soloEvents[i]._id,
//           confirmedRegistrations: {
//             lightWeight: [],
//             middleWeight: [],
//             heavyWeight: [],
//           },
//         });

//         if (soloEvents[i].confirmedRegistrations.length > 0) {
//           for (
//             let j = 0;
//             j < soloEvents[i].confirmedRegistrations[0].lightWeight.length;
//             j++
//           ) {
//             // Finding the user
//             let user = await userThroughCC
//               .findById(soloEvents[i].confirmedRegistrations[0].lightWeight[j])
//               .select("-password idProofURL idProofARN locked");
//             if (user) {
//               user = await ccUser.findById(user.ccId).select("-password");
//             }
//             if (!user) {
//               user = await ncpUser
//                 .findById(
//                   soloEvents[i].confirmedRegistrations[0].lightWeight[j]
//                 )
//                 .select("-password idProofARN idProofURL locked");
//             }
//             if (!user) {
//               user = await otseUser.findById(
//                 soloEvents[i].confirmedRegistrations[0].lightWeight[j]
//               );
//             }
//             formattedSoloEvents[i].confirmedRegistrations.lightWeight.push(
//               user
//             );
//           }
//         }

//         if (soloEvents[i].confirmedRegistrations.length > 0) {
//           for (
//             let j = 0;
//             j < soloEvents[i].confirmedRegistrations[0].middleWeight.length;
//             j++
//           ) {
//             // Finding the user
//             let user = await userThroughCC
//               .findById(soloEvents[i].confirmedRegistrations[0].middleWeight[j])
//               .select("-password idProofURL idProofARN locked");
//             if (user) {
//               user = await ccUser.findById(user.ccId).select("-password");
//             }
//             if (!user) {
//               user = await ncpUser
//                 .findById(
//                   soloEvents[i].confirmedRegistrations[0].middleWeight[j]
//                 )
//                 .select("-password idProofARN idProofURL locked");
//             }
//             if (!user) {
//               user = await otseUser.findById(
//                 soloEvents[i].confirmedRegistrations[0].middleWeight[j]
//               );
//             }
//             formattedSoloEvents[i].confirmedRegistrations.middleWeight.push(
//               user
//             );
//           }
//         }

//         if (soloEvents[i].confirmedRegistrations.length > 0) {
//           for (
//             let j = 0;
//             j < soloEvents[i].confirmedRegistrations[0].heavyWeight.length;
//             j++
//           ) {
//             // Finding the user
//             let user = await userThroughCC
//               .findById(soloEvents[i].confirmedRegistrations[0].heavyWeight[j])
//               .select("-password idProofURL idProofARN locked");
//             if (user) {
//               user = await ccUser.findById(user.ccId).select("-password");
//             }
//             if (!user) {
//               user = await ncpUser
//                 .findById(
//                   soloEvents[i].confirmedRegistrations[0].heavyWeight[j]
//                 )
//                 .select("-password idProofARN idProofURL locked");
//             }
//             if (!user) {
//               user = await otseUser.findById(
//                 soloEvents[i].confirmedRegistrations[0].heavyWeight[j]
//               );
//             }
//             formattedSoloEvents[i].confirmedRegistrations.heavyWeight.push(
//               user
//             );
//           }
//         }
//       } else {
//         // Formatting the event
//         formattedSoloEvents.push({
//           eventId: soloEvents[i]._id,
//           confirmedRegistrations: [],
//         });

//         for (let j = 0; j < soloEvents[i].confirmedRegistrations.length; j++) {
//           // Finding the user
//           let user = await userThroughCC
//             .findById(soloEvents[i].confirmedRegistrations[j])
//             .select("-password idProofURL idProofARN locked");
//           if (!user) {
//             user = await ncpUser
//               .findById(soloEvents[i].confirmedRegistrations[j])
//               .select("-password idProofARN idProofURL locked");
//           }
//           if (!user) {
//             user = await otseUser.findById(
//               soloEvents[i].confirmedRegistrations[j]
//             );
//           }
//           formattedSoloEvents[i].confirmedRegistrations.push(user);
//         }
//       }
//     }
//     let formattedTeamEvents = [];
//     for (let i = 0; i < teamEvents.length; i++) {
//       formattedTeamEvents.push({
//         eventId: teamEvents[i]._id,
//         confirmedRegistrations: [],
//       });
//       for (let j = 0; j < teamEvents[i].confirmedRegistrations.length; j++) {
//         let user = await userThroughCC
//           .findById(teamEvents[i].confirmedRegistrations[j].registerer)
//           .select("-password idProofURL idProofARN locked");
//         if (!user) {
//           user = await ncpUser
//             .findById(teamEvents[i].confirmedRegistrations[j].registerer)
//             .select("-password idProofARN idProofURL locked");
//         }
//         if (!user) {
//           user = await otseUser.findById(
//             teamEvents[i].confirmedRegistrations[j].registerer
//           );
//         }
//         formattedTeamEvents[i].confirmedRegistrations.push({
//           teamName: teamEvents[i].confirmedRegistrations[j].teamName,
//           user,
//         });
//       }
//     }

//     // Returning the events
//     return res.status(200).json({
//       data: [...formattedSoloEvents, ...formattedTeamEvents],
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ error: error.message });
//   }
// };

// Bets
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Create Bet
exports.createBet = async (req, res) => {
  try {
    // Required Fields : userId, eventId, amount
    const { ccId, eventName, amount, category } = req.body;

    // Checking if the bet data is valid
    if (!betSchema.safeParse({ ccId, eventName, amount, category }).success) {
      return res.status(400).json({
        error: "Invalid bet data",
      });
    }

    // Finding the user
    let user = await ccUser.findOne({ ccId: ccId });

    // User not found
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Check if the user is deleted
    if (user.deleted) {
      return res.status(404).json({ error: "User account is deleted" });
    }

    // Check if the user is rejected
    if (user.verified === "REJECTED") {
      return res.status(401).json({ error: "User is rejected by the admin" });
    }

    // Finding the event
    let isSolo = true;
    let event = await soloEvent.findOne({
      $and: [{ name: eventName }, { deleted: false }],
    });
    if (!event) {
      isSolo = false;
      event = await teamEvent.findOne({
        $and: [{ name: eventName }, { deleted: false }],
      });
    }

    // Event not found
    if (!event) {
      return res.status(404).json({
        error: "Event not found",
      });
    }

    // Checking if the user is registered for the event
    if (isSolo) {
      let registeredEvent = user.registeredSolos.find((registeredEvent) => {
        return registeredEvent.eventId.toString() === event._id.toString();
      });
      if (!registeredEvent) {
        return res.status(400).json({
          error: "User is not registered for the event to bet on it",
        });
      }
    } else {
      let registeredEvent = user.registeredTeams.find((registeredEvent) => {
        return registeredEvent.eventId.toString() === event._id.toString();
      });
      if (!registeredEvent) {
        return res.status(400).json({
          error: "User is not registered for the event to bet on it",
        });
      }
    }

    // Checking if the amount is valid
    if (amount >= 50) {
      if (amount > 300 || amount % 10 !== 0) {
        return res.status(400).json({
          error: "Invalid amount",
        });
      }
    }

    // Checking if the event is ongoing
    if (event.status === "ONGOING") {
      return res.status(400).json({
        error: "Event has already started",
      });
    }

    // Checking if the user can bet on the type of event
    const bets = await betModel.find({
      userId: user.ccId,
      eventType: event.type,
    });
    console.log(bets);
    if (event.type === "FLAGSHIP") {
      if (bets.length >= 1) {
        return res.status(400).json({
          error: "User has reached the limit for FLAGSHIP bets.",
        });
      }
    } else if (event.type === "POPULAR") {
      if (bets.length >= 2) {
        return res.status(400).json({
          error: "User has reached the limit for POPULAR bets.",
        });
      }
    } else if (event.type === "OTHERS") {
      if (bets.length >= 3) {
        return res.status(400).json({
          error: "User has reached the limit for OTHERS bets.",
        });
      }
    }

    // Creating the new bet
    let newBet = await betModel.create({
      userId: user.ccId,
      eventId: event._id,
      eventType: event.type,
      amount: amount,
    });

    if (category) {
      newBet.category = category;
      await newBet.save();
    }

    let formattedBet = {
      type: newBet.eventType,
      eventType: isSolo ? "SOLO" : "TEAM",
      amount: newBet.amount,
      eventName: event.name,
      user: newBet.userId,
      _id: newBet._id,
      category: newBet.category,
    };

    res.status(200).json({
      message: "Betted on event successfully",
      data: {
        bet: formattedBet,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// Get All Bets
exports.getAllBets = async (req, res) => {
  try {
    // Required fields: None

    // Finding all the bets
    const bets = await betModel.find();

    // Formatting the bets
    const formattedBets = [];
    for (let i = 0; i < bets.length; i++) {
      let isSolo = true;
      let event = await soloEvent.findById(bets[i].eventId);
      if (!event) {
        isSolo = false;
        event = await teamEvent.findById(bets[i].eventId);
      }
      formattedBets.push({
        type: bets[i].eventType,
        eventType: isSolo ? "SOLO" : "TEAM",
        amount: bets[i].amount,
        eventName: event.name,
        user: bets[i].userId,
        _id: bets[i]._id,
        category: bets[i].category,
      });
    }
    // Returning the bets
    return res.status(200).json({
      data: { bets: formattedBets },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Get Bet by userId
exports.getBetByUserId = async (req, res) => {
  try {
    // Required fields: userId

    const { userId } = req.params;

    // Checking if the userId is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Finding the bets
    const bets = await betModel.find({ userId: userId });

    // Returning the bets
    return res.status(200).json({
      data: { bets },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

// Admins
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Can only create admins once logged in
// Super admins can create admins of any type
// Admins can create heads and members
// Members cannot create anyone
exports.createAdmin = async (req, res) => {
  try {
    // Required fields:
    // _id: String,
    // registerData = {
    //     adminId: String,
    //     password: String,
    //     type: ["ADMIN", "HEAD", "MEMBER"]
    // }

    // Check the current admin's id and type
    const currentAdminId = req.body._id;

    // Check if the admin id is valid
    if (!mongoose.Types.ObjectId.isValid(currentAdminId)) {
      console.log(currentAdminId);
      return res.status(400).json({ error: "Invalid admin ID" });
    }

    // Check if the admin exists
    const admin = await Admin.findById(currentAdminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Check if the admin is able to create other admins
    const currentAdminType = admin.type;
    if (!permissions[currentAdminType]) {
      return res.status(403).json({ error: "Unauthorized to create admins" });
    }

    // Check if the current admin can create the specified type of admin
    const { adminId, password, type } = req.body.registerData;
    if (!permissions[currentAdminType].includes(type)) {
      return res
        .status(403)
        .json({ error: "Unauthorized to create this type of admin" });
    }

    // Check if the adminId is already taken
    const existingAdmin = await Admin.findOne({ adminId });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin ID already taken" });
    }

    // Hash the password
    const hashedPassword = await argon2id({
      password,
      ...hashOptions,
    });

    // Create the admin
    const newAdmin = await Admin.create({
      adminId,
      password: hashedPassword,
      type,
    });

    // Return the new admin
    return res.status(200).json({
      message: "Admin created successfully",
      data: {
        adminId: newAdmin.adminId,
        type: newAdmin.type,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    // Required fields:
    // _id: String,
    // resetData  {
    //     adminId: String,
    //     password: String
    // }
    const { _id, resetData } = req.body;

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ error: "Invalid admin ID" });
    }

    const { adminId, password } = resetData;

    if (!adminId || !password) {
      return res
        .status(400)
        .json({ error: "adminId and password are required" });
    }

    // Find the to be reset admin
    const toResetAdmin = await Admin.findOne({ adminId });
    if (!toResetAdmin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Check the type of current admin
    const currentAdmin = await Admin.findById(_id);
    if (!currentAdmin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Check if the admin has the permission to reset password
    const currentAdminType = currentAdmin.type;
    if (!permissions[currentAdminType].includes(toResetAdmin.type)) {
      return res.status(403).json({ error: "Unauthorized to reset password" });
    }

    // Hash the password
    const hashedPassword = await argon2id(password, hashOptions);

    // Update the admin
    await Admin.findByIdAndUpdate(toResetAdmin._id, {
      password: hashedPassword,
    });

    // Return the updated admin
    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
