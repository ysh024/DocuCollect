"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Pencil, Info } from "lucide-react";
import { updateClientAction } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";
import { Client } from "@/types";

interface EditClientModalProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditClientModal({
  isOpen,
  client,
  onClose,
  onSuccess,
}: EditClientModalProps) {
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [clientRefId, setClientRefId] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (client) {
      setName(client.name || "");
      setPhone(client.phone || "");
      setEmail(client.email || "");
      setCompany(client.company || "");
      setClientRefId(client.client_ref_id || "");
      setAlternatePhone(client.alternate_phone || "");
      setAddress(client.address || "");
      setNotes(client.notes || "");
    }
  }, [client]);

  if (!isOpen || !client || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({
        title: "Required fields missing",
        description: "Full Name and Phone number are required.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      await updateClientAction(client.id, {
        name,
        phone,
        email,
        company,
        client_ref_id: clientRefId,
        alternate_phone: alternatePhone,
        address,
        notes,
      });

      toast({
        title: "Client updated!",
        description: `${name}'s details have been saved successfully.`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to update client",
        description: err.message || "An error occurred while updating the client.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full shadow-2xl border border-neutral-200/90 dark:border-neutral-800 overflow-hidden flex flex-col transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-800/80">
          <div className="flex items-center gap-3 text-neutral-900 dark:text-neutral-100">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-neutral-800 text-white flex items-center justify-center shadow-xs border border-transparent dark:border-neutral-700">
              <Pencil className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Edit Client Details</h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Update portfolio information, contact numbers & reference ID
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  WhatsApp / Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                  className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Company / Firm
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Patel Logistics LLP"
                  className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Client Ref ID (CLI)
                  </label>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">e.g. CLI-3366</span>
                </div>
                <input
                  type="text"
                  value={clientRefId}
                  onChange={(e) => setClientRefId(e.target.value)}
                  placeholder="e.g. CLI-3366"
                  className="w-full text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  placeholder="Optional secondary phone"
                  className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Office or residential address"
                className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Internal Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="PAN, GSTIN, communication preferences, remarks..."
                className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-neutral-50/60 dark:bg-neutral-800/80 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              Fields marked with <span className="text-rose-500">*</span> are mandatory
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {loading ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
