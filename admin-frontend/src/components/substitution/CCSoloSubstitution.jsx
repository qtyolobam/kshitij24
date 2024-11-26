import { useForm } from "react-hook-form";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { MdOutlineClear } from "react-icons/md";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import DialogLoading from "@/components/shared/DialogLoading";
import { Switch } from "@/components/ui/switch";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

const formSchema = z
  .object({
    userId: z.string().min(1, "User ID is required"),
    substituteData: z.object({
      firstName: z.string().min(1, "First Name is required"),
      lastName: z.string().min(1, "Last Name is required"),
      phoneNumber: z
        .string()
        .min(1, "Phone number is required")
        .refine(
          (phone) => {
            const phoneRegex = /^[6-9]\d{9}$/;
            return phoneRegex.test(phone);
          },
          {
            message: "Enter a valid phone number",
          }
        ),
      email: z.string().email("Invalid email"),
      idProof: z
        .custom((value) => value instanceof File, {
          message: "ID Proof is required",
        })
        .refine((file) => file instanceof File, {
          message: "ID Proof is required",
        }),
      govtIdProof: z
        .custom((value) => value instanceof File, {
          message: "Government ID Proof is required",
        })
        .refine((file) => file instanceof File, {
          message: "Government ID Proof is required",
        }),
    }),
    isDummy: z.boolean(),
    toBeReplacedUser: z.union([
      // When isDummy is true, accept any shape or null
      z.any(),
      // When isDummy is false, validate the object
      z.object({
        firstName: z.string().min(1, "First Name is required"),
        lastName: z.string().min(1, "Last Name is required"),
        phoneNumber: z
          .string()
          .min(1, "Phone number is required")
          .refine(
            (phone) => {
              const phoneRegex = /^[6-9]\d{9}$/;
              return phoneRegex.test(phone);
            },
            {
              message: "Enter a valid phone number",
            }
          ),
      }),
    ]),
  })
  .refine(
    (data) => {
      // If isDummy is false, toBeReplacedUser must be present and valid
      if (!data.isDummy) {
        return (
          data.toBeReplacedUser &&
          typeof data.toBeReplacedUser === "object" &&
          data.toBeReplacedUser.firstName &&
          data.toBeReplacedUser.lastName &&
          /^[6-9]\d{9}$/.test(data.toBeReplacedUser.phoneNumber)
        );
      }
      return true;
    },
    {
      message:
        "User to be replaced details are required when not a dummy substitution",
      path: ["toBeReplacedUser"],
    }
  )
  .optional();

export default function CCSoloSubstitution({ eventId }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      substituteData: {
        firstName: "",
        lastName: "",
        phoneNumber: "",
        email: "",
        idProof: null,
        govtIdProof: null,
      },
      isDummy: false,
      toBeReplacedUser: {
        firstName: "",
        lastName: "",
        phoneNumber: "",
      },
    },
  });

  async function onSubmit(values) {
    try {
      setLoading(true);
      const formattedData = {
        userId: values.userId,
        eventId,
        isDummy: values.isDummy,
        substituteData: {
          firstName: values.substituteData.firstName,
          lastName: values.substituteData.lastName,
          phoneNumber: values.substituteData.phoneNumber,
          email: values.substituteData.email,
        },
        idProof: values.substituteData.idProof,
        govtIdProof: values.substituteData.govtIdProof,
      };

      if (!values.isDummy) {
        formattedData.toBeReplacedUser = {
          firstName: values.toBeReplacedUser.firstName,
          lastName: values.toBeReplacedUser.lastName,
          phoneNumber: values.toBeReplacedUser.phoneNumber,
        };
      }

      const formData = new FormData();

      // Handle nested objects by converting them to JSON strings
      Object.entries(formattedData).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === "object" && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      });

      await axios.patch(
        "http://localhost:4534/api/admin/substitute-entries-for-solo",
        formData
      );

      setLoading(false);
      toast({
        title: "Substitution successful",
        variant: "destructive",
        description: "Substituted successfully",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
      console.log(formattedData);
    } catch (error) {
      setLoading(false);
      toast({
        title: "Error substituting",
        description: error?.response?.data?.error || "Something went wrong",
        variant: "destructive",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
      });
    }
  }

  return (
    <div className="h-[calc(80vh-100px)] overflow-y-auto scrollbar-hide">
      {loading && <DialogLoading />}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(
            () => {
              onSubmit(form.getValues());
            },
            (errors) => {
              console.log(errors);
            }
          )}
          className="w-full space-y-8 max-w-3xl text-white mx-auto py-10"
          noValidate
        >
          <FormField
            control={form.control}
            name="isDummy"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="flex items-center space-x-5">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="bg-[#27272A] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A] data-[state=checked]:bg-[#ffffff] data-[state=checked]:border-[#ffffff] data-[state=unchecked]:bg-[#27272A] [&_span[data-state]]:bg-black"
                    />
                    <Label className="text-white text-sm " htmlFor="isDummy">
                      Is Dummy?
                    </Label>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="userId"
            render={({ field: { ref, ...field } }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  User ID
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter User ID"
                    className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="substituteData.firstName"
            className="text-white"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  First Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter First Name"
                    type="text"
                    className="w-full text-white bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="pl-0" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="substituteData.lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Last Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter Last Name"
                    className="w-full text-white bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="pl-0" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="substituteData.email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter email"
                    type="email"
                    className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="substituteData.phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Phone Number
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter phone number"
                    className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="substituteData.idProof"
            className="text-white"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Id Proof
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*, .pdf"
                      className="w-full text-white bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          if (
                            !file.type.startsWith("image/") &&
                            file.type !== "application/pdf"
                          ) {
                            form.setError("substituteData.idProof", {
                              message:
                                "Please upload a valid image file or PDF",
                            });
                            e.target.value = "";
                            return;
                          }

                          if (file.size > 5 * 1024 * 1024) {
                            form.setError("substituteData.idProof", {
                              message: "File size must be less than 5MB",
                            });
                            e.target.value = "";
                            return;
                          }
                          onChange(file);
                          form.setValue("substituteData.idProof", file);
                        }
                      }}
                      {...field}
                      value={undefined}
                    />
                    {value && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1 hover:bg-transparent"
                        onClick={() => {
                          onChange(null);
                          form.setValue("substituteData.idProof", null);
                          const fileInput =
                            document.querySelector('input[type="file"]');
                          if (fileInput) fileInput.value = "";
                        }}
                      >
                        <MdOutlineClear className="text-white" />
                      </Button>
                    )}
                  </div>
                </FormControl>
                <FormMessage className="pl-0" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="substituteData.govtIdProof"
            className="text-white"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Government ID Proof
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*, .pdf"
                      className="w-full text-white bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          if (
                            !file.type.startsWith("image/") &&
                            file.type !== "application/pdf"
                          ) {
                            form.setError("substituteData.govtIdProof", {
                              message:
                                "Please upload a valid image file or PDF",
                            });
                            e.target.value = "";
                            return;
                          }

                          if (file.size > 5 * 1024 * 1024) {
                            form.setError("substituteData.govtIdProof", {
                              message: "File size must be less than 5MB",
                            });
                            e.target.value = "";
                            return;
                          }
                          onChange(file);
                          form.setValue("substituteData.govtIdProof", file);
                        }
                      }}
                      {...field}
                      value={undefined}
                    />
                    {value && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1 hover:bg-transparent"
                        onClick={() => {
                          onChange(null);
                          form.setValue("substituteData.govtIdProof", null);
                          const fileInput =
                            document.querySelector('input[type="file"]');
                          if (fileInput) fileInput.value = "";
                        }}
                      >
                        <MdOutlineClear className="text-white" />
                      </Button>
                    )}
                  </div>
                </FormControl>
                <FormMessage className="pl-0" />
              </FormItem>
            )}
          />

          {!form.watch("isDummy") && (
            <div className="space-y-8 border border-[#27272A] p-4 rounded-lg">
              <h3 className="text-white font-semibold">User to be Replaced</h3>

              <FormField
                control={form.control}
                name="toBeReplacedUser.firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm tracking-wide font-semibold">
                      First Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter First Name"
                        className="w-full text-white bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="toBeReplacedUser.lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm tracking-wide font-semibold">
                      Last Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter Last Name"
                        className="w-full text-white bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="toBeReplacedUser.phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm tracking-wide font-semibold">
                      Phone Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter phone number"
                        className="w-full text-white bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="flex justify-center items-center">
            <Button
              type="submit"
              variant="ghost"
              className="bg-white text-black hover:bg-[#cacaca] hover:text-black"
            >
              Substitute
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
