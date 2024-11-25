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
import { Input } from "@/components/ui/input";
import DialogLoading from "@/components/shared/DialogLoading";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  ccId: z.string().min(1, "CC ID is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export default function CCForm({ handleAddUser }) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ccId: "",
      email: "",
      password: "",
      idProof: null,
    },
  });

  function onSubmit(values) {
    setLoading(true);
    values.type = "CC";
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
          <FormField
            control={form.control}
            name="ccId"
            render={({ field: { ref, ...field } }) => (
              <FormItem>
                <FormLabel className="text-white text-sm tracking-wide font-semibold">
                  CC ID *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter CC ID"
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
