import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  category: z.string().optional(),
});

export default function EventRegistrations({
  event,
  submitHandler,
  setDummyData,
  dummyData,
}) {
  const [highlightedUser, setHighlightedUser] = useState(null);
  const [isValidId, setIsValidId] = useState(true);
  const [openAccordion, setOpenAccordion] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [confirmed, setConfirmed] = useState([]);

  useEffect(() => {
    const userRegs = Array.isArray(event.userRegistrations)
      ? event.userRegistrations
      : Object.entries(event.userRegistrations).flatMap(([category, users]) =>
          users.map((user) => ({
            userId: user,
            category: category,
          }))
        );

    const confirmedRegs = Array.isArray(event.confirmedUsers)
      ? event.confirmedUsers
      : Object.entries(event.confirmedUsers).flatMap(([category, users]) =>
          users.map((user) => ({
            userId: user,
            category: category,
          }))
        );

    setRegistrations(userRegs);
    setConfirmed(confirmedRegs);
  }, [event]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      category: "",
    },
  });

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "userId" || name === "category") {
        const userId = value.userId?.toLowerCase();
        const category = value.category;
        const isCategoricalEvent =
          Object.keys(event.eventSlots || {}).length > 1;
        if (userId) {
          setOpenAccordion(["registrations"]);
        } else {
          setOpenAccordion([]);
        }

        const foundUser = registrations.find((reg) => {
          if (isCategoricalEvent) {
            // For categorical events (like MMA)
            return (
              reg.userId?.toLowerCase() === userId.toLowerCase() &&
              (!category || reg.category === category)
            );
          } else if (event.type === "team") {
            // For team events
            return reg.teamName.toLowerCase() === userId.toLowerCase();
          } else {
            // For regular solo events

            return typeof reg === "string"
              ? reg.toLowerCase() === userId.toLowerCase()
              : reg.userId?.toLowerCase() === userId.toLowerCase();
          }
        });

        setHighlightedUser(foundUser ? value.userId : null);
        setIsValidId(!!foundUser);
      }
    });

    return () => subscription.unsubscribe();
  }, [form.watch, registrations, event]);

  const onSubmit = async (data) => {
    try {
      if (isValidId) {
        const userId = data.userId.toLowerCase();
        const selectedCategory = data.category;
        const isCategoricalEvent =
          Object.keys(event.eventSlots || {}).length > 1;

        // Find the user with matching userId AND category (if categorical)
        const userToMove = registrations.find((reg) => {
          if (isCategoricalEvent) {
            // For categorical events, check both userId and category
            return (
              reg.userId?.toLowerCase() === userId &&
              reg.category === selectedCategory
            );
          } else {
            // For non-categorical events
            return typeof reg === "string"
              ? reg.toLowerCase() === userId
              : reg.teamName.toLowerCase() === userId;
          }
        });

        // Create submission data
        const submissionData = {
          userId: userId,
          ...(isCategoricalEvent ? { category: selectedCategory } : {}),
        };

        await submitHandler(submissionData);

        if (userToMove) {
          setRegistrations((prev) => prev.filter((reg) => reg !== userToMove));
          setConfirmed((prev) => [...prev, userToMove]);

          // Update dummy data
          const updatedDummyData = dummyData.map((item) => {
            if (item.eventId === event.eventId) {
              if (isCategoricalEvent) {
                // Handle categorical events (like MMA)
                return {
                  ...item,
                  userRegistrations: {
                    ...item.userRegistrations,
                    [selectedCategory]: item.userRegistrations[
                      selectedCategory
                    ].filter((u) => u !== userId),
                  },
                  confirmedUsers: {
                    ...item.confirmedUsers,
                    [selectedCategory]: [
                      ...(item.confirmedUsers[selectedCategory] || []),
                      userId,
                    ],
                  },
                };
              } else {
                // Handle simple events
                return {
                  ...item,
                  userRegistrations: Array.isArray(item.userRegistrations)
                    ? item.userRegistrations.filter((u) =>
                        typeof u === "string"
                          ? u.toLowerCase() !== userId
                          : u.userId?.toLowerCase() !== userId
                      )
                    : item.userRegistrations,
                  confirmedUsers: Array.isArray(item.confirmedUsers)
                    ? [...(item.confirmedUsers || []), userId]
                    : item.confirmedUsers,
                };
              }
            }
            return item;
          });

          setDummyData(updatedDummyData);

          form.reset();
          setHighlightedUser(null);
          setIsValidId(true);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center gap-5  ">
      <div className="form-container flex justify-center border-b border-white pb-10 w-full">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 max-w-3xl  bg-[#070707] text-white w-[200px]"
            noValidate
          >
            <FormField
              control={form.control}
              name="userId"
              render={({ field: { ref, ...field } }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm tracking-wide font-semibold">
                    {event.type === "solo" ? "User ID" : "Team Name"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        event.type === "solo"
                          ? "Enter User ID"
                          : "Enter Team Name"
                      }
                      className={`bg-[#09090B] outline-none border-[1px] 
                        ${
                          !isValidId && field.value
                            ? "border-red-500"
                            : "border-[#27272A]"
                        }
                        focus-visible:ring-1 focus-visible:ring-offset-1 
                        ring-offset-[#353538] focus:border-[#27272A]`}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setOpenAccordion(["registrations"]);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {Object.keys(event.eventSlots || {}).length >= 1 && (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm tracking-wide font-semibold">
                      Category
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-[#09090B] text-white border-[#27272A]">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#09090B] text-white border-[#27272A]  focus:border-none focus:ring-0">
                        {Object.keys(event.eventSlots).map((category) => (
                          <SelectItem
                            key={category}
                            value={category}
                            className="hover:bg-[#27272A] focus:bg-[#27272A]"
                          >
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-center gap-4">
              <Button
                type="submit"
                variant="ghost"
                className="bg-white text-black hover:bg-[#cacaca] hover:text-black"
              >
                Confirm
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div className="flex gap-10">
        <Accordion
          type="multiple"
          value={openAccordion}
          onValueChange={setOpenAccordion}
          className="w-[200px]"
        >
          <AccordionItem value="registrations">
            <AccordionTrigger>Registrations</AccordionTrigger>
            <AccordionContent>
              <div className="registrations-list overflow-y-auto h-[200px]">
                {registrations.map((registration, idx) => {
                  let registrationId;
                  const isCategoricalEvent =
                    Object.keys(event.eventSlots || {}).length > 1;

                  // Determine what to display
                  if (event.type === "team") {
                    registrationId = registration.teamName;
                  } else if (isCategoricalEvent) {
                    registrationId = `${registration.category}: ${registration.userId}`;
                  } else {
                    registrationId =
                      typeof registration === "string"
                        ? registration
                        : registration.userId;
                  }

                  // Determine if item should be highlighted
                  const isHighlighted = (() => {
                    if (event.type === "team") {
                      return (
                        registration.teamName?.toLowerCase() ===
                        highlightedUser?.toLowerCase()
                      );
                    } else if (isCategoricalEvent) {
                      return (
                        registration.userId?.toLowerCase() ===
                          highlightedUser?.toLowerCase() &&
                        registration.category === form.getValues("category")
                      );
                    } else {
                      return (
                        (typeof registration === "string"
                          ? registration.toLowerCase()
                          : registration.userId?.toLowerCase()) ===
                        highlightedUser?.toLowerCase()
                      );
                    }
                  })();

                  return (
                    <p
                      className={`w-[80%] m-2 rounded-md p-2 
                        ${
                          isHighlighted ? "bg-[#27272A]" : "hover:bg-[#27272A]"
                        }`}
                      key={idx}
                    >
                      {registrationId}
                    </p>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Accordion type="single" collapsible className="w-[200px]">
          <AccordionItem value="confirmed">
            <AccordionTrigger>Confirmed</AccordionTrigger>
            <AccordionContent>
              <div className="confirmed-list overflow-y-auto h-[200px]">
                {confirmed.map((confirmed, idx) => {
                  let confirmedId;

                  if (event.type === "solo") {
                    if (
                      typeof confirmed === "object" &&
                      !Array.isArray(confirmed)
                    ) {
                      // Handle categorical confirmations (e.g., MMA categories)
                      confirmedId = `${confirmed.category}: ${confirmed.userId}`;
                    } else {
                      confirmedId = confirmed;
                    }
                  } else if (event.type === "team") {
                    confirmedId = confirmed.teamName;
                  }

                  return (
                    <p
                      className="w-[80%] m-2 hover:bg-[#27272A] rounded-md p-2"
                      key={idx}
                    >
                      {confirmedId}
                    </p>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
