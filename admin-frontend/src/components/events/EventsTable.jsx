import React, { useState, useEffect } from "react";
import {
  MdOutlineMail,
  MdOutlineModeEditOutline,
  MdDelete,
  MdCreateNewFolder,
  MdFindReplace,
} from "react-icons/md";
import { BsFillPersonPlusFill } from "react-icons/bs";
import { IoPersonCircleSharp } from "react-icons/io5";
import { SlOptions } from "react-icons/sl";
import { RiTeamFill } from "react-icons/ri";
import { GoPlusCircle } from "react-icons/go";
import { IoSwapHorizontalOutline } from "react-icons/io5";
import { GoTrophy } from "react-icons/go";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { CheckboxDropdownMenu } from "@/components/shared/CheckboxDropdownMenu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

import UpdateEvents from "./UpdateEvents";
import EventForm from "./EventForm";
import axios from "axios";
import { z } from "zod";
import Loading from "../shared/Loading";
import CCSoloSubstitution from "../substitution/CCSoloSubstitution";
import CCTeamSubstitution from "../substitution/CCTeamSubstitution";
import NCPSoloSubstitution from "../substitution/NCPSoloSubstitution";
import NCPTeamSubstitution from "../substitution/NCPTeamSubstitution";
import SoloOtseForm from "../otse/SoloOtseForm";
import TeamOtseForm from "../otse/TeamOtseForm";
import ReplacedConfirmed from "../replace-confirmed/ReplacedConfirmed";

function EventsTable() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubstituteDialogOpen, setIsSubstituteDialogOpen] = useState(false);
  const [isCreateOtseDialogOpen, setIsCreateOtseDialogOpen] = useState(false);
  const [isReplaceConfirmedDialogOpen, setIsReplaceConfirmedDialogOpen] =
    useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [data, setData] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState({
    SOLO: false,
    TEAM: false,
  });

  const [dummyData, setDummyData] = useState([]);

  const soloUpdateSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    slots: z
      .number()
      .or(
        z.object({
          // For Mr. and Ms. Kshitij or MMA events
        })
      )
      .optional(),
    points: z.record(z.string(), z.number()).optional(),
    eventPhaseType: z.string().optional(),
    date: z.string().optional(),
  });

  const soloSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    type: z.string().min(1, "Type is required"),
    slots: z.number().or(
      z.object({
        // For Mr. and Ms. Kshitij or MMA events
      })
    ),
    points: z.record(z.string(), z.number()),
    eventPhaseType: z.string().min(1, "Event Phase Type is required"),
    date: z.string().min(1, "Date is required"),
  });

  const soloDefaultSchemaValues = {
    name: "",
    description: "",
    type: "",
    slots: 0,
    points: {
      firstPodium: 0,
      secondPodium: 0,
      thirdPodium: 0,
      registration: 0,
      qualification: 0,
      npr: 0,
      npq: 0,
    },
    eventPhaseType: "",
    date: "",
  };

  const soloUpdateSubmitHandler = async (formData) => {
    try {
      const values = formData;
      delete values.slotsType;
      const data = {};

      setIsLoading(true);
      Object.entries(values).forEach(([key, value]) => {
        if (key === "slots") {
          if (typeof value === "object") {
            if (Object.keys(value).length > 0) {
              data[key] = value;
            }
          } else if (typeof value === "number") {
            if (value !== 0) {
              data[key] = Number(value);
            }
          }
        } else if (key === "points") {
          const pointsData = {};
          Object.entries(value).forEach(([pointKey, pointValue]) => {
            if (
              pointValue !== "" &&
              pointValue !== 0 &&
              pointValue !== null &&
              pointValue !== undefined
            ) {
              pointsData[pointKey] = Number(pointValue);
            }
          });
          if (Object.keys(pointsData).length > 0) {
            data[key] = pointsData;
          }
        } else if (value !== "" && value !== null && value !== undefined) {
          data[key] = value;
        }
      });

      if (Object.keys(data).length === 0) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "At least one field must be filled",
          className:
            "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
        });
        setIsLoading(false);
        return;
      }
      // Call update event API
      const response = await axios.patch(
        `http://localhost:4534/api/admin/update-event/${selectedEvent._id}`,
        data
      );
      setIsLoading(false);
      setIsUpdateDialogOpen(false);

      const updatedData = dummyData.map((event) => {
        if (event._id === selectedEvent._id) {
          return { ...event, ...response.data.data.event };
        }
        return event;
      });
      setDummyData(updatedData);
      toast({
        title: "Event updated successfully",
        variant: "destructive",
        description: "The event has been updated successfully",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Error updating event",
        description: error?.response?.data?.error || "Something went wrong",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const soloCreateSubmitHandler = async (formData) => {
    try {
      const values = formData;
      let type = "SOLO";
      delete values.slotsType;
      const data = {};
      setIsLoading(true);
      Object.entries(values).forEach(([key, value]) => {
        if (key === "slots") {
          if (typeof value === "object") {
            if (Object.keys(value).length > 0) {
              data[key] = value;
            }
          } else if (typeof value === "number") {
            if (value !== 0) {
              data[key] = Number(value);
            }
          }
        } else if (key === "points") {
          const pointsData = {};
          Object.entries(value).forEach(([pointKey, pointValue]) => {
            if (
              pointValue !== "" &&
              pointValue !== 0 &&
              pointValue !== null &&
              pointValue !== undefined
            ) {
              pointsData[pointKey] = Number(pointValue);
            }
          });
          if (Object.keys(pointsData).length > 0) {
            data[key] = pointsData;
          }
        } else if (value !== "" && value !== null && value !== undefined) {
          data[key] = value;
        }
      });

      // Call create event API
      let response = await axios.post(
        `http://localhost:4534/api/admin/create-event/${type}`,
        data
      );

      let newEvent = response.data.data.event;

      setIsLoading(false);

      const updatedData = [...dummyData, newEvent];
      setDummyData(updatedData);
      toast({
        title: "Event created successfully",
        variant: "destructive",
        description: "The event has been created successfully",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Error creating event",
        description: error?.response?.data?.error || "Something went wrong",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const teamUpdateSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    slots: z.number().optional(),
    points: z.record(z.string(), z.number()).optional(),
    eventPhaseType: z.string().optional(),
    date: z.string().optional(),
    teamSize: z.string().optional(),
    npaAmount: z.number().optional(),
  });

  const teamSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    type: z.string().min(1, "Type is required"),
    slots: z.number().or(
      z.object({
        // Some bug so added this
      })
    ),
    points: z.record(z.string(), z.number()),
    eventPhaseType: z.string().min(1, "Event Phase Type is required"),
    date: z.string().min(1, "Date is required"),
    teamSize: z
      .object({
        min: z.number(),
        max: z.number(),
      })
      .optional(),
    npaAmount: z.number().min(0, "Enter proper no of NPA members"),
  });

  const teamDefaultSchemaValues = {
    name: "",
    description: "",
    type: "",
    slots: 0,
    points: {
      firstPodium: 0,
      secondPodium: 0,
      thirdPodium: 0,
      registration: 0,
      qualification: 0,
      npr: 0,
      npq: 0,
    },
    eventPhaseType: "",
    date: "",
    teamSize: "",
    npaAmount: 0,
  };

  const teamUpdateSubmitHandler = async (formData) => {
    try {
      const values = formData;
      delete values.slotsType;
      const data = {};

      Object.entries(values).forEach(([key, value]) => {
        if (key === "slots") {
          if (typeof value === "object") {
            if (Object.keys(value).length > 0) {
              data[key] = value;
            }
          } else if (typeof value === "number") {
            if (value !== 0) {
              data[key] = Number(value);
            }
          }
        } else if (key === "points") {
          const pointsData = {};
          Object.entries(value).forEach(([pointKey, pointValue]) => {
            if (
              pointValue !== "" &&
              pointValue !== 0 &&
              pointValue !== null &&
              pointValue !== undefined
            ) {
              pointsData[pointKey] = Number(pointValue);
            }
          });
          if (Object.keys(pointsData).length > 0) {
            data[key] = pointsData;
          }
        } else if (key === "teamSize" && value !== "") {
          const [min, max] = value.split("-");
          data[key] = {
            min: parseInt(min),
            max: parseInt(max),
          };
        } else if (
          value !== "" &&
          value !== null &&
          value !== undefined &&
          value !== 0
        ) {
          data[key] = value;
        }
      });

      if (Object.keys(data).length === 0) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "At least one field must be filled",
          className:
            "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
        });
        return;
      }

      // Call update event API
      const response = await axios.patch(
        `http://localhost:4534/api/admin/update-event/${selectedEvent._id}`,
        data
      );
      setIsLoading(false);
      setIsUpdateDialogOpen(false);

      const updatedData = dummyData.map((event) => {
        if (event._id === selectedEvent._id) {
          return { ...event, ...response.data.data.event };
        }
        return event;
      });
      setDummyData(updatedData);
      toast({
        title: "Event updated successfully",
        variant: "destructive",
        description: "The event has been updated successfully",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Error updating event",
        description: error?.response?.data?.error || "Something went wrong",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const teamCreateSubmitHandler = async (formData) => {
    try {
      const values = formData;
      let type = "TEAM";
      delete values.slotsType;
      const data = {};

      setIsLoading(true);
      Object.entries(values).forEach(([key, value]) => {
        if (key === "slots") {
          if (typeof value === "object") {
            if (Object.keys(value).length > 0) {
              data[key] = value;
            }
          } else if (typeof value === "number") {
            if (value !== 0) {
              data[key] = Number(value);
            }
          }
        } else if (key === "points") {
          const pointsData = {};
          Object.entries(value).forEach(([pointKey, pointValue]) => {
            if (
              pointValue !== "" &&
              pointValue !== 0 &&
              pointValue !== null &&
              pointValue !== undefined
            ) {
              pointsData[pointKey] = Number(pointValue);
            }
          });
          if (Object.keys(pointsData).length > 0) {
            data[key] = pointsData;
          }
        } else if (key === "teamSize" && value !== "") {
          data[key] = {
            ...value,
          };
        } else if (key === "npaAmount" && value !== "") {
          data[key] = parseInt(value);
        } else if (
          value !== "" &&
          value !== null &&
          value !== undefined &&
          value !== 0
        ) {
          data[key] = value;
        }
      });

      const response = await axios.post(
        // Call create event API
        `http://localhost:4534/api/admin/create-event/${type}`,
        data
      );

      const newEvent = response.data.data.event;

      setIsLoading(false);

      const updatedData = [...dummyData, newEvent];
      setDummyData(updatedData);
      toast({
        title: "Event created successfully",
        variant: "destructive",
        description: "The event has been created successfully",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Error creating event",
        description: error?.response?.data?.error || "Something went wrong",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    try {
      // Call delete event API
      setIsLoading(true);
      await axios.delete(
        `http://localhost:4534/api/admin/delete-event/${selectedEvent._id}`
      );
      setIsLoading(false);
      setIsDeleteDialogOpen(false);

      const filteredData = dummyData.filter(
        (event) => event._id !== selectedEvent._id
      );
      setDummyData(filteredData);
      toast({
        title: "Event deleted successfully",
        variant: "destructive",
        description: "The event has been deleted successfully",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Error deleting event",
        description: error?.response?.data?.error || "Something went wrong",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    axios
      .get("http://localhost:4534/api/admin/get-all-events")
      .then((response) => {
        let soloEvents = response.data.data.soloEvents.map((event) => ({
          ...event,
          type: "SOLO",
        }));
        let teamEvents = response.data.data.teamEvents.map((event) => ({
          ...event,
          type: "TEAM",
        }));
        setDummyData([...soloEvents, ...teamEvents]);
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        toast({
          title: "Error fetching events",
          description: error?.response?.data?.error || "Something went wrong",
          className:
            "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
        });
      });
  }, []);

  useEffect(() => {
    let filteredData = dummyData.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter by type
    const selectedTypesList = Object.entries(selectedTypes)
      .filter(([_, isSelected]) => isSelected)
      .map(([type]) => type);

    if (selectedTypesList.length > 0) {
      filteredData = filteredData.filter((item) =>
        selectedTypesList.includes(item.type)
      );
    }

    setTotalPages(Math.ceil(filteredData.length / itemsPerPage));

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setData(filteredData.slice(startIndex, endIndex));
  }, [page, searchTerm, selectedTypes, dummyData]);

  return (
    <div className="w-full">
      {isLoading && <Loading />}
      <Toaster />
      <div className="flex justify-between items-center">
        <div id="filterbar" className="flex gap-2">
          <Input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#09090B] rounded-[7px] w-[260px] h-[32px] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
          />
          <CheckboxDropdownMenu
            icon={<GoPlusCircle />}
            text="Types"
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            states={["SOLO", "TEAM"]}
            icons={[
              <IoPersonCircleSharp className="text-[#A1A1AA] text-lg" />,
              <RiTeamFill className="text-[#A1A1AA] text-lg" />,
            ]}
            selectedStates={selectedTypes}
            setSelectedStates={setSelectedTypes}
          />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-transparent hover:bg-[#27272A] px-3 py-1">
              <MdCreateNewFolder className="text-[#A1A1AA] text-lg" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]">
            <DialogTitle className="text-lg font-semibold text-white">
              Create New Event
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Fill in the details below to create a new Event.
            </DialogDescription>

            <Tabs defaultValue="solo" className="w-full text-white">
              <TabsList className="grid w-full grid-cols-2 bg-[#131313]">
                <TabsTrigger
                  value="solo"
                  className="data-[state=active]:bg-[#27272A]"
                >
                  SOLO
                </TabsTrigger>
                <TabsTrigger
                  value="team"
                  className="data-[state=active]:bg-[#27272A]"
                >
                  TEAM
                </TabsTrigger>
              </TabsList>
              <div className="mt-4">
                <TabsContent value="solo">
                  <EventForm
                    type="solo"
                    schema={soloSchema}
                    onSubmit={soloCreateSubmitHandler}
                    isLoading={isLoading}
                  />
                </TabsContent>
                <TabsContent value="team">
                  <EventForm
                    type="team"
                    schema={teamSchema}
                    onSubmit={teamCreateSubmitHandler}
                    isLoading={isLoading}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {selectedEvent !== null && (
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent className="w-full bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]">
            <AlertDialogHeader className="text-lg font-semibold text-white">
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-400">
                This action cannot be undone. This will delete the event from
                the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="bg-[#09090B] text-white hover:bg-[#27272A] hover:text-white border-[2px] border-[#27272A] font-medium"
                disabled={isLoading}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteEvent()}
                className="bg-white text-[#09090B] hover:bg-[#27272A] hover:text-white border-[2px] border-[#27272A] font-medium"
                disabled={isLoading}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedEvent !== null && (
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="w-full bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]">
            <DialogTitle className="text-lg font-semibold text-white">
              Update Event
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Update the events details below. Only fill in the fields you want
              to change.
            </DialogDescription>
            <UpdateEvents
              schema={
                selectedEvent.type === "SOLO"
                  ? soloUpdateSchema
                  : teamUpdateSchema
              }
              defaultSchemaValues={
                selectedEvent.type === "SOLO"
                  ? soloDefaultSchemaValues
                  : teamDefaultSchemaValues
              }
              type={selectedEvent.type}
              onSubmit={
                selectedEvent.type === "SOLO"
                  ? soloUpdateSubmitHandler
                  : teamUpdateSubmitHandler
              }
            />
          </DialogContent>
        </Dialog>
      )}

      {selectedEvent !== null && (
        <Dialog
          open={isSubstituteDialogOpen}
          onOpenChange={setIsSubstituteDialogOpen}
        >
          <DialogContent className="w-full bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]">
            <DialogTitle className="text-lg font-semibold text-white">
              Substitute Event
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Fill in the details below to substitute a dummy user for this
              event.
            </DialogDescription>
            <Tabs defaultValue="cc" className="w-full text-white">
              <TabsList className="grid w-full grid-cols-2 bg-[#131313]">
                <TabsTrigger
                  value="cc"
                  className="data-[state=active]:bg-[#27272A]"
                >
                  CC
                </TabsTrigger>
                <TabsTrigger
                  value="ncp"
                  className="data-[state=active]:bg-[#27272A]"
                >
                  NCP
                </TabsTrigger>
              </TabsList>
              <div>
                <TabsContent value="cc">
                  {selectedEvent.type === "SOLO" && (
                    <CCSoloSubstitution eventId={selectedEvent._id} />
                  )}
                  {selectedEvent.type === "TEAM" && (
                    <CCTeamSubstitution eventId={selectedEvent._id} />
                  )}
                </TabsContent>
                <TabsContent value="ncp">
                  {selectedEvent.type === "SOLO" && (
                    <NCPSoloSubstitution eventId={selectedEvent._id} />
                  )}
                  {selectedEvent.type === "TEAM" && (
                    <NCPTeamSubstitution eventId={selectedEvent._id} />
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {selectedEvent !== null && (
        <Dialog
          open={isCreateOtseDialogOpen}
          onOpenChange={setIsCreateOtseDialogOpen}
        >
          <DialogContent className="w-full bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]">
            <DialogTitle className="text-lg font-semibold text-white">
              Create OTSE
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Fill in the details below to create a new OTSE.
            </DialogDescription>
            {selectedEvent.type === "SOLO" && (
              <SoloOtseForm event={selectedEvent} />
            )}
            {selectedEvent.type === "TEAM" && (
              <TeamOtseForm
                eventId={selectedEvent._id}
                teamSize={selectedEvent.teamSize}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {selectedEvent !== null && (
        <Dialog
          open={isReplaceConfirmedDialogOpen}
          onOpenChange={setIsReplaceConfirmedDialogOpen}
        >
          <DialogContent className="w-full bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]">
            <DialogTitle className="text-lg font-semibold text-white">
              Replace Confirmed
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Fill in the details below to replace a confirmed user.
            </DialogDescription>
            <ReplacedConfirmed
              eventName={selectedEvent.name}
              eventId={selectedEvent._id}
            />
          </DialogContent>
        </Dialog>
      )}

      <div
        id="table"
        className="w-full h-[550px] mt-4 border-[1px] border-[#27272A] rounded-lg"
      >
        <table className="w-full overflow-y-auto">
          <thead className="border-b-[1px] border-[#27272A]">
            <tr className="text-left text-sm text-[#A1A1AA]">
              <th className="p-4 pl-6">Name</th>
              <th className="p-4 pl-6">Type</th>
              <th className="p-4 pl-6">Event Id</th>
              <th className="p-4 pl-6">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.map((event) => (
              <tr
                key={event._id}
                className={`border-b-[1px] border-[#27272A] ${
                  event.deleted ? "text-red-400" : ""
                }`}
              >
                <td className="p-4 pl-6">{event.name}</td>
                <td className="p-4 pl-6">
                  <div className="flex items-center gap-3">
                    <MdOutlineMail className="text-[#A1A1AA] text-lg" />
                    {event.type}
                  </div>
                </td>
                <td className="p-4 pl-6">{event._id}</td>
                <td>
                  <DropdownMenu
                    user={event}
                    icon={<SlOptions className="text-[#A1A1AA] text-lg" />}
                    text="actions"
                    options={[
                      "Update Event",
                      "Delete Event",
                      "Substitute",
                      "Create OTSE",
                      "Replace Confirmed",
                    ]}
                    icons={[
                      <MdOutlineModeEditOutline className="text-[#A1A1AA] text-lg" />,
                      <MdDelete className="text-[#A1A1AA] text-lg" />,
                      <IoSwapHorizontalOutline className="text-[#A1A1AA] text-lg" />,
                      <BsFillPersonPlusFill className="text-[#A1A1AA] text-lg" />,
                      <MdFindReplace className="text-[#A1A1AA] text-lg" />,
                    ]}
                    onClickHandlers={[
                      () => setIsUpdateDialogOpen(!isUpdateDialogOpen),
                      () => setIsDeleteDialogOpen(!isDeleteDialogOpen),
                      () => setIsSubstituteDialogOpen(!isSubstituteDialogOpen),
                      () => setIsCreateOtseDialogOpen(!isCreateOtseDialogOpen),
                      () =>
                        setIsReplaceConfirmedDialogOpen(
                          !isReplaceConfirmedDialogOpen
                        ),
                    ]}
                    setSelectedUser={setSelectedEvent}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="5" className="p-4 pl-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[#A1A1AA]">
                    {searchTerm === "" &&
                    Object.values(selectedTypes).every((value) => !value)
                      ? `Showing ${(page - 1) * itemsPerPage + 1} to ${Math.min(
                          page * itemsPerPage,
                          dummyData.length
                        )} of ${dummyData.length} entries`
                      : ""}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="bg-transparent hover:bg-[#27272A] px-3 py-1"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    {[...Array(totalPages)].map((_, index) => (
                      <Button
                        key={index + 1}
                        className={`${
                          page === index + 1
                            ? "bg-[#27272A] hover:bg-[#3F3F46]"
                            : "bg-transparent hover:bg-[#27272A]"
                        } px-3 py-1`}
                        onClick={() => setPage(index + 1)}
                      >
                        {index + 1}
                      </Button>
                    ))}
                    <Button
                      className="bg-transparent hover:bg-[#27272A] px-3 py-1"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default EventsTable;
