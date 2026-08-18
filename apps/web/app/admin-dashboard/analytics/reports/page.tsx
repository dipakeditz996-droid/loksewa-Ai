"use client";

import React, { useState } from "react";
import { 
  FileText, Download, Play, Plus, Clock, Filter,
  Settings, CheckCircle2, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockSavedReports } from "@/lib/mock/admin-analytics";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function ReportsBuilderPage() {
  const [step, setStep] = useState(1);
  const [reportTitle, setReportTitle] = useState("");
  
  const modules = [
    { id: "students", name: "Students", desc: "Registrations, activity, sessions" },
    { id: "exams", name: "Exams", desc: "Attempts, pass rates, scores" },
    { id: "questions", name: "Questions", desc: "Accuracy, difficulty, subjects" },
    { id: "study-plans", name: "Study Plans", desc: "Enrollments, progress, drop-offs" },
    { id: "marketplace", name: "Marketplace", desc: "Revenue, orders, products" },
    { id: "support", name: "Support", desc: "Tickets, resolution times" }
  ];

  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const toggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      setSelectedModules(selectedModules.filter(m => m !== id));
    } else {
      setSelectedModules([...selectedModules, id]);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Report Builder Wizard */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-[#0B2545] p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#D4A72C]" />
              Custom Report Builder
            </h2>
            <p className="text-white/70 text-sm mt-1">Extract specific metrics and export them to PDF, Excel, or CSV.</p>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                  step === s ? "bg-[#D4A72C] border-[#D4A72C] text-[#0B2545]" : 
                  step > s ? "bg-emerald-500 border-emerald-500 text-white" : 
                  "bg-white/10 border-white/20 text-white/50"
                }`}
              >
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Report Title</label>
                <Input 
                  placeholder="e.g., Q3 Comprehensive Platform Report" 
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="max-w-md"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-3">Select Modules to Include</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modules.map(mod => (
                    <div 
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedModules.includes(mod.id) 
                          ? "border-[#0B2545] bg-blue-50/50" 
                          : "border-slate-100 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-bold ${selectedModules.includes(mod.id) ? "text-[#0B2545]" : "text-slate-700"}`}>
                          {mod.name}
                        </h4>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          selectedModules.includes(mod.id) ? "bg-[#0B2545] border-[#0B2545]" : "border-slate-300"
                        }`}>
                          {selectedModules.includes(mod.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{mod.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={() => setStep(2)} 
                  disabled={selectedModules.length === 0 || !reportTitle}
                  className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white"
                >
                  Next Step <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 text-center py-12">
              <h3 className="text-xl font-bold text-[#0B2545]">Step 2: Filters & Date Range</h3>
              <p className="text-slate-500 max-w-md mx-auto">This is a mock UI. In a full implementation, you would configure date ranges, groupings, and specific metrics here.</p>
              
              <div className="pt-4 flex justify-center gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white">
                  Next Step <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center py-12">
              <h3 className="text-xl font-bold text-[#0B2545]">Step 3: Export Format</h3>
              
              <div className="flex justify-center gap-4 mt-6">
                {["PDF Document", "Excel Spreadsheet", "CSV Data"].map(fmt => (
                  <div key={fmt} className="p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-[#0B2545] hover:bg-slate-50 w-40">
                    <Download className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-sm">{fmt}</p>
                  </div>
                ))}
              </div>
              
              <div className="pt-8 flex justify-center gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={() => setStep(4)} className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0B2545]">
                  Generate Report
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-[#0B2545]">Report Generated!</h3>
              <p className="text-slate-500 max-w-md mx-auto">"{reportTitle}" has been generated successfully and is ready for download.</p>
              
              <div className="pt-6 flex justify-center gap-4">
                <Button className="bg-[#0B2545] text-white gap-2">
                  <Download className="w-4 h-4" /> Download Now
                </Button>
                <Button variant="outline" onClick={() => { setStep(1); setReportTitle(""); setSelectedModules([]); }}>
                  Create Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved Reports Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-[#0B2545] flex items-center gap-2">
            <FileText className="w-4 h-4" /> Saved & Recent Reports
          </h3>
          <Button variant="outline" size="sm" className="bg-white gap-2">
            <Clock className="w-4 h-4" /> Scheduled Reports
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white">
                <TableHead>Report Name</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-center">Format</TableHead>
                <TableHead className="text-center">Date Generated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSavedReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-semibold text-[#0B2545]">{report.name}</TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">{report.dateRange}</span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{report.creator}</TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      report.format === 'PDF' ? 'bg-red-100 text-red-700' :
                      report.format === 'Excel' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {report.format}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm text-slate-500">
                    {new Date(report.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-[#0B2545] hover:bg-slate-100">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
}
