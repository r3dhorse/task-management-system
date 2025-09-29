"use client";

import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { DottedSeparator } from "@/components/dotted-separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreateService } from "../api/use-create-service";
import { cn } from "@/lib/utils";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

interface CreateServiceFormProps {
  onCancel?: () => void;
}

export const CreateServiceForm = ({ onCancel }: CreateServiceFormProps) => {
  const workspaceId = useWorkspaceId();
  const { mutate, isPending } = useCreateService();


  type FormData = {
    name: string;
    isPublic: boolean;
    slaDays?: number;
    includeWeekends: boolean;
  };

  const form = useForm<FormData>({
    defaultValues: {
      name: "",
      isPublic: false,
      slaDays: undefined,
      includeWeekends: false,
    },
  });

  const onSubmit = (values: FormData) => {
    const finalValues = {
      name: values.name,
      workspaceId,
      isPublic: values.isPublic ? "true" : "false",
      slaDays: values.slaDays?.toString(),
      includeWeekends: values.includeWeekends ? "true" : "false",
    };

    mutate(
      { form: finalValues },
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
