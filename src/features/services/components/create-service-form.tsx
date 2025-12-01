"use client";

import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { DottedSeparator } from "@/components/dotted-separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/date-picker";
import { useCreateService } from "../api/use-create-service";
import { cn } from "@/lib/utils";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { RoutinaryFrequency, routinaryFrequencyValues } from "../schemas";

interface CreateServiceFormProps {
  onCancel?: () => void;
}

const frequencyLabels: Record<RoutinaryFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export const CreateServiceForm = ({ onCancel }: CreateServiceFormProps) => {
  const workspaceId = useWorkspaceId();
  const { mutate, isPending } = useCreateService();


  type FormData = {
    name: string;
    isPublic: boolean;
    slaDays?: number;
    includeWeekends: boolean;
    isRoutinary: boolean;
    routinaryFrequency?: RoutinaryFrequency;
    routinaryStartDate?: Date;
  };

  const form = useForm<FormData>({
    defaultValues: {
      name: "",
      isPublic: false,
      slaDays: undefined,
      includeWeekends: false,
      isRoutinary: false,
      routinaryFrequency: undefined,
      routinaryStartDate: undefined,
    },
  });

  const isRoutinary = form.watch("isRoutinary");

  const onSubmit = (values: FormData) => {
    // Build final values - only include routinary fields if isRoutinary is true
    const finalValues: Record<string, string> = {
      name: values.name,
      workspaceId,
      isPublic: values.isPublic ? "true" : "false",
      includeWeekends: values.includeWeekends ? "true" : "false",
      isRoutinary: values.isRoutinary ? "true" : "false",
    };

    // Only include slaDays if it has a value
    if (values.slaDays !== undefined) {
      finalValues.slaDays = values.slaDays.toString();
    }

    // Only include routinary fields if isRoutinary is true and they have values
    if (values.isRoutinary) {
      if (values.routinaryFrequency) {
        finalValues.routinaryFrequency = values.routinaryFrequency;
      }
      if (values.routinaryStartDate) {
        finalValues.routinaryStartDate = values.routinaryStartDate.toISOString();
      }
    }

    mutate(
      { form: finalValues as typeof finalValues & { name: string; workspaceId: string } },
      {
        onSuccess: () => {
          form.reset();
          onCancel?.();
        },
      }
    );
  };


  return (
    <Card className="w-full h-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">Create a new service</CardTitle>
      </CardHeader>
      <div className="px-7">
        <DottedSeparator />
      </div>
      <CardContent className="p-7">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter service name" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slaDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Level Agreement (Days)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        max="365"
                        placeholder="e.g., 5"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      Optional: Set the expected completion time for tasks in this service
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="includeWeekends"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Include Weekends in SLA</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Include Saturday and Sunday when calculating SLA deadlines
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Public Service</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Allow workspace visitors to see this service when creating tasks
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Routinary Toggle */}
              <FormField
                control={form.control}
                name="isRoutinary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-blue-50/50 dark:bg-blue-950/20">
                    <div className="space-y-0.5">
                      <FormLabel className="text-blue-700 dark:text-blue-300">Routinary</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Automatically create recurring tasks for this service
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Conditional Routinary Settings */}
              {isRoutinary && (
                <div className="space-y-4 rounded-lg border border-blue-200 dark:border-blue-800 p-4 bg-blue-50/30 dark:bg-blue-950/10">
                  <FormField
                    control={form.control}
                    name="routinaryFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {routinaryFrequencyValues.map((freq) => (
                              <SelectItem key={freq} value={freq}>
                                {frequencyLabels[freq]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-sm text-muted-foreground">
                          How often should tasks be automatically created
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="routinaryStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select start date"
                          />
                        </FormControl>
                        <div className="text-sm text-muted-foreground">
                          First task will be created on this date, then repeated based on frequency
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <DottedSeparator />
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={isPending}
                  className={cn(!onCancel && "invisible")}
                >
                  Cancel
                </Button>
                <Button type="submit" size="lg" disabled={isPending}>
                  Create Service
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
