import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function AwardPointsForm({ user }) {
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = z.object({
    eventName: z.string().min(1, "Event name is required"),
    points: z.enum([
      "firstPodium",
      "secondPodium",
      "thirdPodium",
      "qualification",
      "npr",
      "npq",
      "arbitraryPoints",
    ]),
    arbitraryPoints: z.number().optional(),
    sex: z.string().optional(),
    weightCategory: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventName: "",
      points: "",
      arbitraryPoints: 0,
      sex: "",
      weightCategory: "",
    },
  });

  function onSubmit(values) {
    setIsLoading(true);
    // Remove empty fields
    const filteredValues = Object.fromEntries(
      Object.entries(values).filter(([_, value]) => value !== "" && value !== 0)
    );
    if (values.eventName !== "Mr. and Ms. Kshitij") {
      delete filteredValues.sex;
    }
    if (values.eventName !== "MMA") {
      delete filteredValues.weightCategory;
    }
    if (values.points !== "arbitraryPoints") {
      delete filteredValues.arbitraryPoints;
    }
    filteredValues.userId = user._id;
    console.log(filteredValues);
    setIsLoading(false);
  }

  return user.ccId !== undefined ? (
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
            name="eventName"
            render={({ field: { ref, ...field } }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Event Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter event name"
                    type="text"
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
            name="points"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Points
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="outline-none focus:ring-0 focus:ring-offset-0 ring-0 bg-[#09090B] border-[1px] border-[#27272A]">
                      <SelectValue placeholder="Select points" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-[#09090B] border-[#27272A] text-white">
                    <SelectItem value="firstPodium">First Podium</SelectItem>
                    <SelectItem value="secondPodium">Second Podium</SelectItem>
                    <SelectItem value="thirdPodium">Third Podium</SelectItem>
                    <SelectItem value="qualification">Qualification</SelectItem>
                    <SelectItem value="npr">NPR</SelectItem>
                    <SelectItem value="npq">NPQ</SelectItem>
                    <SelectItem value="arbitraryPoints">
                      Arbitrary Points
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("eventName") === "Mr. and Ms. Kshitij" &&
            (form.watch("points") === "firstPodium" ||
              form.watch("points") === "secondPodium" ||
              form.watch("points") === "thirdPodium") && (
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

          {form.watch("eventName") === "MMA" &&
            (form.watch("points") === "firstPodium" ||
              form.watch("points") === "secondPodium" ||
              form.watch("points") === "thirdPodium") && (
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
                        <SelectItem value="lightWeight">
                          Light Weight
                        </SelectItem>
                        <SelectItem value="middleWeight">
                          Middle Weight
                        </SelectItem>
                        <SelectItem value="heavyWeight">
                          Heavy Weight
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

          {form.watch("points") === "arbitraryPoints" && (
            <FormField
              control={form.control}
              name="arbitraryPoints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm tracking-wide font-semibold">
                    Arbitrary Points
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter arbitrary points"
                      className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      {...field}
                      value={field.value || 0}
                      onChange={(e) => {
                        const value = Number(e.target.value);
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
  ) : (
    <div className="text-white w-full p-10">
      <p className="text-center text-md ">
        Cannot award points to non-CC users
      </p>
    </div>
  );
}
