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
import { useForm } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

export default function SoloOtseForm({ event }) {
  const { toast } = useToast();
  const soloOtseSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phoneNumber: z.string().refine((val) => /^[6-9]\d{9}$/.test(val), {
      message: "Enter a valid phone number",
    }),
    sex:
      event.name === "Mr. and Ms. Kshitij"
        ? z.enum(["male", "female"])
        : z.any().optional(),
    weightCategory:
      event.name === "MMA"
        ? z.enum(["lightWeight", "middleWeight", "heavyWeight"])
        : z.any().optional(),
  });

  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(soloOtseSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      sex: event.name === "Mr. and Ms. Kshitij" ? "" : undefined,
      weightCategory: event.name === "MMA" ? "" : undefined,
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      if (event.name !== "Mr. and Ms. Kshitij") {
        delete data.sex;
      }
      if (event.name !== "MMA") {
        delete data.weightCategory;
      }
      await axios.post("http://localhost:4534/api/admin/otse-solo", {
        ...data,
        eventId: event._id,
      });
      setIsLoading(false);
      toast({
        title: "OTSE Solo registered successfully",
        description: "You will be notified about the next steps",
        variant: "destructive",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } catch (error) {
      setIsLoading(false);
      console.log(error);
      toast({
        title: "OTSE Solo registration failed",
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
    <div className="text-white w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.log(errors);
          })}
          className="space-y-8 max-w-3xl text-white mx-auto py-10"
          noValidate
        >
          <FormField
            control={form.control}
            name="firstName"
            render={({ field: { ref, ...field } }) => (
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

          <FormField
            control={form.control}
            name="lastName"
            render={({ field: { ref, ...field } }) => (
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

          <FormField
            control={form.control}
            name="email"
            render={({ field: { ref, ...field } }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Email *
                </FormLabel>
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
            name="phoneNumber"
            render={({ field: { ref, ...field } }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Phone Number *
                </FormLabel>
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

          {event.name === "Mr. and Ms. Kshitij" && (
            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm tracking-wide font-semibold">
                    Sex (Only for Mr. and Ms. Kshitij)
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="outline-none focus:ring-0 focus:ring-offset-0 ring-0 bg-[#09090B] border-[1px] border-[#27272A]">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#09090B] border-[#27272A] text-white">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {event.name === "MMA" && (
            <FormField
              control={form.control}
              name="weightCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm tracking-wide font-semibold">
                    Weight Category (Only for MMA)
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="outline-none focus:ring-0 focus:ring-offset-0 ring-0 bg-[#09090B] border-[1px] border-[#27272A]">
                        <SelectValue placeholder="Select weight category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#09090B] border-[#27272A] text-white">
                      <SelectItem value="lightWeight">Light Weight</SelectItem>
                      <SelectItem value="middleWeight">
                        Middle Weight
                      </SelectItem>
                      <SelectItem value="heavyWeight">Heavy Weight</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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
