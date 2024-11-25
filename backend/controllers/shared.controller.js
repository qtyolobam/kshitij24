// Dependencies
const mongoose = require("mongoose");

// Local imports
// Models
const { ccUser, ncpUser, userThroughCC } = require("../models/user.model");
const betModel = require("../models/bet.model");
const { soloEvent, teamEvent } = require("../models/event.model");
const { sendEmailWithRetry } = require("../utils/apis/emailerConfig");

// Get User Details
exports.getUserDetailsShared = async (userId) => {
  try {
    // Checking if the userId is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }

    // Checking if the user is a CC or NCP
    let isNCP = false;
    let user = await ccUser.findById(userId);
    if (!user) {
      user = await ncpUser.findById(userId);
      isNCP = true;
    }

    // User not found
    if (!user) {
      throw new Error("User not found");
    }

    let data = {};
    // Formatting the user details
    if (!isNCP) {
      data = {
        type: "CC",
        _id: user._id,
        ccId: user.ccId,
        email: user.email,
        registeredSolos: [],
        registeredTeams: [],
        points: user.points,
        bets: [],
        verified: user.verified,
        deleted: user.deleted,
      };

      // Fetching the bets
      let bets = await betModel.find({ userId: userId });
      let modifiedBets = [];
      for (let i = 0; i < bets.length; i++) {
        let event =
          (await soloEvent
            .findOne({
              $and: [{ _id: bets[i].eventId }],
            })
            .select("name")) ||
          (await teamEvent
            .find({
              $and: [{ _id: bets[i].eventId }],
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
              $and: [{ _id: solo.eventId }],
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
              $and: [{ _id: team.eventId }],
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
        type: "NCP",
        _id: user._id,
        ncpId: user.ncpId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        verified: user.verified,
        registeredSolos: [],
        registeredTeams: [],
        deleted: user.deleted,
      };

      // Fetching solo events user is registered for
      let soloEvents = await soloEvent.find({
        $or: [
          { userRegistrations: { $in: [userId.toString()] } }, // For regular events
          { "userRegistrations.0.male": userId.toString() }, // For Mr. and Ms. Kshitij
          { "userRegistrations.0.female": userId.toString() }, // For Mr. and Ms. Kshitij
          { "userRegistrations.0.lightWeight": userId.toString() }, // For MMA
          { "userRegistrations.0.middleWeight": userId.toString() }, // For MMA
          { "userRegistrations.0.heavyWeight": userId.toString() }, // For MMA
        ],
      });

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
    return data;
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.confirmUserShared = async (req, res) => {
  try {
    // Required fields:
    // {
    //   _id: String,
    //   eventId: String
    //   Optional fields:
    //   sex: "male/female" => for Mr. and Ms. Kshitij
    //   weightCategory: "lightWeight/middleWeight/heavyWeight" => for MMA
    // }

    const { _id, eventId } = req.body;

    // Check if the eventId is valid
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      throw new Error("Invalid event ID");
    }

    // Find the event
    let isSolo = true;
    let event = await soloEvent.findOne({
      $and: [{ _id: eventId }],
    });
    if (!event) {
      event = await teamEvent.findOne({
        $and: [{ _id: eventId }],
      });
      isSolo = false;
    }

    // Event doesnt exist
    if (!event) {
      throw new Error("Event not found");
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
      throw new Error("User not found");
    }

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
            event.slots[req.body.sex] -= 1;
            event.markModified("slots");
            await event.save();
            throw new Error(
              `User not registered for Mr. and Ms. Kshitij as a ${req.body.sex} to confirm`
            );
          }
        } else if (event.name === "MMA") {
          const registeredSolos = user.registeredSolos.filter(
            (solo) =>
              solo.eventId.toString() === eventId.toString() &&
              solo.weightCategory === req.body.weightCategory
          );
          if (registeredSolos.length === 0) {
            event.slots[req.body.weightCategory] -= 1;
            event.markModified("slots");
            await event.save();
            throw new Error(`User not registered for MMA to confirm`);
          }
        } else {
          // Check in user.registeredSolos to check if the user is registered for the event
          const registeredSolos = user.registeredSolos.find(
            (solo) => solo.eventId.toString() === eventId.toString()
          );
          if (!registeredSolos) {
            event.slots -= 1;
            event.markModified("slots");
            await event.save();
            throw new Error(`User not registered for ${event.name} to confirm`);
          }
        }
      } else {
        // Check in user.registeredTeams to check if the user is registered for the event
        const registeredTeams = user.registeredTeams.find(
          (team) => team.eventId.toString() === eventId.toString()
        );
        if (!registeredTeams) {
          event.slots -= 1;
          event.markModified("slots");
          await event.save();
          throw new Error(`User not registered for ${event.name} to confirm`);
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
            event.slots[req.body.sex] -= 1;
            event.markModified("slots");
            await event.save();
            throw new Error(
              `User is not registered for Mr. and Ms. Kshitij to confirm`
            );
          }
        } // Check if user is registered for MMA
        else if (event.name === "MMA") {
          const isRegistered =
            event.userRegistrations[0]?.["lightWeight"]?.includes(_id) ||
            event.userRegistrations[0]?.["middleWeight"]?.includes(_id) ||
            event.userRegistrations[0]?.["heavyWeight"]?.includes(_id);
          if (!isRegistered) {
            event.slots[req.body.weightCategory] -= 1;
            event.markModified("slots");
            await event.save();
            throw new Error(`User is not registered for MMA to confirm`);
          }
        }
        // Checking if the user is already registered for event
        else {
          const isRegistered = event.userRegistrations.includes(_id);
          if (!isRegistered) {
            event.slots -= 1;
            event.markModified("slots");
            await event.save();
            throw new Error(
              `User is not registered for ${event.name} to confirm`
            );
          }
        }
      } else {
        const userRegistrations = event.userRegistrations.find(
          (registration) => {
            return registration.registerer.toString() === _id.toString();
          }
        );
        if (!userRegistrations) {
          event.slots -= 1;
          event.markModified("slots");
          await event.save();
          throw new Error(
            `User is not registered for ${event.name} to confirm`
          );
        }
      }
    }

    // Confirming the user
    if (!isNCP) {
      if (isSolo) {
        if (event.name === "Mr. and Ms. Kshitij") {
          // Checking if event slots are available
          if (event.slots[req.body.sex] === 0) {
            throw new Error(
              `No slots available for ${event.name} as a ${req.body.sex}`
            );
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
              throw new Error("User already confirmed for the event");
            }
            event.confirmedRegistrations[0][req.body.sex].push(
              regUser[0].userId.toString()
            );
          }
          user.points += event.points.registration;
          event.slots[req.body.sex] -= 1;
          user.markModified("points");
          await user.save();
          event.markModified("slots");
          event.markModified("confirmedRegistrations");
          await event.save();
        } else if (event.name === "MMA") {
          // Checking if event slots are available
          if (event.slots[req.body.weightCategory] === 0) {
            throw new Error(
              `No slots available for ${event.name} as a ${req.body.weightCategory}`
            );
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
              throw new Error("User already confirmed for the event");
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
            throw new Error(`No slots available for ${event.name}`);
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
            throw new Error("User already confirmed for the event");
          }
          // Adding the user to the confirmed registrations
          user.points += event.points.registration;
          user.markModified("points");
          await user.save();
          event.confirmedRegistrations.push(regUser[0].userId.toString());
          event.slots -= 1;
          event.markModified("slots");
          event.markModified("confirmedRegistrations");
          await event.save();
        }
      } else {
        // Checking if event slots are available
        if (event.slots === 0) {
          throw new Error(`No slots available for ${event.name}`);
        }
        let registeredTeam = user.registeredTeams.find(
          (team) => team.eventId.toString() === eventId.toString()
        );

        if (registeredTeam.confirmed) {
          throw new Error("Team already confirmed for the event");
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
        await user.save();
        event.slots -= 1;
        event.markModified("confirmedRegistrations");
        event.markModified("slots");
        await event.save();
      }
    } else {
      if (isSolo) {
        if (event.name === "Mr. and Ms. Kshitij") {
          // Checking if event slots are available
          if (event.slots[req.body.sex] === 0) {
            throw new Error(
              `No slots available for ${event.name} as a ${req.body.sex}`
            );
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
              throw new Error("User already confirmed for the event");
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
            throw new Error(
              `No slots available for ${event.name} as a ${req.body.weightCategory}`
            );
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
              throw new Error("User already confirmed for the event");
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
            throw new Error(`No slots available for ${event.name}`);
          }

          // Check if the user is already confirmed for the event
          if (event.confirmedRegistrations.includes(_id.toString())) {
            throw new Error("User already confirmed for the event");
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
          throw new Error(`No slots available for ${event.name}`);
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
          throw new Error("Team already confirmed for the event");
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
  } catch (error) {
    console.log(error);
    throw error;
  }
};
