import React, { useState } from "react";
import { MdVerified, MdCancel, MdOutlinePending } from "react-icons/md";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GoTrophy } from "react-icons/go";
import { FaChessKing, FaChessPawn } from "react-icons/fa";

const getVerificationIcon = (status) => {
  switch (status) {
    case "VERIFIED":
      return <MdVerified className="text-[#5ebcf3] text-lg" />;
    case "REJECTED":
      return <MdCancel className="text-[#f35e5e] text-lg" />;
    case "PENDING":
      return <MdOutlinePending className="text-[#867755] text-lg" />;
    default:
      return null;
  }
};

function ViewUser({ user }) {
  const [soloEvents, setSoloEvents] = useState([
    ...(user.registeredSolos || []),
  ]);
  const [teamEvents, setTeamEvents] = useState([
    ...(user.registeredTeams || []),
  ]);

  return (
    <div className="flex flex-col gap-4 w-fit max-h-[700px] text-white p-8 border-[#202020] border-[1px] rounded-lg">
      <div className="user-details flex flex-col gap-2">
        <h1 className="user-id text-2xl font-bold">
          {user.type === "CC"
            ? user.ccId
            : user.ncpId
            ? user.ncpId
            : user.otseId}
        </h1>
        <p className="user-email text-[#808080] text-[15px] mb-2">
          {user.email}
        </p>
        <div className="flex justify-between items-center">
          <div className="user-status flex items-center gap-2 border border-[#202020] rounded-lg p-2 w-fit">
            {getVerificationIcon(user.verified || "VERIFIED")}{" "}
            {user.verified
              ? user.verified.charAt(0).toUpperCase() +
                user.verified.slice(1).toLowerCase()
              : "VERIFIED"}
          </div>
          {user.points !== undefined && (
            <div className="text-[#808080] text-[15px]  flex items-center gap-3 border border-[#202020] rounded-lg p-2 w-fit">
              <p className="text-xl">{user.points}</p>
              <GoTrophy className="text-[#FFD700] text-xl" />
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-10">
        <Accordion type="single" collapsible className="w-[400px]">
          <AccordionItem value="solo-events">
            <AccordionTrigger>Solo Events</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px] border-[2px] border-[#202020] p-5 rounded-lg">
                {soloEvents.map((event, idx) => (
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full  border-[#202020] border-[1px]  p-3 rounded-lg"
                    key={idx}
                  >
                    <AccordionItem value={event.eventName}>
                      <AccordionTrigger className="text-md font-semibold">
                        {event.eventName} {event.sex ? `(${event.sex})` : ""}{" "}
                        {event.weightCategory
                          ? `(${event.weightCategory})`
                          : ""}
                      </AccordionTrigger>
                      <AccordionContent
                        className={
                          event.participant === "dummy"
                            ? `bg-red-500 rounded-lg p-2`
                            : ""
                        }
                      >
                        <div className="flex flex-col gap-2">
                          <h4>
                            Participant:{" "}
                            {user.ccId
                              ? event.participant
                              : `${user.firstName} ${user.lastName}`}
                          </h4>
                          <p className="flex items-center gap-1">
                            Confirmed :{""}
                            {event.confirmed
                              ? getVerificationIcon("VERIFIED")
                              : getVerificationIcon("REJECTED")}
                          </p>
                          {event.verified !== undefined && (
                            <p className="flex items-center gap-1">
                              Verified:{" "}
                              {event.verified
                                ? getVerificationIcon("VERIFIED")
                                : getVerificationIcon("PENDING")}
                            </p>
                          )}
                          {event.weightCategory !== undefined && (
                            <p>Weight Category: {event.weightCategory}</p>
                          )}
                          {event.sex !== undefined && <p>Sex: {event.sex}</p>}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Accordion type="single" collapsible className="w-[400px]">
          <AccordionItem value="team-events">
            <AccordionTrigger>Team Events</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px] border-[2px] border-[#202020] p-5 rounded-lg">
                {teamEvents.map((event, idx) => (
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full  border-[#202020] border-[1px]  p-3 rounded-lg"
                  >
                    <AccordionItem value={event.eventName}>
                      <AccordionTrigger className="text-md font-semibold">
                        {event.eventName}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col  gap-2">
                          {event.teamMembers && (
                            <div className="team-members">
                              <div className="border border-[#202020] rounded-lg p-2 mb-2 w-fit flex items-center gap-2">
                                <FaChessKing className="text-lg text-[#FFD700]" />
                                Registerer : {event.registerer}{" "}
                              </div>
                              <Popover>
                                <PopoverTrigger
                                  className={`border border-[#202020] rounded-lg p-2 ${
                                    event.teamMembers.includes("dummy")
                                      ? `bg-red-500`
                                      : ""
                                  }`}
                                >
                                  Team Members
                                </PopoverTrigger>
                                <PopoverContent
                                  className={`text-white bg-[#090909] w-fit`}
                                  align="start"
                                  sideOffset={5}
                                >
                                  <div className="flex flex-col gap-2 px-4 rounded-lg text-sm">
                                    {event.teamMembers.length !== 0 &&
                                      event.teamMembers.map((member) => (
                                        <div className="flex items-center gap-2 w-fit">
                                          <FaChessPawn className="text-lg" />
                                          <p>{member}</p>
                                        </div>
                                      ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                          {event.npaMembers && (
                            <div className="npa-members">
                              <Popover>
                                <PopoverTrigger
                                  className={`border border-[#202020] rounded-lg p-2 ${
                                    event.npaMembers.includes("dummy")
                                      ? `bg-red-500`
                                      : ""
                                  }`}
                                >
                                  NPA Members
                                </PopoverTrigger>
                                <PopoverContent
                                  className={`text-white bg-[#090909] w-fit`}
                                  align="start"
                                >
                                  <div className="flex flex-col gap-2 px-4 rounded-lg text-sm">
                                    {event.npaMembers.length !== 0 &&
                                      event.npaMembers.map((member) => (
                                        <div className="flex items-center gap-2 w-fit">
                                          <FaChessPawn className="text-lg" />
                                          <p>{member}</p>
                                        </div>
                                      ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}

                          <div className="w-full ml-1 flex items-center gap-5">
                            <p className="flex items-center gap-1">
                              Confirmed :{""}
                              {event.confirmed
                                ? getVerificationIcon("VERIFIED")
                                : getVerificationIcon("REJECTED")}
                            </p>
                            <p className="flex items-center gap-1">
                              Verified:{" "}
                              {event.verified
                                ? getVerificationIcon("VERIFIED")
                                : getVerificationIcon("PENDING")}
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

export default ViewUser;
