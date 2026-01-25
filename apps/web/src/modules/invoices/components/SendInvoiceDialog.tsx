import React, { useState, useEffect } from "react";
import { type InvoiceDto } from "@corely/contracts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import { FileText } from "lucide-react";

interface SendInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceDto;
  onSend: (data: {
    to: string;
    subject: string;
    message: string;
    sendCopy: boolean;
  }) => Promise<void>;
  isSending: boolean;
}

export function SendInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onSend,
  isSending,
}: SendInvoiceDialogProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendCopy, setSendCopy] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      setTo(invoice.billToEmail || "");
      setSubject(`Invoice #${invoice.number} from Corely`);
      setMessage("");
      setSendCopy(false);
    }
  }, [open, invoice]);

  const handleSend = () => {
    if (!to) {return;}
    void onSend({ to, subject, message, sendCopy });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Email invoice</DialogTitle>
          <DialogDescription>Send your invoice directly from the platform.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* To Field */}
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Input
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="email@example.com"
                className="flex-1"
              />
              <div className="flex items-center space-x-2">
                <Checkbox id="copy" checked={sendCopy} onCheckedChange={(c) => setSendCopy(!!c)} />
                <Label htmlFor="copy" className="font-normal cursor-pointer text-sm">
                  Send a copy to my email
                </Label>
              </div>
            </div>
            {invoice.billToName && (
              <p className="text-xs text-muted-foreground">
                Will be saved for future emails to {invoice.billToName}
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Write your message here"
              className="resize-none"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <p className="text-sm text-muted-foreground">
              Your invoice will be attached to the email
            </p>
            <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/10 w-fit">
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-blue-600 font-medium">
                {invoice.number ? `Invoice-${invoice.number}.pdf` : "invoice.pdf"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <Button
            variant="link"
            className="px-0 text-muted-foreground h-auto"
            onClick={() => {
              /* Placeholder */
            }}
          >
            Send me a test email
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !to}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isSending ? "Sending..." : "Email invoice"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
