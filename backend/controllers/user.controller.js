// Dependencies
const mongoose = require("mongoose");

// Local imports
// Models
const { ccUser, ncpUser, userThroughCC } = require("../models/user.model");
const { soloEvent, teamEvent } = require("../models/event.model");
const betModel = require("../models/bet.model");
// Utils
const { sendEmailWithRetry } = require("../utils/apis/emailerConfig");

// S3
const { s3Upload } = require("../utils/apis/s3");

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
        .select("-password -idProofARN -idProofURL -otp -otpExpiration");
      isNCP = true;
    }

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
              verified: participant.verified === "VERIFIED" ? true : false,
              sex: solo.sex,
            });
          } else if (event.name === "MMA") {
            data.registeredSolos.push({
              eventName: event.name,
              participant: `${participant.firstName} ${participant.lastName}`,
              confirmed: solo.confirmed,
              verified: participant.verified === "VERIFIED" ? true : false,
              weightCategory: solo.weightCategory,
            });
          } else {
            data.registeredSolos.push({
              eventName: event.name,
              participant: `${participant.firstName} ${participant.lastName}`,
              confirmed: solo.confirmed,
              verified: participant.verified === "VERIFIED" ? true : false,
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

exports.getAllEvents = async (req, res) => {
  try {
    // Required Fields : userId
    const { userId } = req.params;

    // Checking if the userId is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: "Invalid userId",
      });
    }

    // Find the user
    let isNCP = false;
    let user = await ccUser.findById(userId).select("-password");
    if (!user) {
      user = await ncpUser.findById(userId).select("-password");
      isNCP = true;
    }

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

    // Getting all the events that the user is registered for
    let registeredSoloEvents = [];
    let registeredTeamEvents = [];
    if (!isNCP) {
      // Fetching the registered solo events
      registeredSoloEvents = user.registeredSolos.map((solo) => solo.eventId);
      // Fetching the registered team events
      registeredTeamEvents = user.registeredTeams.map((team) => team.eventId);
    } else {
      // Fetching the registered solo events
      registeredSoloEvents = await soloEvent.find({
        userRegistrations: { $in: [userId] },
      });
      registeredSoloEvents = registeredSoloEvents.map((event) => event._id);
      // Fetching the registered team events
      registeredTeamEvents = await teamEvent.find({
        $or: [
          { "userRegistrations.registerer": userId },
          { "userRegistrations.teamMembers": { $in: [userId] } },
          { "userRegistrations.npaMembers": { $in: [userId] } },
        ],
      });
      registeredTeamEvents = registeredTeamEvents.map((event) => event._id);
    }

    // Fetching all the events
    const soloEvents = await soloEvent
      .find({
        _id: { $nin: registeredSoloEvents },
        deleted: false,
      })
      .select(
        "-slots -userRegistrations -confirmedRegistrations -points -winners -eventPhaseType"
      );
    const teamEvents = await teamEvent
      .find({
        _id: { $nin: registeredTeamEvents },
        deleted: false,
      })
      .select(
        "-slots -userRegistrations -confirmedRegistrations -points -winners -eventPhaseType"
      );

    res.status(200).json({
      message: "Fetched all events successfully",
      data: {
        soloEvents: soloEvents,
        teamEvents: teamEvents,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

exports.registerForSoloEvent = async (req, res) => {
  try {
    // Required Fields :
    // {
    //   userId,
    //   eventId
    // }
    const { userId, eventId } = req.body;
    // Optional Fields :
    // {
    //   userThroughCCData, // If the user is a CC user (For all events)
    //  Keep all fields "" if the user is a dummy entry
    //   userThroughCCData = {
    //     firstName: "",
    //     lastName: "",
    //     email: "",
    //     phoneNumber: "",
    //   }
    //   NCPData // If the user is a NCP user (Only for events like Mr. and Ms. Kshitij and MMA)
    //   {
    //     sex: "", // Only for Mr. and Ms. Kshitij
    //     weightCategory: "" // Only for MMA
    //   }
    // }
    let userThroughCCData = req.body.userThroughCCData;
    let NCPData = req.body.NCPData;

    // Checking if the userId and eventId are valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: "Invalid user ID",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        error: "Invalid event ID",
      });
    }

    // Find the user
    let isNCP = true;
    let user = await ncpUser.findById(userId).select("-password");

    if (!user) {
      user = await ccUser.findById(userId).select("-password");
      isNCP = false;
    }
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
    const event = await soloEvent.findOne({
      $and: [{ _id: eventId }, { deleted: { $ne: true } }],
    });
    // Event not found
    if (!event) {
      return res.status(404).json({
        error: "Event not found",
      });
    }

    if (event.name === "MMA" || event.name === "Mr. and Ms. Kshitij") {
      if (isNCP) {
        if (!NCPData) {
          return res.status(400).json({
            error: "Send proper NCP data",
          });
        }
      } else {
        if (!userThroughCCData) {
          return res.status(400).json({
            error: "Send proper CC data",
          });
        }
      }
    } else {
      if (!isNCP) {
        if (!userThroughCCData) {
          return res.status(400).json({
            error: "Send proper CC data",
          });
        }
      }
    }

    // Checking if the event registration time has ended
    if (new Date(event.date).toISOString() < new Date().toISOString()) {
      return res.status(400).json({
        error: "Event registration time has ended",
      });
    }

    // Checking if the user is already registered for the event
    if (!isNCP) {
      // Checking if the event is Mr. and Ms. Kshitij
      if (event.name === "Mr. and Ms. Kshitij") {
        const registeredSolos = user.registeredSolos.filter(
          (solo) => solo.eventId.toString() === eventId.toString()
        );

        if (registeredSolos.length > 0) {
          for (let i = 0; i < registeredSolos.length; i++) {
            const gender = userThroughCCData.sex;
            const isAlreadyRegistered = event.userRegistrations[0]?.[
              gender
            ]?.includes(registeredSolos[i].userId.toString());
            if (isAlreadyRegistered) {
              return res.status(400).json({
                error:
                  "User already registered for the Mr. and Ms. Kshitij event in this gender",
              });
            }
          }
        }
      }

      // Checking if the event is MMA
      else if (event.name === "MMA") {
        const registeredSolos = user.registeredSolos.filter(
          (solo) => solo.eventId.toString() === eventId.toString()
        );
        if (registeredSolos.length > 0) {
          for (let i = 0; i < registeredSolos.length; i++) {
            const isAlreadyRegistered = event.userRegistrations[0]?.[
              userThroughCCData.weightCategory
            ]?.includes(registeredSolos[i].userId);
            if (isAlreadyRegistered) {
              return res.status(400).json({
                error:
                  "User already registered for the MMA event in this weight category",
              });
            }
          }
        }
      } else {
        // Checking if the user is already registered for any other event
        const registeredSolos = user.registeredSolos.filter(
          (solo) => solo.eventId.toString() === eventId.toString()
        );
        if (registeredSolos.length > 0) {
          for (let i = 0; i < registeredSolos.length; i++) {
            if (event.userRegistrations.includes(registeredSolos[i].userId)) {
              return res.status(400).json({
                error: `User already registered for the ${event.name} event`,
              });
            }
          }
        }
      }
    } else {
      // Check if event is Mr. and Ms. Kshitij
      if (event.name === "Mr. and Ms. Kshitij") {
        if (event.userRegistrations.length === 0) {
          event.userRegistrations = [
            {
              male: [],
              female: [],
            },
          ];
        }
        event.markModified("userRegistrations");
        await event.save();
        const isAlreadyRegistered =
          event.userRegistrations[0]?.["male"]?.includes(userId) ||
          event.userRegistrations[0]?.["female"]?.includes(userId);
        if (isAlreadyRegistered) {
          return res.status(400).json({
            error: `User already registered for the Mr. and Ms. Kshitij event`,
          });
        }
      } else if (event.name === "MMA") {
        if (event.userRegistrations.length === 0) {
          event.userRegistrations = [
            {
              lightWeight: [],
              middleWeight: [],
              heavyWeight: [],
            },
          ];
        }
        event.markModified("userRegistrations");
        await event.save();
        const isAlreadyRegistered =
          event.userRegistrations[0]?.["lightWeight"]?.includes(userId) ||
          event.userRegistrations[0]?.["middleWeight"]?.includes(userId) ||
          event.userRegistrations[0]?.["heavyWeight"]?.includes(userId);
        if (isAlreadyRegistered) {
          return res.status(400).json({
            error: `User already registered for the MMA event.`,
          });
        }
      }
      // Checking if the user is already registered for event
      else {
        const isAlreadyRegistered = event.userRegistrations.includes(userId);
        if (isAlreadyRegistered) {
          return res.status(400).json({
            error: `User already registered for the ${event.name} event`,
          });
        }
      }
    }

    // Registering the user for the event
    if (!isNCP) {
      // Allowing dummy entries
      let newUserThroughCC = {
        _id: "dummyRef: " + userId,
      };

      // Checking if the user is not a dummy entry
      if (
        !(
          userThroughCCData.firstName === "" &&
          userThroughCCData.lastName === "" &&
          userThroughCCData.email === "" &&
          userThroughCCData.phoneNumber === ""
        )
      ) {
        if (!req.file) {
          return res.status(400).json({
            error: "Id proof is required",
          });
        }
        userThroughCCData.idProof = req.files.idProof[0];
        userThroughCCData.govtIdProof = req.files.govtIdProof[0];
        // Checking if the user already exists
        newUserThroughCC = await userThroughCC.findOne({
          ccId: userId,
          firstName: userThroughCCData.firstName,
          lastName: userThroughCCData.lastName,
          email: userThroughCCData.email,
          phoneNumber: userThroughCCData.phoneNumber,
        });
        // If the user does not exists
        if (!newUserThroughCC) {
          // Creating the user through CC
          // Uploading the id proof and govtIdProof
          const idProofARN = await s3Upload(userThroughCCData.idProof);
          const govtIdProofARN = await s3Upload(userThroughCCData.govtIdProof);
          const idProofType = userThroughCCData.idProof.mimetype;
          const govtIdProofType = userThroughCCData.govtIdProof.mimetype;

          // Check if email and phone number are valid
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userThroughCCData.email)) {
            return res.status(400).json({
              error: "Invalid  email",
            });
          }
          if (!/^[6-9]\d{9}$/.test(userThroughCCData.phoneNumber)) {
            return res.status(400).json({
              error: "Invalid phone number",
            });
          }
          newUserThroughCC = await userThroughCC.create({
            ccId: userId,
            firstName: userThroughCCData.firstName,
            lastName: userThroughCCData.lastName,
            email: userThroughCCData.email,
            phoneNumber: userThroughCCData.phoneNumber,
            idProofARN,
            idProofType: {
              fileType: idProofType,
              url: null,
              timeTillExpiry: null,
            },
            govtIdProofARN,
            govtIdProofType: {
              fileType: govtIdProofType,
              url: null,
              timeTillExpiry: null,
            },
          });
        }
      }

      // If the event is Mr. and Ms. Kshitij
      if (event.name === "Mr. and Ms. Kshitij") {
        if (
          !userThroughCCData.sex ||
          (userThroughCCData.sex !== "male" &&
            userThroughCCData.sex !== "female")
        ) {
          return res.status(400).json({
            error: "Proper sex should be mentioned for this type of event",
          });
        }
        // Add the new user to the event
        if (event.userRegistrations.length === 0) {
          // Generate the default structure
          if (userThroughCCData.sex === "male") {
            event.userRegistrations = [
              {
                male: [newUserThroughCC._id.toString()],
                female: [],
              },
            ];
          } else {
            event.userRegistrations = [
              {
                male: [],
                female: [newUserThroughCC._id.toString()],
              },
            ];
          }
        } else {
          event.userRegistrations[0][userThroughCCData.sex].push(
            newUserThroughCC._id.toString()
          );
        }
        event.markModified("userRegistrations");
        await event.save();
        // Updating the user's registeredSolos
        user.registeredSolos.push({
          eventId: eventId,
          userId: newUserThroughCC._id.toString(),
          sex: userThroughCCData.sex,
        });
        user.markModified("registeredSolos");
        await user.save();
      }
      // If the event is MMA
      else if (event.name === "MMA") {
        if (
          !userThroughCCData.weightCategory ||
          (userThroughCCData.weightCategory !== "lightWeight" &&
            userThroughCCData.weightCategory !== "middleWeight" &&
            userThroughCCData.weightCategory !== "heavyWeight")
        ) {
          return res.status(400).json({
            error:
              "Proper weight category should be mentioned for this type of event",
          });
        }
        // Add the new user to the event
        if (event.userRegistrations.length === 0) {
          // Generate the default structure
          if (userThroughCCData.weightCategory === "lightWeight") {
            event.userRegistrations = [
              {
                lightWeight: [newUserThroughCC._id.toString()],
                middleWeight: [],
                heavyWeight: [],
              },
            ];
          } else if (userThroughCCData.weightCategory === "middleWeight") {
            event.userRegistrations = [
              {
                lightWeight: [],
                middleWeight: [newUserThroughCC._id.toString()],
                heavyWeight: [],
              },
            ];
          } else {
            event.userRegistrations = [
              {
                lightWeight: [],
                middleWeight: [],
                heavyWeight: [newUserThroughCC._id.toString()],
              },
            ];
          }
        } else {
          event.userRegistrations[0][userThroughCCData.weightCategory].push(
            newUserThroughCC._id.toString()
          );
        }
        event.markModified("userRegistrations");
        await event.save();
        // Updating the user's registeredSolos
        user.registeredSolos.push({
          eventId: eventId,
          userId: newUserThroughCC._id.toString(),
          weightCategory: userThroughCCData.weightCategory,
        });
        user.markModified("registeredSolos");
        await user.save();
      } else {
        // Adding the new user to any other event
        event.userRegistrations.push(newUserThroughCC._id.toString());
        event.markModified("userRegistrations");
        await event.save();
        // Updating the user's registeredSolos
        user.registeredSolos.push({
          eventId: eventId,
          userId: newUserThroughCC._id.toString(),
        });
      }

      // Saving the user
      await user.save();

      // Saving the event
      await event.save();
    } else {
      // Checking if the event is Mr. and Ms. Kshitij
      if (event.name === "Mr. and Ms. Kshitij") {
        // Adding the user to the event
        if (
          !NCPData.sex ||
          (NCPData.sex !== "male" && NCPData.sex !== "female")
        ) {
          return res.status(400).json({
            error: "Proper sex should be mentioned for this type of event",
          });
        }
        event.userRegistrations[0][NCPData.sex].push(userId);
        event.markModified("userRegistrations");
        await event.save();
      } else if (event.name === "MMA") {
        if (
          !NCPData.weightCategory ||
          (NCPData.weightCategory !== "lightWeight" &&
            NCPData.weightCategory !== "middleWeight" &&
            NCPData.weightCategory !== "heavyWeight")
        ) {
          return res.status(400).json({
            error:
              "Proper weight category should be mentioned for this type of event",
          });
        }
        // Adding the user to the event
        event.userRegistrations[0][NCPData.weightCategory].push(userId);
        event.markModified("userRegistrations");
        await event.save();
      } else {
        // Adding the user to any other event
        event.userRegistrations.push(userId);
        event.markModified("userRegistrations");
        await event.save();
      }
      await event.save();
    }

    // Sending the email to the user
    await sendEmailWithRetry({
      to: user.email,
      subject: `Registered for ${event.name} event successfully`,
      text: `You have been registered for the ${event.name} event successfully and are added to the waiting list.`,
    });

    res.status(200).json({
      message: `Registered for ${event.name} event successfully`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.registerForTeamEvent = async (req, res) => {
  try {
    // Required Fields : userId, eventId
    // {
    //   userId: String,
    //   eventId: String,
    //   userThroughCCData = {}, // If the user is a CC
    //   NCPData = {} // If the user is a NCP
    // }
    const { userId, eventId } = req.body;
    let userThroughCCData = req.body.userThroughCCData;
    let NCPData = req.body.NCPData;

    // Checking if the userId and eventId are valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: "Invalid user ID",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        error: "Invalid event ID",
      });
    }

    // Finding the user
    let isNCP = true;
    let user = await ncpUser.findById(userId).select("-password");
    if (!user) {
      user = await ccUser.findById(userId).select("-password");
      isNCP = false;
    }

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
    const event = await teamEvent.findOne({
      $and: [{ _id: eventId }, { deleted: { $ne: true } }],
    });

    // Event not found
    if (!event) {
      return res.status(404).json({
        error: "Event not found",
      });
    }

    // Checking if the event registration time has ended
    if (new Date(event.date).toISOString() < new Date().toISOString()) {
      return res.status(400).json({
        error: "Event registration time has ended",
      });
    }

    // Checking the team size
    if (!isNCP) {
      if (
        (userThroughCCData.teamMembers &&
          event.teamSize.min > userThroughCCData.teamMembers.length) ||
        event.teamSize.max < userThroughCCData.teamMembers.length
      ) {
        return res.status(400).json({
          error: `Team size must be between ${event.teamSize.min} and ${event.teamSize.max}`,
        });
      }

      // Checking npa size (not compulsory just the upper limit)
      if (
        userThroughCCData.npaMembers &&
        userThroughCCData.npaMembers.length > event.npaAmount
      ) {
        return res.status(400).json({
          error: `NPA members cannot be more than ${event.npaAmount}`,
        });
      }
    } else {
      if (NCPData.npaMembers && NCPData.npaMembers.length > event.npaAmount) {
        return res.status(400).json({
          error: `NPA members cannot be more than ${event.npaAmount}`,
        });
      }
      if (
        (NCPData.teamMembers &&
          event.teamSize.min > NCPData.teamMembers.length) ||
        event.teamSize.max < NCPData.teamMembers.length
      ) {
        return res.status(400).json({
          error: `Team size cannot be more than ${event.teamSize.max}`,
        });
      }
    }

    // Checking if the user is already registered for the event
    // CC User
    if (!isNCP) {
      const registeredTeams = user.registeredTeams.filter(
        (team) => team.eventId.toString() === eventId.toString()
      );
      if (registeredTeams.length > 0) {
        return res.status(400).json({
          error: `User already registered for the ${event.name} event`,
        });
      }
    }
    // NCP User
    else {
      const userRegistrations = event.userRegistrations.filter(
        (registration) => {
          return (
            registration.registerer.toString() === userId.toString() ||
            registration.teamMembers.includes(userId) ||
            registration.npaMembers.includes(userId)
          );
        }
      );
      if (userRegistrations.length > 0) {
        return res.status(400).json({
          error: `User already registered for the ${event.name} event`,
        });
      }
    }

    // Registering the user for the event
    // CC User
    if (!isNCP) {
      // Getting the team member images
      let teamMemberImages = req.files.teamMembers;
      let npaMemberImages = req.files.npaMembers;
      let teamMemberGovtIdProof = req.files.teamMembersGovtIdProof;
      let npaMemberGovtIdProof = req.files.npaMembersGovtIdProof;

      // Assuming dummy entries
      if (!teamMemberImages) {
        teamMemberImages = [];
      } else {
        if (teamMemberImages.length !== userThroughCCData.teamMembers.length) {
          // Filter out the dummy entries
          const countOfRealEntries = userThroughCCData.teamMembers.filter(
            (member) => member !== ""
          ).length;
          if (teamMemberImages.length !== countOfRealEntries) {
            return res.status(400).json({
              error:
                "Team member images are not equal to the number of team members",
            });
          }
        }
      }
      if (!npaMemberImages) {
        npaMemberImages = [];
      } else {
        // Filter out the dummy entries
        const countOfRealEntries = userThroughCCData.npaMembers.filter(
          (member) => member !== ""
        ).length;
        if (npaMemberImages && npaMemberImages.length !== countOfRealEntries) {
          return res.status(400).json({
            error:
              "NPA member images are not equal to the number of NPA members",
          });
        }
      }

      // Checking if the team name is taken
      const teamsWithSameName = event.userRegistrations.filter(
        (team) => team.teamName === user.ccId
      );
      if (teamsWithSameName.length > 0) {
        return res.status(400).json({
          error: `Team name already taken`,
        });
      }

      let data = {
        teamName: user.ccId,
        registerer: userId,
        eventId: eventId,
        teamMembers: [],
        npaMembers: [],
      };

      // Checking the intersection between team members and NPA members
      if (
        userThroughCCData.npaMembers &&
        userThroughCCData.npaMembers.length > 0
      ) {
        const intersection = userThroughCCData.teamMembers.filter((member) => {
          if (member === "") {
            return false;
          }
          for (let i = 0; i < userThroughCCData.npaMembers.length; i++) {
            if (
              userThroughCCData.npaMembers[i].email === member.email ||
              userThroughCCData.npaMembers[i].phoneNumber === member.phoneNumber
            ) {
              return true;
            }
          }
          return false;
        });
        if (intersection.length > 0) {
          return res.status(400).json({
            error: "Team members and NPA members cannot intersect",
          });
        }
      }

      // Creating user through CC of all team members
      if (
        userThroughCCData.teamMembers &&
        userThroughCCData.teamMembers.length > 0
      ) {
        for (let i = 0; i < userThroughCCData.teamMembers.length; i++) {
          const member = userThroughCCData.teamMembers[i];
          // Allow dummy entries
          if (member === "") {
            data.teamMembers.push("dummyRef: " + userId);
            continue;
          }

          // Check if email and phone number are valid
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
            return res.status(400).json({
              error: `Invalid email for ${member.firstName} ${member.lastName}`,
            });
          }
          if (!/^[6-9]\d{9}$/.test(member.phoneNumber)) {
            return res.status(400).json({
              error: `Invalid phone number for ${member.firstName} ${member.lastName}`,
            });
          }

          // Checking if the user through CC already exists
          let newUserThroughCC = await userThroughCC.findOne({
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phoneNumber: member.phoneNumber,
          });
          if (!newUserThroughCC) {
            // Creating the user through CC
            const idProofARN = await s3Upload(teamMemberImages[i]);
            const idProofType = teamMemberImages[i].mimetype;
            const govtIdProofARN = await s3Upload(teamMemberGovtIdProof[i]);
            const govtIdProofType = teamMemberGovtIdProof[i].mimetype;
            newUserThroughCC = await userThroughCC.create({
              ccId: userId,
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              phoneNumber: member.phoneNumber,
              idProofARN,
              idProofType: {
                fileType: idProofType,
                url: null,
                timeTillExpiry: null,
              },
              govtIdProofARN,
              govtIdProofType: {
                fileType: govtIdProofType,
                url: null,
                timeTillExpiry: null,
              },
            });
          }
          data.teamMembers.push(newUserThroughCC._id.toString());
        }
      }

      if (
        userThroughCCData.npaMembers &&
        userThroughCCData.npaMembers.length > 0
      ) {
        // Creating user through CC of all NPA members
        if (
          userThroughCCData.npaMembers &&
          userThroughCCData.npaMembers.length > 0
        ) {
          for (let i = 0; i < userThroughCCData.npaMembers.length; i++) {
            const member = userThroughCCData.npaMembers[i];
            // Allow dummy entries
            if (member === "") {
              data.npaMembers.push("dummyRef: " + userId);
              continue;
            }

            // Check if email and phone number are valid
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
              return res.status(400).json({
                error: `Invalid email for ${member.firstName} ${member.lastName}`,
              });
            }
            if (!/^[6-9]\d{9}$/.test(member.phoneNumber)) {
              return res.status(400).json({
                error: `Invalid phone number for ${member.firstName} ${member.lastName}`,
              });
            }

            // Checking if the user through CC already exists
            let newUserThroughCC = await userThroughCC.findOne({
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              phoneNumber: member.phoneNumber,
            });
            if (!newUserThroughCC) {
              // Creating the user through CC
              const idProofARN = await s3Upload(npaMemberImages[i]);
              const idProofType = npaMemberImages[i].mimetype;
              const govtIdProofARN = await s3Upload(npaMemberGovtIdProof[i]);
              const govtIdProofType = npaMemberGovtIdProof[i].mimetype;
              newUserThroughCC = await userThroughCC.create({
                ccId: userId,
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
                phoneNumber: member.phoneNumber,
                idProofARN,
                idProofType: {
                  fileType: idProofType,
                  url: null,
                  timeTillExpiry: null,
                },
                govtIdProofARN,
                govtIdProofType: {
                  fileType: govtIdProofType,
                  url: null,
                  timeTillExpiry: null,
                },
              });
            }
            data.npaMembers.push(newUserThroughCC._id.toString());
          }
        }
      }

      // Adding the data to the event
      event.userRegistrations.push(data);
      // Saving the event
      await event.save();

      data.eventId = eventId;
      delete data.registerer;
      delete data.teamName;

      // Adding the data to the user's registeredTeams
      user.registeredTeams.push(data);

      // Saving the user
      await user.save();
    }
    // NCP User
    else {
      // Checking if the team name is taken
      const teamsWithSameName = event.userRegistrations.filter(
        (team) => team.teamName === NCPData.teamName
      );
      if (teamsWithSameName.length > 0) {
        return res.status(400).json({
          error: `Team name already taken`,
        });
      }

      let data = {
        teamName: NCPData.teamName,
        registerer: userId,
        teamMembers: [],
        npaMembers: [],
      };
      // Checking all the team memberss
      for (let i = 0; i < NCPData.teamMembers.length; i++) {
        const member = NCPData.teamMembers[i];
        if (!member || member === "") {
          return res.status(404).json({ error: "NCP userId cannot be empty" });
        }
        let user = await ncpUser.findOne({ ncpId: member });
        if (!user) {
          return res.status(404).json({
            error: "NCP user not found",
          });
        }
        data.teamMembers.push(user._id.toString());
      }

      if (NCPData.npaMembers && NCPData.npaMembers.length > 0) {
        // Checking all the NPA members
        for (let i = 0; i < NCPData.npaMembers.length; i++) {
          const member = NCPData.npaMembers[i];
          if (!member || member === "") {
            return res
              .status(404)
              .json({ error: "NCP userId cannot be empty" });
          }

          let user = await ncpUser.findOne({ ncpId: member });
          if (!user) {
            return res.status(404).json({
              error: "NCP user not found",
            });
          }
          data.npaMembers.push(user._id.toString());
        }
      }

      // Adding the data to the event
      event.userRegistrations.push(data);

      // Saving the event
      await event.save();
    }

    // Sending the email to the user
    await sendEmailWithRetry({
      to: user.email,
      subject: `Registered for ${event.name} event successfully`,
      text: `You have been registered for the ${event.name} event successfully and are added to the waiting list.`,
    });

    res.status(200).json({
      message: `Registered for ${event.name} event successfully`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};
