import React, { useState, useEffect } from "react";
import { GiAbstract101, GiAbstract108, GiAbstract115 } from "react-icons/gi";
import { MdEventAvailable } from "react-icons/md";
import { MdCreateNewFolder } from "react-icons/md";
import { GoPlusCircle } from "react-icons/go";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import BetForm from "./BetForm";
import { Toaster } from "@/components/ui/toaster";
import { CheckboxDropdownMenu } from "@/components/shared/CheckboxDropdownMenu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import Loading from "../shared/Loading";

function BetsTable() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [data, setData] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState({
    POPULAR: false,
    FLAGSHIP: false,
    OTHERS: false,
  });

  const [dummyData, setDummyData] = useState([]);

  const createBetSubmitHandler = async (values) => {
    try {
      console.log(values);

      setIsLoading(true);
      // Call the API to create the bet
      let response = await axios.post(
        "http://localhost:4534/api/admin/create-bet",
        values
      );

      let newBet = response.data.data.bet;
      console.log(newBet);
      // Local state update
      setDummyData([...dummyData, newBet]);
      setIsLoading(false);
      toast({
        title: "Bet created successfully",
        variant: "destructive",
        description: "The bet has been created successfully",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Error creating bet",
        description: error?.response?.data?.error || "Something went wrong",
        variant: "destructive",
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
      .get("http://localhost:4534/api/admin/get-all-bets")
      .then((res) => {
        setDummyData(res.data.data.bets);
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        toast({
          title: "Error fetching bets",
          description: error?.response?.data?.error || "Something went wrong",
        });
      });
  }, []);

  useEffect(() => {
    let filteredData = dummyData.filter(
      (item) =>
        item.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter by type
    const selectedTypesList = Object.entries(selectedTypes)
      .filter(([_, isSelected]) => isSelected)
      .map(([type]) => type.toLowerCase());

    if (selectedTypesList.length > 0) {
      filteredData = filteredData.filter((item) =>
        selectedTypesList.includes(item.type.toLowerCase())
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
            states={["POPULAR", "FLAGSHIP", "OTHERS"]}
            icons={[
              <GiAbstract101 className="text-[#A1A1AA] text-lg" />,
              <GiAbstract108 className="text-[#A1A1AA] text-lg" />,
              <GiAbstract115 className="text-[#A1A1AA] text-lg" />,
            ]}
            selectedStates={selectedTypes}
            setSelectedStates={setSelectedTypes}
          />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-transparent hover:bg-[#27272A] px-3 py-1">
              <MdCreateNewFolder className="text-[#A1A1AA] text-lg" />
              Add Bet
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]">
            <DialogTitle className="text-lg font-semibold text-white">
              Create New Bet
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Fill in the details below to create a new Bet.
            </DialogDescription>
            <BetForm
              isLoading={isLoading}
              submitHandler={createBetSubmitHandler}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div
        id="table"
        className="w-full h-[550px] mt-4 border-[1px] border-[#27272A] rounded-lg"
      >
        <table className="w-full overflow-y-auto">
          <thead className="border-b-[1px] border-[#27272A]">
            <tr className="text-left text-sm text-[#A1A1AA]">
              <th className="p-4 pl-6">User</th>
              <th className="p-4 pl-6">Event Name</th>
              <th className="p-4 pl-6">Type</th>
              <th className="p-4 pl-6">Event Type</th>
              <th className="p-4 pl-6">Amount</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.map((bet) => (
              <tr key={bet._id} className="border-b-[1px] border-[#27272A]">
                <td className="p-4 pl-6">{bet.user}</td>
                <td className="p-4 pl-6">
                  <div className="flex items-center gap-3">
                    <MdEventAvailable className="text-[#A1A1AA] text-lg" />
                    {`${bet.eventName} ${
                      bet.category ? `(${bet.category})` : ""
                    }`}
                  </div>
                </td>
                <td className="p-4 pl-6">{bet.eventType}</td>
                <td className="p-4 pl-6">{bet.type}</td>
                <td className="p-4 pl-6">{bet.amount}</td>
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

export default BetsTable;
