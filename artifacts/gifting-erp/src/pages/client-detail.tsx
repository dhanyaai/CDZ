import { useState } from "react";
import { Link } from "wouter";
import { useGetClient, useListClientInteractions, useCreateClientInteraction, getGetClientQueryKey, getListClientInteractionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Phone, Mail, MapPin, Building, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ContactsCard, ActivitiesCard } from "@/components/client-extras";

const interactionSchema = z.object({
  type: z.enum(["call", "email", "meeting"]),
  notes: z.string().min(1, "Notes are required"),
});

export function ClientDetail({ id }: { id: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: client, isLoading: isClientLoading } = useGetClient(id, { query: { enabled: !!id, queryKey: getGetClientQueryKey(id) } });
  const { data: interactions, isLoading: isInteractionsLoading } = useListClientInteractions(id, { query: { enabled: !!id, queryKey: getListClientInteractionsQueryKey(id) } });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createInteraction = useCreateClientInteraction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientInteractionsQueryKey(id) });
        setDialogOpen(false);
        form.reset();
        toast({ title: "Interaction logged" });
      }
    }
  });

  const form = useForm<z.infer<typeof interactionSchema>>({
    resolver: zodResolver(interactionSchema),
    defaultValues: { type: "call", notes: "" }
  });

  const onSubmit = (data: z.infer<typeof interactionSchema>) => {
    createInteraction.mutate({ id, data });
  };

  if (isClientLoading) {
    return <div className="space-y-6"><Skeleton className="h-20 w-full" /><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Skeleton className="h-[400px]" /><Skeleton className="h-[400px]" /></div></div>;
  }

  if (!client) {
    return <div>Client not found</div>;
  }

  const tagList = client.tags ? client.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-6">
      <Link href="/clients" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clients
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {client.companyName}
            {client.industry && <Badge>{client.industry}</Badge>}
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Building className="w-4 h-4" /> {client.contactPerson}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Log Interaction</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
              </div>
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.billingAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  <span className="text-sm">{client.billingAddress}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {tagList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {tagList.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <ContactsCard clientId={id} />
        </div>

        <div className="md:col-span-2 space-y-6">
          <ActivitiesCard clientId={id} />
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Interaction Log</CardTitle>
            </CardHeader>
            <CardContent>
              {isInteractionsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : interactions?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No interactions logged yet.</div>
              ) : (
                <div className="space-y-6">
                  {interactions?.map((interaction) => (
                    <div key={interaction.id} className="relative pl-6 border-l pb-6 last:pb-0">
                      <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary" />
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="capitalize">{interaction.type}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {format(new Date(interaction.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{interaction.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes *</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createInteraction.isPending}>Save Interaction</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
