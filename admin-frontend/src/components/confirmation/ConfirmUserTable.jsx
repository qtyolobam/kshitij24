import React, { useState, useEffect } from "react";
import axios from "axios";
import { MdOutlineMail } from "react-icons/md";
import { IoPersonCircleSharp } from "react-icons/io5";
import { SlOptions } from "react-icons/sl";
import { RiTeamFill } from "react-icons/ri";
import { GoPlusCircle } from "react-icons/go";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { CheckboxDropdownMenu } from "@/components/shared/CheckboxDropdownMenu";
import EventRegistrations from "./EventRegistrations";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import Loading from "../shared/Loading";

function ConfirmUserTable() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [data, setData] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState({
    solo: false,
    team: false,
  });

  const [dummyData, setDummyData] = useState([]);

  useEffect(() => {
    setIsLoading(true);
    axios
      .get("http://localhost:4534/api/admin/get-users-for-confirmation")
      .then((res) => {
        setDummyData(res.data.data);
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        toast({
          title: "Error fetching users",
          description: error?.response?.data?.error || "Something went wrong",
          className:
            "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
          variant: "destructive",
        });
      });
  }, []);

  useEffect(() => {
    let filteredData = dummyData.filter((item) =>
      item.eventName.toLowerCase().includes(searchTerm.toLowerCase())
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

  const confirmHandler = async (data) => {
    try {
      if (data.category) {
        if (data.category === "male" || data.category === "female") {
          data.sex = data.category;
          delete data.category;
        } else {
          data.weightCategory = data.category;
          delete data.category;
        }
      }
      data.eventId = selectedEvent.eventId;
      data._id = data.userId.toUpperCase();
      delete data.userId;

      setIsLoading(true);
      await axios.patch(`http://localhost:4534/api/admin/confirm-user`, data);
      toast({
        variant: "destructive",
        title: "Confirmed",
        description: "User confirmed successfully",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Error Confirming",
        description: `${
          error?.response?.data?.error || "Something went wrong"
        }`,
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Toaster />
      {isLoading && <Loading />}

      {showDialog && (
        <Dialog
          open={showDialog}
          onOpenChange={setShowDialog}
          className="bg-[#070707] text-white "
        >
          <DialogContent className="w-fit px-10 bg-[#070707]   text-white outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]">
            <DialogTitle className="text-xl font-semibold text-center">
              User Confirmation
            </DialogTitle>
            <DialogDescription className="text-sm text-[#A1A1AA] text-center">
              Confirm user registrations for this event.
            </DialogDescription>
            {selectedEvent && (
              <EventRegistrations
                event={selectedEvent}
                submitHandler={confirmHandler}
                setDummyData={setDummyData}
                dummyData={dummyData}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

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
            states={["solo", "team"]}
            icons={[
              <IoPersonCircleSharp className="text-[#A1A1AA] text-lg" />,
              <RiTeamFill className="text-[#A1A1AA] text-lg" />,
            ]}
            selectedStates={selectedTypes}
            setSelectedStates={setSelectedTypes}
          />
        </div>
      </div>

      <div
        id="table"
        className="w-full h-[550px] mt-4 border-[1px] border-[#27272A] rounded-lg"
      >
        <table className="w-full overflow-y-auto">
          <thead className="border-b-[1px] border-[#27272A]">
            <tr className="text-left text-sm text-[#A1A1AA]">
              <th className="p-4 pl-6">Name</th>
              <th className="p-4 pl-6">Type</th>
              <th className="p-4 pl-6">Slots</th>
              <th className="p-4 pl-6">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.map((event) => (
              <tr
                key={event.eventId}
                className="border-b-[1px] border-[#27272A]"
              >
                <td className="p-4 pl-6">{event.eventName}</td>
                <td className="p-4 pl-6">
                  <div className="flex items-center gap-3">
                    <MdOutlineMail className="text-[#A1A1AA] text-lg" />
                    {event.type}
                  </div>
                </td>
                <td className="p-4 pl-6 ">
                  {typeof event.eventSlots === "object"
                    ? Object.entries(event.eventSlots).map(([key, value]) => (
                        <span className="mr-5 text-xs" key={key}>
                          {key.toString().toUpperCase()}: {value}
                        </span>
                      ))
                    : event.eventSlots}
                </td>
                <td>
                  <Button
                    className="bg-transparent hover:bg-[#27272A] px-3 py-1"
                    onClick={() => {
                      setSelectedEvent(event);
                      setShowDialog(true);
                    }}
                  >
                    <SlOptions className="text-[#A1A1AA] text-lg" />
                  </Button>
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

export default ConfirmUserTable;
