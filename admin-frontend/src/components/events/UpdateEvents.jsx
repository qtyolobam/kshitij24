import { useForm } from "react-hook-form";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

export default function UpdateEvents({
  schema,
  defaultSchemaValues,
  type,
  onSubmit,
  isLoading,
}) {
  // States
  const [slotsType, setSlotsType] = useState("single");

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultSchemaValues,
  });

  return (
    <div className="h-[calc(80vh-100px)] overflow-y-auto scrollbar-hide">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => {
            onSubmit(form.getValues());
          })}
          className="space-y-8 max-w-3xl text-white mx-auto py-10"
          noValidate
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter event name"
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Description
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter description"
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
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Event Type
                </FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="outline-none focus:ring-0 focus:ring-offset-0 ring-0 bg-[#09090B] border-[1px] border-[#27272A]">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#09090B] border-[#27272A]">
                      <SelectItem className="text-white" value="USP">
                        USP
                      </SelectItem>
                      <SelectItem className="text-white" value="FLAGSHIP">
                        FLAGSHIP
                      </SelectItem>
                      <SelectItem className="text-white" value="POPULAR">
                        POPULAR
                      </SelectItem>
                      <SelectItem className="text-white" value="OTHERS">
                        OTHERS
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="slotsType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm tracking-wide font-semibold">
                    Slots Configuration
                  </FormLabel>
                  {/* Slots Type Selector */}
                  <Select
                    defaultValue="single"
                    onValueChange={(value) => {
                      setSlotsType(value);
                    }}
                  >
                    <SelectTrigger className="outline-none focus:ring-0 focus:ring-offset-0 ring-0 bg-[#09090B] border-[1px] border-[#27272A]">
                      <SelectValue placeholder="Select slots type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#09090B] border-[#27272A]">
                      <SelectItem className="text-white" value="single">
                        Single Number
                      </SelectItem>
                      <SelectItem className="text-white" value="custom">
                        Custom Categories
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {slotsType === "custom" && type !== "team" && (
                    <FormField
                      control={form.control}
                      name="slots"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-4">
                            <FormLabel className="text-white text-sm tracking-wide font-semibold">
                              Custom Slots Configuration
                            </FormLabel>

                            <div className="space-y-4">
                              {Object.entries(field.value || {}).map(
                                ([name, value], index) => (
                                  <div
                                    key={index}
                                    className="flex gap-4 items-end"
                                  >
                                    {/* Name Input */}
                                    <div className="flex-1">
                                      <FormLabel className="text-white text-sm tracking-wide font-semibold">
                                        Category Name
                                      </FormLabel>
                                      <Input
                                        placeholder="Enter category name"
                                        className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                                        value={name}
                                        onChange={(e) => {
                                          const newSlots = { ...field.value };
                                          const slotValue = newSlots[name];
                                          delete newSlots[name];
                                          if (e.target.value) {
                                            // Only add if name is not empty
                                            newSlots[e.target.value] =
                                              slotValue;
                                          }
                                          field.onChange(newSlots);
                                        }}
                                      />
                                    </div>

                                    {/* Number Input */}
                                    <div className="flex-1">
                                      <FormLabel className="text-white text-sm tracking-wide font-semibold">
                                        Slots Count
                                      </FormLabel>
                                      <Input
                                        type="number"
                                        placeholder="Enter slots count"
                                        className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={value || ""}
                                        onChange={(e) => {
                                          const newSlots = { ...field.value };
                                          const numValue = e.target.value
                                            ? Number(e.target.value)
                                            : null;
                                          if (name) {
                                            // Only update if category name exists
                                            newSlots[name] = numValue;
                                            field.onChange(newSlots);
                                          }
                                        }}
                                      />
                                    </div>

                                    {/* Remove Button */}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="bg-red-900/20 hover:bg-red-900/40 h-10"
                                      onClick={() => {
                                        const newSlots = { ...field.value };
                                        delete newSlots[name];
                                        field.onChange(newSlots);
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                )
                              )}

                              {/* Add New Slot Button */}
                              <Button
                                type="button"
                                variant="ghost"
                                className="bg-[#09090B] hover:bg-[#18181B] w-full"
                                onClick={() => {
                                  const currentSlots = field.value || {};
                                  const newSlots = {
                                    ...currentSlots,
                                    "": null, // Initialize new slot with empty name and null value
                                  };
                                  field.onChange(newSlots);
                                }}
                              >
                                Add Category
                              </Button>
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}

                  {slotsType === "single" && (
                    <FormField
                      control={form.control}
                      name="slots"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white text-sm tracking-wide font-semibold">
                            Total Slots
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter total slots"
                              className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value
                                  ? Number(e.target.value)
                                  : null;
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormLabel className="text-white text-sm tracking-wide font-semibold">
              Points Configuration
            </FormLabel>

            <div className="space-y-4">
              {Object.entries({
                firstPodium: "First Podium",
                secondPodium: "Second Podium",
                thirdPodium: "Third Podium",
                registration: "Registration",
                qualification: "Qualification",
                npr: "NPR",
                npq: "NPQ",
              }).map(([key, label]) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={`points.${key}`}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex-1">
                        <FormLabel className="text-white text-sm tracking-wide font-semibold">
                          {label}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={`Enter ${label.toLowerCase()} points`}
                            className="bg-[#09090B] outline-none border-[1px] border-[#27272A] mt-2 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            {...field}
                            value={
                              field.value === null || field.value === undefined
                                ? ""
                                : field.value
                            }
                            onChange={(e) => {
                              const value =
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          <FormField
            control={form.control}
            name="eventPhaseType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Event Phase Type
                </FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="outline-none focus:ring-0 focus:ring-offset-0 ring-0 bg-[#09090B] border-[1px] border-[#27272A]">
                      <SelectValue placeholder="Select phase type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#09090B] border-[#27272A]">
                      <SelectItem
                        className="text-white"
                        value="PRE_ELIMS_FINALS"
                      >
                        PRE ELIMS FINALS
                      </SelectItem>
                      <SelectItem className="text-white" value="ELIMS_FINALS">
                        ELIMS FINALS
                      </SelectItem>
                      <SelectItem className="text-white" value="KNOCKOUTS">
                        KNOCKOUTS
                      </SelectItem>
                      <SelectItem className="text-white" value="DIRECT_FINALS">
                        DIRECT FINALS
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Date
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal bg-[#09090B] border-[1px] border-[#27272A] focus:border-[#27272A] hover:bg-[#18181B] outline-none ring-0 focus:ring-0 focus:outline-none hover:text-white",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 bg-[#09090B] border-none"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date ? date.toISOString() : "");
                        form.setValue("date", date ? date.toISOString() : "");
                      }}
                      disabled={(date) => date < new Date("1900-01-01")}
                      className="bg-[#09090B] text-white"
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {type === "team" && (
            <FormField
              control={form.control}
              name="teamMembers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm tracking-wide font-semibold">
                    Team Size
                  </FormLabel>
                  <div className="flex gap-4">
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Min Team Members"
                        className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={field.value?.min || ""}
                        onChange={(e) => {
                          const value = e.target.value
                            ? Number(e.target.value)
                            : null;
                          field.onChange({
                            ...field.value,
                            min: value,
                          });
                        }}
                      />
                    </FormControl>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Max Team Members"
                        className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={field.value?.max || ""}
                        onChange={(e) => {
                          const value = e.target.value
                            ? Number(e.target.value)
                            : null;
                          field.onChange({
                            ...field.value,
                            max: value,
                          });
                        }}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {type === "team" && (
            <FormField
              control={form.control}
              name="npaAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm tracking-wide font-semibold">
                    No of NPA Members
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter no of NPA members"
                      className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value
                          ? Number(e.target.value)
                          : null;
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
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
