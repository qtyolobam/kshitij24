import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Loading from "../shared/Loading";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FaCheck } from "react-icons/fa6";
import { RxCross1 } from "react-icons/rx";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import axios from "axios";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function VerifyUser() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [randomUserData, setRandomUserData] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const handleVerify = async (id, status) => {
    try {
      const data = {
        _id: id,
        verified: status,
      };
      await axios.patch(`http://localhost:4534/api/admin/verify-user`, data);
      setRandomUserData((prevUsers) =>
        prevUsers.filter((user) => user._id !== pendingAction.id)
      );
      toast({
        title: "Successfully verified user",
        description: `User ${
          status === "VERIFIED" ? "verified" : "rejected"
        } successfully`,
        variant: "destructive",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Error verifying user",
        description: `Failed to ${status.toLowerCase()} user ${
          error?.response?.data?.error
        }`,
        variant: "destructive",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (id, status) => {
    setPendingAction({ id, status });
    setShowAlert(true);
  };

  useEffect(() => {
    setIsLoading(true);
    axios
      .get("http://localhost:4534/api/admin/polling-user-data")
      .then((res) => {
        setRandomUserData(res.data.data);
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        toast({
          title: "Error",
          description: `Failed to fetch data: ${err?.response?.data?.error}`,
          className:
            "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
          variant: "destructive",
        });
      });
  }, []);

  return (
    <div className="w-full h-full p-5 flex justify-center items-center">
      <Toaster />
      {isLoading && <Loading />}

      <Dialog>
        <DialogContent className="max-w-4xl bg-[#09090B] border-[#27272A] border-[1px]">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Document Preview"
              className="w-full h-auto object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent className="bg-[#09090B] text-white border-[#27272A] border-[1px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.status === "VERIFIED"
                ? "This action will verify the user's identity. This cannot be undone."
                : "This action will reject the user's verification request. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className=" bg-[#09090B] hover:bg-[#18181B] border-[#27272A] border-[1px] hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                console.log(pendingAction);
                handleVerify(pendingAction.id, pendingAction.status);
                setShowAlert(false);
              }}
              className="bg-[#09090B] border-[#27272A] border-[1px] hover:bg-white hover:text-[#09090B]"
            >
              {pendingAction?.status === "VERIFIED" ? "Verify" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Carousel className="w-full max-w-xl">
        <CarouselContent>
          {randomUserData.map((user, index) => (
            <CarouselItem key={user._id}>
              <div className="p-1">
                <Card className="border-[#27272A] border-[1px]">
                  <CardContent className="flex aspect-[4/3] items-center justify-center p-6 border-transparent">
                    <div className="flex flex-col items-center gap-6 w-full">
                      <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="flex flex-col items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <img
                                src={user.idProofURL.url}
                                alt="ID Proof"
                                className="w-full aspect-square object-cover shadow-lg rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() =>
                                  setSelectedImage(user.idProofURL.url)
                                }
                              />
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl bg-[#09090B] border-[#27272A] border-[1px]">
                              <img
                                src={user.idProofURL.url}
                                alt="ID Proof"
                                className="w-full h-auto object-contain"
                              />
                            </DialogContent>
                            <p className="text-sm text-gray-400 text-center">
                              ID Proof
                            </p>
                          </Dialog>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <img
                                src={user.govtIdProofURL.url}
                                alt="Government ID Proof"
                                className="w-full aspect-square object-cover shadow-lg rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() =>
                                  setSelectedImage(user.govtIdProofURL.url)
                                }
                              />
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl bg-[#09090B] border-[#27272A] border-[1px]">
                              <img
                                src={user.govtIdProofURL.url}
                                alt="Government ID Proof"
                                className="w-full h-auto object-contain"
                              />
                            </DialogContent>
                            <p className="text-sm text-gray-400 text-center">
                              Govt ID Proof
                            </p>
                          </Dialog>
                        </div>
                      </div>

                      <div className="text-center space-y-2 w-full">
                        <h3 className="font-semibold text-2xl">
                          {user.firstName ? user.firstName + " " : ""}
                          {user.lastName ? user.lastName : ""}
                        </h3>
                        <div className="space-y-1">
                          <p className="text-base text-gray-400">
                            <span className="text-gray-300">Email:</span>{" "}
                            {user.email}
                          </p>
                          <p className="text-base text-gray-400">
                            <span className="text-gray-300">Phone Number:</span>{" "}
                            {user.phoneNumber}
                          </p>
                          {user.ccId && (
                            <p className="text-base text-gray-400">
                              <span className="text-gray-300">CC ID:</span>{" "}
                              {user.ccId}
                            </p>
                          )}
                          {user.ncpId && (
                            <p className="text-base text-gray-400">
                              <span className="text-gray-300">NCP ID:</span>{" "}
                              {user.ncpId}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-4 mt-4 justify-center">
                          <Button
                            variant="outline"
                            className="bg-[#09090B] border-[#27272A] border-[1px]"
                            onClick={() =>
                              handleActionClick(user._id, "VERIFIED")
                            }
                          >
                            <FaCheck className="h-6 w-6" />
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-[#09090B] border-[#27272A] border-[1px]"
                            onClick={() =>
                              handleActionClick(user._id, "REJECTED")
                            }
                          >
                            <RxCross1 className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
          {randomUserData.length === 0 && (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-400">No users left to verify</p>
            </div>
          )}
        </CarouselContent>
        {randomUserData.length > 0 && (
          <>
            <CarouselPrevious className="bg-[#09090B] border-[#27272A] border-[1px]" />
            <CarouselNext className="bg-[#09090B] border-[#27272A] border-[1px]" />
          </>
        )}
      </Carousel>
    </div>
  );
}

export default VerifyUser;
