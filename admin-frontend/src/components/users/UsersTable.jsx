import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { CheckboxDropdownMenu } from "@/components/shared/CheckboxDropdownMenu";
import { GoPlusCircle } from "react-icons/go";
import { FaUserGroup } from "react-icons/fa6";
import { MdOutlineMail } from "react-icons/md";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import { SlOptions } from "react-icons/sl";
import { Button } from "@/components/ui/button";
import { MdVerified } from "react-icons/md";
import { GoTrophy } from "react-icons/go";
import { MdCancel } from "react-icons/md";
import { MdOutlinePending } from "react-icons/md";
import { MdOutlineVisibility } from "react-icons/md";
import { MdCreateNewFolder } from "react-icons/md";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { MdOutlineModeEditOutline } from "react-icons/md";
import { MdDelete } from "react-icons/md";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import CCForm from "@/components/users/CCForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import NCPForm from "@/components/users/NCPForm";
import CCUpdateForm from "@/components/users/CCUpdateForm";
import ViewUser from "@/components/view-user-events/ViewUser";
import NCPUpdateForm from "@/components/users/NCPUpdateForm";
import Loading from "@/components/shared/Loading";
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
import AwardPoints from "../award-points/AwardPoints";

function UsersTable() {
  const { toast } = useToast();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVerificationStates, setSelectedVerificationStates] = useState({
    VERIFIED: false,
    REJECTED: false,
    PENDING: false,
  });
  const [selectedTypes, setSelectedTypes] = useState({
    CC: false,
    NCP: false,
  });

  const itemsPerPage = 8;
  const [dummyData, setDummyData] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAwardPointsDialogOpen, setIsAwardPointsDialogOpen] = useState(false);

  const handleAddUser = async (data, setLoading) => {
    try {
      const type = data.type;
      delete data.type;

      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });

      let response = await axios.post(
        `http://localhost:4534/api/admin/create-user/${type}`,
        formData
      );

      response = response.data.data;
      setLoading(false);

      toast({
        title: "User added successfully",
        variant: "destructive",
        description: "The user has been added successfully",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });

      const updatedData = [...dummyData, response.newUser];
      setDummyData(updatedData);
    } catch (error) {
      setLoading(false);
      toast({
        title: "Error adding user",
        variant: "destructive",
        description: `${
          error?.response?.data?.error || "Something went wrong"
        }`,
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
      });
    }
  };

  const handleUpdateUser = async (data) => {
    try {
      let requestData = {
        _id: selectedUser._id,
        userData: data,
      };
      setIsUpdateDialogOpen(true);
      setIsLoading(true);
      await axios.patch(
        `http://localhost:4534/api/admin/update-user`,
        requestData
      );

      setIsLoading(false);
      setIsUpdateDialogOpen(false);

      const updatedData = dummyData.map((user) => {
        if (user.id === selectedUser.id) {
          return { ...user, ...data };
        }
        return user;
      });
      setDummyData(updatedData);
      toast({
        title: "User updated successfully",
        variant: "destructive",
        description: "The user has been updated successfully",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Error updating user",
        variant: "destructive",
        description: `${
          error?.response?.data?.error || "Something went wrong"
        }`,
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setIsLoading(true);

      await axios.delete(
        `http://localhost:4534/api/admin/delete-user/${selectedUser._id}`
      );
      setIsLoading(false);
      setIsDeleteDialogOpen(false);

      const filteredData = dummyData.filter((user) => user.id !== userId);
      setDummyData(filteredData);
      setIsLoading(false);
      toast({
        title: "User deleted successfully",
        variant: "destructive",
        description: "The user has been deleted successfully",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Error deleting user",
        variant: "destructive",
        description: `${
          error?.response?.data?.error || "Something went wrong"
        }`,
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
      });
    }
  };

  useEffect(() => {
    setIsLoading(true);
    axios
      .get("http://localhost:4534/api/admin/get-all-users")
      .then((res) => {
        setDummyData(res.data.data);
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        toast({
          title: "Error fetching users",
          description: `${
            error?.response?.data?.error || "Something went wrong"
          }`,
          className:
            "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
        });
      });
  }, []);

  useEffect(() => {
    let filteredData = dummyData.filter(
      (item) =>
        (item.type === "CC" ? item.ccId : item.ncpId ? item.ncpId : "OTSE")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedVerifications = Object.entries(selectedVerificationStates)
      .filter(([_, isSelected]) => isSelected)
      .map(([state]) => state);

    if (selectedVerifications.length > 0) {
      filteredData = filteredData.filter((item) =>
        selectedVerifications.includes(item.verified)
      );
    }

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
  }, [page, searchTerm, selectedVerificationStates, selectedTypes, dummyData]);

  const getVerificationIcon = (status) => {
    switch (status) {
      case "Verified":
        return <MdVerified className="text-[#A1A1AA] text-lg" />;
      case "Rejected":
        return <MdCancel className="text-[#A1A1AA] text-lg" />;
      case "Pending":
        return <MdOutlinePending className="text-[#A1A1AA] text-lg" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      <Toaster />
      {isLoading && <Loading />}
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
            text="Verified"
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            states={["VERIFIED", "REJECTED", "PENDING"]}
            icons={[
              <MdVerified className="text-[#A1A1AA] text-lg" />,
              <MdCancel className="text-[#A1A1AA] text-lg" />,
              <MdOutlinePending className="text-[#A1A1AA] text-lg" />,
            ]}
            selectedStates={selectedVerificationStates}
            setSelectedStates={setSelectedVerificationStates}
          />
          <CheckboxDropdownMenu
            icon={<GoPlusCircle />}
            text="Type"
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            states={["CC", "NCP"]}
            icons={[
              <HiOutlineBuildingLibrary className="text-[#A1A1AA] text-lg" />,
              <FaUserGroup className="text-[#A1A1AA] text-lg" />,
            ]}
            selectedStates={selectedTypes}
            setSelectedStates={setSelectedTypes}
          />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-transparent hover:bg-[#27272A] px-3 py-1">
              <MdCreateNewFolder className="text-[#A1A1AA] text-lg" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-h-[85vh] overflow-y-auto scrollbar-hide bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]">
            <DialogTitle className="text-lg font-semibold text-white">
              Create New User
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Fill in the details below to create a new user account.
            </DialogDescription>

            <Tabs defaultValue="cc" className="w-full text-white ">
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
              <div className="mt-4">
                <TabsContent value="cc">
                  <CCForm handleAddUser={handleAddUser} />
                </TabsContent>
                <TabsContent value="ncp">
                  <NCPForm handleAddUser={handleAddUser} />
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {selectedUser && (
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="w-full bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]">
            <DialogTitle className="text-lg font-semibold text-white">
              Update User
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Update the user details below. Only fill in the fields you want to
              change.
            </DialogDescription>
            {selectedUser?.type === "CC" ? (
              <CCUpdateForm
                isLoading={isLoading}
                submitHandler={handleUpdateUser}
              />
            ) : (
              <NCPUpdateForm
                isLoading={isLoading}
                submitHandler={handleUpdateUser}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {selectedUser && (
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent className="w-full bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]">
            <AlertDialogHeader className="text-lg font-semibold text-white">
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-400">
                This action cannot be undone. This will delete the user from the
                database.
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
                onClick={() => handleDeleteUser(selectedUser.id)}
                className="bg-white text-[#09090B] hover:bg-[#27272A] hover:text-white border-[2px] border-[#27272A] font-medium"
                disabled={isLoading}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedUser && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="w-fit h-fit max-w-fit max-h-fit bg-[#09090B] p-0 outline-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 ring-offset-transparent focus:border-transparent">
            <ViewUser user={selectedUser} />
          </DialogContent>
        </Dialog>
      )}

      {selectedUser && (
        <Dialog
          open={isAwardPointsDialogOpen}
          onOpenChange={setIsAwardPointsDialogOpen}
        >
          <DialogContent className="w-full bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]">
            <DialogTitle className="text-lg font-semibold text-white">
              Award Points
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Fill in the details below to award points to the user.
            </DialogDescription>
            <AwardPoints user={selectedUser} />
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
              <th className="p-4 pl-6">ID</th>
              <th className="p-4 pl-6">Email</th>
              <th className="p-4 pl-6">Verified</th>
              <th className="p-4 pl-6">Type</th>
              <th>&nbsp;</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.map((user) => (
              <tr
                key={user._id}
                className={`border-b-[1px] border-[#27272A] ${
                  user.deleted ? "text-red-400/70" : ""
                } ${user.verified === "REJECTED" ? "text-white/20" : ""}`}
              >
                <td className={`p-4 pl-6`}>
                  {user.type === "CC"
                    ? user.ccId
                    : user.ncpId
                    ? user.ncpId
                    : "OTSE"}
                </td>
                <td className="p-4 pl-6">
                  <div className="flex items-center gap-3">
                    <MdOutlineMail className="text-[#A1A1AA] text-lg" />
                    {user.email}
                  </div>
                </td>
                <td className="p-4 pl-6">
                  <div className="flex items-center gap-3">
                    {getVerificationIcon(user.verified || "VERIFIED")}
                    {user.verified ? user.verified : "VERIFIED"}
                  </div>
                </td>
                <td className="p-4 pl-6">
                  <div className="flex items-center gap-3">
                    {user.type === "CC" ? (
                      <HiOutlineBuildingLibrary className="text-[#A1A1AA] text-lg" />
                    ) : (
                      <FaUserGroup className="text-[#A1A1AA] text-lg" />
                    )}
                    {user.type ? user.type : "OTSE"}
                  </div>
                </td>
                <td>
                  <DropdownMenu
                    user={user}
                    icon={<SlOptions className="text-[#A1A1AA] text-lg" />}
                    text="actions"
                    options={[
                      "Update User",
                      "Delete User",
                      "View User",
                      "Award Points",
                    ]}
                    icons={[
                      <MdOutlineModeEditOutline className="text-[#A1A1AA] text-lg" />,
                      <MdDelete className="text-[#A1A1AA] text-lg" />,
                      <MdOutlineVisibility className="text-[#A1A1AA] text-lg" />,
                      <GoTrophy className="text-[#A1A1AA] text-lg" />,
                    ]}
                    onClickHandlers={[
                      () => setIsUpdateDialogOpen(!isUpdateDialogOpen),
                      () => setIsDeleteDialogOpen(!isDeleteDialogOpen),
                      () => setIsViewDialogOpen(!isViewDialogOpen),
                      () =>
                        setIsAwardPointsDialogOpen(!isAwardPointsDialogOpen),
                    ]}
                    setSelectedUser={setSelectedUser}
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
                    {searchTerm === ""
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

export default UsersTable;
