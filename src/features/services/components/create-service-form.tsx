"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createServiceSchema } from "../schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { DottedSeparator } from "@/components/dotted-separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateService } from "../api/use-create-service";
import { cn } from "@/lib/utils";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

interface CreateServiceFormProps {
  onCancel?: () => void;
}

export const CreateServiceForm = ({ onCancel }: CreateServiceFormProps) => {
  const workspaceId = useWorkspaceId();
  const { mutate, isPending } = useCreateService();


  const clientSchema = createServiceSchema.omit({ workspaceId: true });

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = (values: z.infer<typeof clientSchema>) => {
    const finalValues = {
      ...values,
      workspaceId,
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
