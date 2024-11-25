import React, { useState } from "react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

const teamOtseSchema = z.object({
  registerer: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
    phoneNumber: z.string().refine((val) => /^[6-9]\d{9}$/.test(val), {
      message: "Enter a valid phone number",
    }),
  }),
  teamName: z.string().min(1, "Team name is required"),
  teamMembers: z.array(
    z.object({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      email: z.string().email("Invalid email"),
      phoneNumber: z.string().refine((val) => /^[6-9]\d{9}$/.test(val), {
        message: "Enter a valid phone number",
      }),
    })
  ),
});

export default function TeamOtseForm({ eventId, teamSize }) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(teamOtseSchema),
    defaultValues: {
      registerer: {
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
      },
      teamName: "",
      teamMembers: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "teamMembers",
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      const dataToSend = { ...data, eventId };

      await axios.post("http://localhost:4534/api/admin/otse-team", dataToSend);
      setIsLoading(false);
      toast({
        title: "OTSE Team registered successfully",
        description: "You will be notified about the next steps",
        variant: "destructive",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "OTSE Team registration failed",
        description: `${
          error?.response?.data?.error || "Something went wrong"
        }`,
        variant: "destructive",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    }
  };

  return (
    <div className="text-white w-full max-h-[calc(80vh-100px)]  overflow-y-scroll scrollbar-hide">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 max-w-3xl text-white mx-auto py-10"
          noValidate
        >
          {/* Registerer Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Registerer Details</h2>
            <FormField
              control={form.control}
              name="registerer.firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
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
            <FormField
              control={form.control}
              name="registerer.lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
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
            <FormField
              control={form.control}
              name="registerer.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter email"
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
              name="registerer.phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="Enter phone number"
                      className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Team Name */}
          <FormField
            control={form.control}
            name="teamName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter team name"
                    className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Team Members Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Team Members</h2>

            {/* Team Member Forms */}
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-4 p-4 border border-[#27272A] rounded-lg relative"
              >
                <Button
                  type="button"
                  onClick={() => remove(index)}
                  variant="ghost"
                  className="absolute right-2 top-2 text-red-500 hover:text-red-700"
                >
                  Remove
                </Button>

                <h3 className="font-semibold">Team Member {index + 1}</h3>

                <FormField
                  control={form.control}
                  name={`teamMembers.${index}.firstName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
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
                <FormField
                  control={form.control}
                  name={`teamMembers.${index}.lastName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
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

                <FormField
                  control={form.control}
                  name={`teamMembers.${index}.email`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter email"
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
                  name={`teamMembers.${index}.phoneNumber`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
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
              </div>
            ))}

            {/* Add Team Member Button - Now positioned after all team member forms */}
            <Button
              type="button"
              onClick={() =>
                append({
                  firstName: "",
                  lastName: "",
                  email: "",
                  phoneNumber: "",
                })
              }
              variant="outline"
              className="bg-white text-black hover:bg-[#cacaca] text-sm px-4 py-2"
              disabled={fields.length >= teamSize.max - 1}
            >
              {fields.length < teamSize.min - 1
                ? `Add Team Member (${
                    teamSize.min - 1 - fields.length
                  } more required)`
                : "Add Team Member"}
            </Button>
          </div>

          <div className="flex justify-center items-center">
            <Button
              type="submit"
              variant="ghost"
              className="bg-white text-black hover:bg-[#cacaca] hover:text-black"
              disabled={isLoading}
            >
              Submit
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
