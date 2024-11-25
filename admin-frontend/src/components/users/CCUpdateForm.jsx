import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
  verified: z.enum(["VERIFIED", "REJECTED", ""]).optional(),
  points: z
    .string()
    .refine((val) => !val || !isNaN(Number(val)), "Points must be a number")
    .transform((val) => (val ? Number(val) : undefined))
    .optional(),
});

export default function CCUpdateForm({ isLoading, submitHandler }) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      verified: "",
      points: "",
    },
  });

  async function onSubmit(values) {
    const allFieldsEmpty = Object.values(values).every(
      (value) => !value || value.toString().trim() === ""
    );

    if (allFieldsEmpty) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "At least one field must be filled",
        className:
          "text-white text-sm font-semibold bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]",
      });
      return;
    }

    const data = {};
    for (const [key, value] of Object.entries(values)) {
      if (value && value.toString().trim() !== "") {
        data[key] = value;
      }
    }

    submitHandler(data);
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 max-w-3xl text-white pb-5"
          noValidate
        >
          <FormField
            control={form.control}
            name="email"
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Password
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter a new password"
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
            name="verified"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Verified Status
                </FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange}>
                    <SelectTrigger className="outline-none focus:ring-0 focus:ring-offset-0 ring-0 bg-[#09090B] border-[1px] border-[#27272A]">
                      <SelectValue placeholder="Select verification status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#09090B] border-[#27272A]">
                      <SelectItem className="text-white" value="VERIFIED">
                        VERIFIED
                      </SelectItem>
                      <SelectItem className="text-white" value="REJECTED">
                        REJECTED
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
            name="points"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  Points
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter points"
                    type="number"
                    className="bg-[#09090B] outline-none border-[1px] border-[#27272A] focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-[#353538] focus:border-[#27272A]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-center">
            <Button
              type="submit"
              variant="ghost"
              className="bg-white text-black hover:bg-[#cacaca] hover:text-black"
              disabled={isLoading}
            >
              Update
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
