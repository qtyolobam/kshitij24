import { useForm, useFieldArray } from "react-hook-form";
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
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

const memberSchema = z.object({
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
  idProof: z.custom((value) => value instanceof File, {
    message: "ID Proof is required",
  }),
  govtIdProof: z.custom((value) => value instanceof File, {
    message: "Government ID Proof is required",
  }),
});

const replacementMemberSchema = z.object({
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
});

const formSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  isDummy: z.boolean(),
  substituteData: z.object({
    teamMembers: z.array(memberSchema),
    npaMembers: z.array(memberSchema),
  }),
  toBeReplacedUser: z.object({
    teamMembers: z.array(replacementMemberSchema),
    npaMembers: z.array(replacementMemberSchema),
  }),
});

export default function CCTeamSubstitution({ eventId }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      isDummy: false,
      substituteData: {
        teamMembers: [],
        npaMembers: [],
      },
      toBeReplacedUser: {
        teamMembers: [],
        npaMembers: [],
      },
    },
  });

  const {
    fields: teamFields,
    append: appendTeam,
    remove: removeTeam,
  } = useFieldArray({
    control: form.control,
    name: "substituteData.teamMembers",
  });

  const {
    fields: npaFields,
    append: appendNpa,
    remove: removeNpa,
  } = useFieldArray({
    control: form.control,
    name: "substituteData.npaMembers",
  });

  const {
    fields: replaceTeamFields,
    append: appendReplaceTeam,
    remove: removeReplaceTeam,
  } = useFieldArray({
    control: form.control,
    name: "toBeReplacedUser.teamMembers",
  });

  const {
    fields: replaceNpaFields,
    append: appendReplaceNpa,
    remove: removeReplaceNpa,
  } = useFieldArray({
    control: form.control,
    name: "toBeReplacedUser.npaMembers",
  });

  function onSubmit(values) {
    try {
      setLoading(true);

      // Common validation for both isDummy true and false
      // Validate Team Members images
      const teamMembersLen = values.substituteData.teamMembers.length;
      const teamImagesLen = values.substituteData.teamMembers.filter(
        (member) => member.idProof
      ).length;

      const teamGovtIdProofLen = values.substituteData.teamMembers.filter(
        (member) => member.govtIdProof
      ).length;

      if (
        teamMembersLen !== teamImagesLen ||
        teamMembersLen !== teamGovtIdProofLen
      ) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Each team member must have an ID proof image",
        });
        setLoading(false);
        return;
      }

      // Validate NPA Members images
      const npaMembersLen = values.substituteData.npaMembers.length;
      const npaImagesLen = values.substituteData.npaMembers.filter(
        (member) => member.idProof
      ).length;

      const npaGovtIdProofLen = values.substituteData.npaMembers.filter(
        (member) => member.govtIdProof
      ).length;

      if (
        npaMembersLen !== npaImagesLen ||
        npaMembersLen !== npaGovtIdProofLen
      ) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Each NPA member must have an ID proof image",
        });
        setLoading(false);
        return;
      }

      // Additional validation for non-dummy case
      if (!values.isDummy) {
        const replaceTeamMembersLen =
          values.toBeReplacedUser.teamMembers.length;
        const replaceNpaMembersLen = values.toBeReplacedUser.npaMembers.length;

        if (teamMembersLen !== replaceTeamMembersLen) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description:
              "Number of new team members must match number of members to be replaced",
          });
          setLoading(false);
          return;
        }

        if (npaMembersLen !== replaceNpaMembersLen) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description:
              "Number of new NPA members must match number of members to be replaced",
          });
          setLoading(false);
          return;
        }
      }

      // Rest of your formatting code remains the same
      const formattedData = {
        userId: values.userId,
        eventId,
        isDummy: values.isDummy,
        substituteData: {
          teamMembers: values.substituteData.teamMembers.map(
            ({ idProof, govtIdProof, ...member }) => ({
              firstName: member.firstName,
              lastName: member.lastName,
              phoneNumber: member.phoneNumber,
              email: member.email,
            })
          ),
          npaMembers: values.substituteData.npaMembers.map(
            ({ idProof, govtIdProof, ...member }) => ({
              firstName: member.firstName,
              lastName: member.lastName,
              phoneNumber: member.phoneNumber,
              email: member.email,
            })
          ),
        },
        teamMembers: values.substituteData.teamMembers.map(
          (member) => member.idProof
        ),
        npaMembers: values.substituteData.npaMembers.map(
          (member) => member.idProof
        ),
        teamMembersGovtIdProof: values.substituteData.teamMembers.map(
          (member) => member.govtIdProof
        ),
        npaMembersGovtIdProof: values.substituteData.npaMembers.map(
          (member) => member.govtIdProof
        ),
      };

      if (!values.isDummy) {
        formattedData.toBeReplacedUser = {
          teamMembers: values.toBeReplacedUser.teamMembers.map((member) => ({
            firstName: member.firstName,
            lastName: member.lastName,
            phoneNumber: member.phoneNumber,
          })),
          npaMembers: values.toBeReplacedUser.npaMembers.map((member) => ({
            firstName: member.firstName,
            lastName: member.lastName,
            phoneNumber: member.phoneNumber,
          })),
        };
      }

      console.log(formattedData);
      form.reset();
      toast({
        title: "Success",
        description: "Form submitted successfully",
      });

      setLoading(false);
    } catch (error) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
      setLoading(false);
    }
  }

  const renderMemberFields = (fields, remove, type) => {
    return fields.map((field, index) => (
      <div
        key={field.id}
        className="space-y-8 border border-[#27272A] p-4 rounded-lg"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-white font-semibold">
            {type} Member {index + 1}
          </h3>
          <Button
            type="button"
            variant="ghost"
            onClick={() => remove(index)}
            className="text-white hover:text-red-500"
          >
            Remove
          </Button>
        </div>

        {/* Member form fields */}
        <FormField
          control={form.control}
          name={`substituteData.${type.toLowerCase()}Members.${index}.firstName`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">First Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-[#09090B] text-white border-[#27272A]"
                  placeholder="First Name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`substituteData.${type.toLowerCase()}Members.${index}.lastName`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Last Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-[#09090B] text-white border-[#27272A]"
                  placeholder="Last Name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`substituteData.${type.toLowerCase()}Members.${index}.phoneNumber`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Phone Number</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-[#09090B] text-white border-[#27272A]"
                  placeholder="Phone Number"
                  type="tel"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`substituteData.${type.toLowerCase()}Members.${index}.email`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-[#09090B] text-white border-[#27272A]"
                  placeholder="Email"
                  type="email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`substituteData.${type.toLowerCase()}Members.${index}.idProof`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">ID Proof</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*, .pdf"
                    className="bg-[#09090B] text-white border-[#27272A]"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        if (
                          !file.type.startsWith("image/") &&
                          file.type !== "application/pdf"
                        ) {
                          form.setError(
                            `substituteData.${type.toLowerCase()}Members.${index}.idProof`,
                            {
                              message:
                                "Please upload a valid image file or PDF",
                            }
                          );
                          e.target.value = "";
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          form.setError(
                            `substituteData.${type.toLowerCase()}Members.${index}.idProof`,
                            {
                              message: "File size must be less than 5MB",
                            }
                          );
                          e.target.value = "";
                          return;
                        }
                        field.onChange(file);
                      }
                    }}
                    value={undefined}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`substituteData.${type.toLowerCase()}Members.${index}.govtIdProof`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Government ID Proof</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*, ./pdf"
                    className="bg-[#09090B] text-white border-[#27272A]"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        if (
                          !file.type.startsWith("image/") &&
                          file.type !== "application/pdf"
                        ) {
                          form.setError(
                            `substituteData.${type.toLowerCase()}Members.${index}.govtIdProof`,
                            {
                              message:
                                "Please upload a valid image file or PDF",
                            }
                          );
                          e.target.value = "";
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          form.setError(
                            `substituteData.${type.toLowerCase()}Members.${index}.govtIdProof`,
                            {
                              message: "File size must be less than 5MB",
                            }
                          );
                          e.target.value = "";
                          return;
                        }
                        field.onChange(file);
                      }
                    }}
                    value={undefined}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    ));
  };

  const renderReplacementFields = (fields, remove, type) => {
    return fields.map((field, index) => (
      <div
        key={field.id}
        className="space-y-8 border border-[#27272A] p-4 rounded-lg"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-white font-semibold">
            Replace {type} Member {index + 1}
          </h3>
          <Button
            type="button"
            variant="ghost"
            onClick={() => remove(index)}
            className="text-white hover:text-red-500"
          >
            Remove
          </Button>
        </div>

        {/* Only firstName, lastName, phoneNumber fields */}
        <FormField
          control={form.control}
          name={`toBeReplacedUser.${type.toLowerCase()}Members.${index}.firstName`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">First Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-[#09090B] text-white border-[#27272A]"
                  placeholder="First Name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`toBeReplacedUser.${type.toLowerCase()}Members.${index}.lastName`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Last Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-[#09090B] text-white border-[#27272A]"
                  placeholder="Last Name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`toBeReplacedUser.${type.toLowerCase()}Members.${index}.phoneNumber`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Phone Number</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-[#09090B] text-white border-[#27272A]"
                  placeholder="Phone Number"
                  type="tel"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    ));
  };

  return (
    <div className="h-[calc(80vh-100px)] overflow-y-auto scrollbar-hide">
      {loading && <DialogLoading />}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 max-w-3xl mx-auto py-10"
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

          <div className="space-y-6">
            {form.watch("isDummy") ? (
              // Dummy mode - original form
              <>
                <div className="space-y-4">
                  <h2 className="text-white font-semibold text-lg">
                    Team Members
                  </h2>
                  {renderMemberFields(teamFields, removeTeam, "Team")}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      appendTeam({
                        firstName: "",
                        lastName: "",
                        phoneNumber: "",
                        email: "",
                        idProof: null,
                        govtIdProof: null,
                      })
                    }
                    className="bg-[#09090B] text-white border-[#27272A] hover:bg-[#27272A] hover:text-white"
                  >
                    Add Team Member
                  </Button>
                </div>

                <div className="space-y-4">
                  <h2 className="text-white font-semibold text-lg">
                    NPA Members
                  </h2>
                  {renderMemberFields(npaFields, removeNpa, "NPA")}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      appendNpa({
                        firstName: "",
                        lastName: "",
                        phoneNumber: "",
                        email: "",
                        idProof: null,
                        govtIdProof: null,
                      })
                    }
                    className="bg-[#09090B] text-white border-[#27272A] hover:bg-[#27272A] hover:text-white"
                  >
                    Add NPA Member
                  </Button>
                </div>
              </>
            ) : (
              // Non-dummy mode - both new and replacement forms
              <>
                <div className="space-y-4">
                  <h2 className="text-white font-semibold text-lg">
                    Team Members
                  </h2>
                  {renderMemberFields(teamFields, removeTeam, "Team")}
                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        appendTeam({
                          firstName: "",
                          lastName: "",
                          phoneNumber: "",
                          email: "",
                          idProof: null,
                          govtIdProof: null,
                        })
                      }
                      className="bg-[#09090B] text-white border-[#27272A] hover:bg-[#27272A] hover:text-white"
                    >
                      Add Team Member
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        appendReplaceTeam({
                          firstName: "",
                          lastName: "",
                          phoneNumber: "",
                        })
                      }
                      className="bg-[#09090B] text-white border-[#27272A] hover:bg-[#27272A] hover:text-white"
                    >
                      Add To Replace Team Member
                    </Button>
                  </div>
                  {renderReplacementFields(
                    replaceTeamFields,
                    removeReplaceTeam,
                    "Team"
                  )}
                </div>

                <div className="space-y-4">
                  <h2 className="text-white font-semibold text-lg">
                    NPA Members
                  </h2>
                  {renderMemberFields(npaFields, removeNpa, "NPA")}
                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        appendNpa({
                          firstName: "",
                          lastName: "",
                          phoneNumber: "",
                          email: "",
                          idProof: null,
                          govtIdProof: null,
                        })
                      }
                      className="bg-[#09090B] text-white border-[#27272A] hover:bg-[#27272A] hover:text-white"
                    >
                      Add NPA Member
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        appendReplaceNpa({
                          firstName: "",
                          lastName: "",
                          phoneNumber: "",
                        })
                      }
                      className="bg-[#09090B] text-white border-[#27272A] hover:bg-[#27272A] hover:text-white"
                    >
                      Add To Replace NPA Member
                    </Button>
                  </div>
                  {renderReplacementFields(
                    replaceNpaFields,
                    removeReplaceNpa,
                    "NPA"
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              type="submit"
              className="bg-white text-black hover:bg-[#cacaca]"
            >
              Submit
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
