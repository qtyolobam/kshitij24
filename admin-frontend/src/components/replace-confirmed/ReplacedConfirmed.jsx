import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

function ReplacedConfirmed({ eventName, eventId }) {
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  const formSchema = z.object({
    _id: z.string().min(1, "User Id is required"),
    replacementUserId: z.string().min(1, "Replacement User Id is required"),
    sex:
      eventName === "Mr. and Ms. Kshitij"
        ? z.enum(["male", "female"])
        : z.any().optional(),
    weightCategory:
      eventName === "MMA"
        ? z.enum(["lightWeight", "middleWeight", "heavyWeight"])
        : z.any().optional(),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      _id: "",
      replacementUserId: "",
      sex: eventName === "Mr. and Ms. Kshitij" ? "" : undefined,
      weightCategory: eventName === "MMA" ? "" : undefined,
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      if (eventName !== "Mr. and Ms. Kshitij") {
        delete data.sex;
      }
      if (eventName !== "MMA") {
        delete data.weightCategory;
      }

      const dataToSend = { ...data, eventId };
      await axios.patch(
        "http://localhost:4534/api/admin/replace-user",
        dataToSend
      );
      setIsLoading(false);
      toast({
        title: "User replaced successfully",
        description: "User has been replaced successfully",
        variant: "destructive",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Error replacing user",
        description: `${
          error?.response?.data?.error || "Something went wrong"
        }`,
        variant: "destructive",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-red-500 focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-red-500",
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
            name="_id"
            render={({ field: { ref, ...field } }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  User Id *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter User Id"
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
            name="replacementUserId"
            render={({ field: { ref, ...field } }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Replacement User Id *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter Replacement User Id"
                    className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {eventName === "Mr. and Ms. Kshitij" && (
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

          {eventName === "MMA" && (
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

export default ReplacedConfirmed;
