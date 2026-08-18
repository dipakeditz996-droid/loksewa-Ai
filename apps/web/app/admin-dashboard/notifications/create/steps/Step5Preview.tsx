import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { 
  Smartphone, Mail, BellRing, Eye, ArrowRight,
  Calendar, Users, Share2
} from "lucide-react";
import toast from "react-hot-toast";

export default function Step5Preview({ data, onFinish, onBack }: any) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activePreview, setActivePreview] = useState(data.channels[0] || "In-App");

  const handleConfirm = () => {
    setShowConfirmModal(false);
    toast.success(`Notification successfully ${data.scheduleType === "Immediate" ? "queued for sending" : "scheduled"}!`);
    onFinish();
  };

  const handleTest = () => {
    toast.success("Test notification sent to your admin account.");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-[#0B2545] mb-4 border-b border-slate-100 pb-2">Configuration Summary</h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex gap-4">
                <div className="w-8 flex justify-center text-slate-400 shrink-0"><Share2 className="w-4 h-4 mt-0.5" /></div>
                <div>
                  <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">Channels</p>
                  <div className="flex gap-2 font-semibold text-slate-800">
                    {data.channels.join(", ")}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 flex justify-center text-slate-400 shrink-0"><Users className="w-4 h-4 mt-0.5" /></div>
                <div>
                  <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">Audience</p>
                  <p className="font-semibold text-slate-800">{data.audienceType}</p>
                  {data.examCategory && <p className="text-xs text-slate-500 mt-0.5">Filter: {data.examCategory} {data.targetPosition && `/ ${data.targetPosition}`}</p>}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 flex justify-center text-slate-400 shrink-0"><Calendar className="w-4 h-4 mt-0.5" /></div>
                <div>
                  <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">Timing</p>
                  <p className="font-semibold text-slate-800">
                    {data.scheduleType === "Immediate" ? "Send Immediately" : `Scheduled: ${data.scheduledDate} at ${data.scheduledTime}`}
                  </p>
                  {data.recurrence !== "None" && <p className="text-xs text-slate-500 mt-0.5">Repeats: {data.recurrence}</p>}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleTest}>Send Test</Button>
            <Button variant="outline" className="flex-1" onClick={onFinish}>Save as Draft</Button>
          </div>
        </div>

        {/* Right: Previews */}
        <div className="bg-slate-100 rounded-xl shadow-inner border border-slate-200 p-6 flex flex-col items-center justify-center">
          <div className="flex gap-2 mb-6 w-full justify-center border-b border-slate-200 pb-4">
            {data.channels.includes("In-App") && (
              <Button variant={activePreview === "In-App" ? "default" : "outline"} size="sm" onClick={() => setActivePreview("In-App")} className={activePreview === "In-App" ? "bg-[#0B2545]" : "bg-white"}>
                <BellRing className="w-4 h-4 mr-2" /> In-App
              </Button>
            )}
            {data.channels.includes("Push") && (
              <Button variant={activePreview === "Push" ? "default" : "outline"} size="sm" onClick={() => setActivePreview("Push")} className={activePreview === "Push" ? "bg-[#0B2545]" : "bg-white"}>
                <Smartphone className="w-4 h-4 mr-2" /> Push
              </Button>
            )}
            {data.channels.includes("Email") && (
              <Button variant={activePreview === "Email" ? "default" : "outline"} size="sm" onClick={() => setActivePreview("Email")} className={activePreview === "Email" ? "bg-[#0B2545]" : "bg-white"}>
                <Mail className="w-4 h-4 mr-2" /> Email
              </Button>
            )}
          </div>

          {/* Mock Devices */}
          <div className="w-full max-w-sm">
            {activePreview === "Push" && (
              <div className="bg-slate-800 rounded-3xl p-3 shadow-2xl relative overflow-hidden h-[400px] border-4 border-slate-900 w-full">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-10" />
                <div className="bg-slate-900 w-full h-full rounded-2xl relative pt-12 p-4">
                  {/* Push Notification Mock */}
                  <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-3 flex gap-3 shadow-lg border border-slate-700 mt-12 animate-in slide-in-from-top-4">
                    <div className="w-8 h-8 rounded bg-[#D4A72C] flex items-center justify-center shrink-0">
                      <span className="text-[#0B2545] font-bold text-xs">L</span>
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm leading-tight mb-1">{data.title || "Notification Title"}</h4>
                      <p className="text-slate-300 text-xs leading-snug line-clamp-2">{data.shortMessage || "Notification message will appear here..."}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreview === "In-App" && (
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden w-full">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 font-semibold text-slate-700 text-sm flex justify-between">
                  Notifications <span className="text-slate-400 font-normal">New</span>
                </div>
                <div className="p-4 bg-blue-50/50 flex gap-3 border-l-2 border-blue-500 relative">
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500" />
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm mb-1">{data.title || "Notification Title"}</h4>
                    <p className="text-slate-600 text-xs mb-2">{data.shortMessage || "Short message..."}</p>
                    {data.buttonText && (
                      <span className="text-xs font-semibold text-blue-600">{data.buttonText} &rarr;</span>
                    )}
                  </div>
                </div>
                <div className="p-4 flex gap-3 border-t border-slate-50 opacity-50 grayscale">
                  <div className="w-10 h-10 rounded-full bg-slate-100" />
                  <div className="space-y-2 flex-1 pt-1">
                    <div className="h-3 w-3/4 bg-slate-100 rounded" />
                    <div className="h-2 w-full bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            )}

            {activePreview === "Email" && (
              <div className="bg-white rounded-md shadow-lg border border-slate-200 overflow-hidden w-full h-[400px] flex flex-col">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                  <span className="bg-slate-300 w-2 h-2 rounded-full" />
                  <span className="bg-slate-300 w-2 h-2 rounded-full" />
                  <span className="bg-slate-300 w-2 h-2 rounded-full" />
                </div>
                <div className="p-3 border-b border-slate-100 text-sm">
                  <div className="text-slate-500 text-xs mb-1">Subject: <span className="text-slate-800 font-semibold">{data.title || "Subject Line"}</span></div>
                  <div className="text-slate-500 text-xs">From: LoksewaAI &lt;noreply@loksewa.ai&gt;</div>
                </div>
                <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
                  <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                    <div className="text-center font-bold text-lg text-[#0B2545] mb-4">Loksewa<span className="text-[#D4A72C]">AI</span></div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{data.fullMessage || data.shortMessage || "Email body content..."}</p>
                    {data.buttonText && (
                      <div className="mt-6 text-center">
                        <span className="inline-block px-4 py-2 bg-[#0B2545] text-white text-xs font-semibold rounded-md">{data.buttonText}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-6 flex justify-between border-t border-slate-100">
        <Button variant="outline" onClick={onBack}>Back to Schedule</Button>
        <Button 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
          onClick={() => setShowConfirmModal(true)}
        >
          {data.scheduleType === "Immediate" ? "Send Notification" : "Schedule Notification"}
        </Button>
      </div>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm {data.scheduleType === "Immediate" ? "Send" : "Schedule"}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {data.scheduleType === "Immediate" ? "send this notification now?" : "schedule this notification?"}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-2 border border-slate-100 my-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Recipients (Est.)</span>
              <span className="font-semibold text-slate-800">~2,450</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Channels</span>
              <span className="font-semibold text-slate-800">{data.channels.length} selected</span>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
            <Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Confirm & {data.scheduleType === "Immediate" ? "Send" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
