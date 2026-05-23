import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, MessageSquare, Phone, Mail, ChevronRight, Search, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HELP_CORE_URL } from '@/lib/services/help.service';
import { submitSupportTicket } from '@/lib/services/help.service';

const faqs = [
  { q: 'How do I cancel a booking?', a: 'You can cancel a booking up to 30 minutes before the scheduled time in the Trips section. Tap on the booking and select Cancel.' },
  { q: 'How is the price calculated?', a: 'Prices are calculated based on distance, service type, and time of day. You\'ll see an estimate before confirming.' },
  { q: 'What payment methods are accepted?', a: 'Payment is collected by the driver directly. We accept cash and card (Visa, Mastercard).' },
  { q: 'What if my driver is late?', a: 'Please contact support via chat or call. We\'ll get in touch with the driver immediately.' },
  { q: 'Can I request a specific driver?', a: 'Driver requests are not currently supported. Our system assigns the nearest available driver.' },
  { q: 'How do I update my profile?', a: 'Go to the Profile tab and tap Edit to update your personal information.' },
];

export default function CustomerSupport() {
  const { companySlug } = useParams<{ companySlug: string }>();
  const [search, setSearch] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '', category: 'general' });

  const filteredFaqs = faqs.filter(f =>
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit() {
    setSending(true);
    await submitSupportTicket({
      name: 'Maria João',
      email: 'maria@example.com',
      subject: form.subject,
      message: form.message,
      category: form.category,
    });
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); setShowContact(false); setForm({ subject: '', message: '', category: 'general' }); }, 3000);
  }

  if (showContact) {
    return (
      <div className="space-y-4">
        <button onClick={() => setShowContact(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
        <h2 className="text-lg font-bold text-foreground">Contact Support</h2>
        {sent ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="font-semibold text-foreground">Message sent!</p>
            <p className="text-sm text-muted-foreground mt-1">We'll respond within 24 hours.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">CATEGORY</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-3 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground">
                <option value="general">General Question</option>
                <option value="booking">Booking Issue</option>
                <option value="payment">Payment</option>
                <option value="driver">Driver Complaint</option>
                <option value="account">Account</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">SUBJECT</label>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="Brief description"
                className="w-full px-3 py-3 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">MESSAGE</label>
              <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Describe your issue in detail..."
                rows={5}
                className="w-full px-3 py-3 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none" />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={sending || !form.subject || !form.message}>
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-foreground">Help & Support</h2>

      {/* Contact Options */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <MessageSquare className="w-5 h-5" />, label: 'Chat', action: () => setShowContact(true) },
          { icon: <Phone className="w-5 h-5" />, label: 'Call', action: () => window.open('tel:+351800123456') },
          { icon: <ExternalLink className="w-5 h-5" />, label: 'Help Center', action: () => window.open(HELP_CORE_URL, '_blank') },
        ].map(c => (
          <button key={c.label} onClick={c.action}
            className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl border border-border hover:border-primary hover:bg-primary/5 transition-all">
            <span className="text-primary">{c.icon}</span>
            <span className="text-xs font-medium text-foreground">{c.label}</span>
          </button>
        ))}
      </div>

      {/* Search FAQs */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search FAQ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        />
      </div>

      {/* FAQ List */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Frequently Asked Questions</p>
        {filteredFaqs.map((faq, i) => (
          <FaqItem key={i} q={faq.q} a={faq.a} />
        ))}
        {filteredFaqs.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No results for "{search}"</p>
        )}
      </div>

      {/* Still need help */}
      <Card className="bg-muted/40">
        <CardContent className="p-4 text-center">
          <p className="text-sm font-medium text-foreground mb-1">Still need help?</p>
          <p className="text-xs text-muted-foreground mb-3">Our support team is available 24/7</p>
          <Button size="sm" onClick={() => setShowContact(true)}>Send a Message</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setOpen(!open)}>
        <span className="text-sm font-medium text-foreground pr-2">{q}</span>
        <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
          {a}
        </div>
      )}
    </div>
  );
}
