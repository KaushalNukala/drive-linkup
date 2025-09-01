import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Phone, MessageCircle, Send } from 'lucide-react';
import { Profile } from '@/types';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactPerson: Profile;
  userRole: 'driver' | 'passenger';
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  contactPerson,
  userRole
}) => {
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const { toast } = useToast();

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // In a real app, this would send the message through your backend
    toast({
      title: "Message Sent",
      description: `Your message has been sent to ${contactPerson.full_name}`,
    });
    
    setMessage('');
    setSubject('');
    onClose();
  };

  const handlePhoneCall = () => {
    if (contactPerson.phone) {
      window.open(`tel:${contactPerson.phone}`);
    } else {
      toast({
        title: "Phone Not Available",
        description: "This user hasn't provided a phone number",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Contact {contactPerson.role === 'driver' ? 'Driver' : 'Passenger'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div>
              <h3 className="font-semibold">{contactPerson.full_name}</h3>
              <p className="text-sm text-muted-foreground capitalize">{contactPerson.role}</p>
            </div>
            {contactPerson.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePhoneCall}
                className="flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                Call
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                placeholder="Trip inquiry..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="flex-1 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};