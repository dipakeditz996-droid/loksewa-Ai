import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, BellRing, Mail, Smartphone } from "lucide-react";

export default function Step3Delivery({ data, updateData, onNext, onBack }: any) {
  
  const toggleChannel = (channel: string) => {
    const current = [...data.channels];
    if (current.includes(channel)) {
      updateData({ channels: current.filter(c => c !== channel) });
    } else {
      updateData({ channels: [...current, channel] });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <Send className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-bold text-[#0B2545]">Delivery Channels</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* In-App */}
        <div 
          className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
            data.channels.includes("In-App") 
              ? "border-blue-500 bg-blue-50/50" 
              : "border-slate-200 hover:border-blue-300 bg-white"
          }`}
          onClick={() => toggleChannel("In-App")}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <BellRing className="w-5 h-5" />
            </div>
            <Checkbox checked={data.channels.includes("In-App")} className="mt-1" />
          </div>
          <h4 className="font-bold text-slate-800">In-App Notification</h4>
          <p className="text-xs text-slate-500 mt-1">Appears in the student's dashboard notification bell.</p>
        </div>

        {/* Email */}
        <div 
          className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
            data.channels.includes("Email") 
              ? "border-emerald-500 bg-emerald-50/50" 
              : "border-slate-200 hover:border-emerald-300 bg-white"
          }`}
          onClick={() => toggleChannel("Email")}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <Checkbox checked={data.channels.includes("Email")} className="mt-1" />
          </div>
          <h4 className="font-bold text-slate-800">Email</h4>
          <p className="text-xs text-slate-500 mt-1">Sends a formatted HTML email to the student's registered address.</p>
        </div>

        {/* Push Notification */}
        <div 
          className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
            data.channels.includes("Push") 
              ? "border-purple-500 bg-purple-50/50" 
              : "border-slate-200 hover:border-purple-300 bg-white"
          }`}
          onClick={() => toggleChannel("Push")}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <Checkbox checked={data.channels.includes("Push")} className="mt-1" />
          </div>
          <h4 className="font-bold text-slate-800">Mobile Push</h4>
          <p className="text-xs text-slate-500 mt-1">Sends a native push notification to their device (Uses Short Message).</p>
        </div>

        {/* SMS */}
        <div 
          className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
            data.channels.includes("SMS") 
              ? "border-amber-500 bg-amber-50/50" 
              : "border-slate-200 hover:border-amber-300 bg-white"
          }`}
          onClick={() => toggleChannel("SMS")}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <Checkbox checked={data.channels.includes("SMS")} className="mt-1" />
          </div>
          <h4 className="font-bold text-slate-800">SMS Message</h4>
          <p className="text-xs text-slate-500 mt-1">Sends a text message. High cost, use only for urgent alerts.</p>
        </div>
      </div>
      
      {data.channels.length === 0 && (
        <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded">
          Please select at least one delivery channel.
        </p>
      )}

      <div className="pt-6 flex justify-between border-t border-slate-100">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button 
          className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white px-8"
          onClick={onNext}
          disabled={data.channels.length === 0}
        >
          Continue to Schedule
        </Button>
      </div>
    </div>
  );
}
