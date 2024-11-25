import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { MdOutlineClear } from "react-icons/md";
import { useState } from "react";
import DialogLoading from "@/components/shared/DialogLoading";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
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
  password: z.string().min(1, "Password is required"),
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
});

export default function NCPForm({ handleAddUser }) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "",
      idProof: null,
      govtIdProof: null,
    },
  });

  function onSubmit(values) {
    setLoading(true);
    values.type = "NCP";
    console.log(values);
    handleAddUser(values, setLoading);
  }

  return (
    <>
      {loading && <DialogLoading />}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 max-w-3xl text-white mx-auto py-10"
          noValidate
        >
          <div className="grid grid-cols-12 gap-4">
            {/* First Name */}
            <div className="col-span-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm tracking-wide font-semibold">
                      First Name *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter first name"
                        className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Last Name */}
            <div className="col-span-6">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm tracking-wide font-semibold">
                      Last Name *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter last name"
                        className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Email *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter a valid email"
                    type="email"
                    className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone */}
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Phone Number *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your phone number"
                    type="tel"
                    className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field: { ref, ...field } }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Password *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter a strong password"
                    className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            {/* ID Proof field remains the same as it has special handling */}
            <FormField
              control={form.control}
              name="idProof"
              className="text-white"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm tracking-wide font-semibold">
                    Id Proof *
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
                              !file.type.startsWith("application/pdf")
                            ) {
                              form.setError("idProof", {
                                message:
                                  "Please upload a valid image or pdf file",
                              });
                              e.target.value = "";
                              return;
                            }
                            if (file.size > 5 * 1024 * 1024) {
                              form.setError("idProof", {
                                message: "File size must be less than 5MB",
                              });
                              e.target.value = "";
                              return;
                            }
                            onChange(file);
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

            {/* Govt ID Proof field remains the same as it has special handling */}
            <FormField
              control={form.control}
              name="govtIdProof"
              className="text-white"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm tracking-wide font-semibold">
                    Govt ID Proof *
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
                              !file.type.startsWith("application/pdf")
                            ) {
                              form.setError("govtIdProof", {
                                message:
                                  "Please upload a valid image or pdf file",
                              });
                              e.target.value = "";
                              return;
                            }
                            if (file.size > 5 * 1024 * 1024) {
                              form.setError("govtIdProof", {
                                message: "File size must be less than 5MB",
                              });
                              e.target.value = "";
                              return;
                            }
                            onChange(file);
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
          </div>

          <div className="flex justify-center">
            <Button
              type="submit"
              variant="ghost"
              className="bg-white text-black hover:bg-[#cacaca] hover:text-black"
            >
              Submit
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
