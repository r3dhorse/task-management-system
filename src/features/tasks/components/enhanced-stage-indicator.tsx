"use client";

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { TaskStatus } from '../types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StageData {
  status: TaskStatus;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  time?: string;
}

const stages: StageData[] = [
  { 
    status: TaskStatus.BACKLOG, 
    label: 'Backlog', 
    emoji: '🗂️', 
    color: 'text-slate-700', 
    bgColor: 'bg-slate-50',
  },
  { 
    status: TaskStatus.TODO, 
    label: 'To Do', 
    emoji: '📝', 
    color: 'text-indigo-700', 
    bgColor: 'bg-indigo-50',
  },
  { 
    status: TaskStatus.IN_PROGRESS, 
    label: 'In Progress', 
    emoji: '🔄', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-50',
  },
  { 
    status: TaskStatus.IN_REVIEW, 
    label: 'Review', 
    emoji: '🔍', 
    color: 'text-orange-700', 
    bgColor: 'bg-orange-50',
  },
  { 
    status: TaskStatus.DONE, 
    label: 'Done', 
    emoji: '✅', 
    color: 'text-emerald-700', 
    bgColor: 'bg-emerald-50',
  }
];

interface EnhancedStageIndicatorProps {
  currentStatus: TaskStatus;
  onStatusChange: (newStatus: TaskStatus) => void;
  taskName?: string;
  className?: string;
  showTime?: boolean;
}

// Add shimmer animation keyframes and scrollbar hiding
const shimmerStyle = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
  .no-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
`;

export const EnhancedStageIndicator = ({ 
  currentStatus, 
  onStatusChange, 
  taskName = "this task",
  className = "",
  showTime = true
}: EnhancedStageIndicatorProps) => {
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);
  
  // Filter out BACKLOG stage if current task is not in BACKLOG
  const visibleStages = currentStatus === TaskStatus.BACKLOG 
    ? stages 
    : stages.filter(stage => stage.status !== TaskStatus.BACKLOG);
  
  const currentStageIndex = visibleStages.findIndex(stage => stage.status === currentStatus);

  const getStageClasses = (stage: StageData, index: number) => {
    const baseClasses = "relative px-3 py-2 text-xs font-medium transition-all duration-500 ease-out cursor-pointer group rounded-md border backdrop-blur-sm transform-gpu hover:-translate-y-0.5";
    
    if (stage.status === currentStatus) {
      return `${baseClasses} ${stage.bgColor} ${stage.color} border-current/20 shadow-md ring-1 ring-current/10 z-10 hover:shadow-xl hover:ring-2`;
    }
    
    // Completed stages (before current)
    if (index < currentStageIndex) {
      return `${baseClasses} bg-slate-50/80 text-slate-600 border-slate-200/60 hover:bg-gradient-to-br hover:from-slate-100 hover:to-slate-50 hover:border-slate-400/80 hover:shadow-lg hover:text-slate-800 hover:scale-105`;
    }
    
    // Future stages (after current)
    return `${baseClasses} bg-white/90 text-slate-500 border-slate-200/40 hover:bg-gradient-to-br hover:from-white hover:to-slate-50/70 hover:text-slate-800 hover:border-slate-400/60 hover:shadow-lg hover:scale-105`;
  };

  const handleStageClick = (status: TaskStatus) => {
    if (status === currentStatus) return;
    setPendingStatus(status);
  };

  const handleConfirm = () => {
    if (pendingStatus) {
      onStatusChange(pendingStatus);
      setPendingStatus(null);
    }
  };

  const handleCancel = () => {
    setPendingStatus(null);
  };

  const getConfirmationMessage = () => {
    if (!pendingStatus) return '';
    
    const targetStage = stages.find(stage => stage.status === pendingStatus);
    const currentStage = stages.find(stage => stage.status === currentStatus);
    
    if (!targetStage || !currentStage) return '';
    
    return `Are you sure you want to move ${taskName} from "${currentStage.label}" to "${targetStage.label}"?`;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: shimmerStyle }} />
      <div className={`w-auto bg-gradient-to-r from-slate-50/50 to-white/80 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-sm ml-auto ${className}`}>
        <div className="flex items-center overflow-x-auto overflow-y-hidden no-scrollbar px-2 py-1.5 gap-1">
          {visibleStages.map((stage, index) => (
            <React.Fragment key={stage.status}>
              <div
                className={getStageClasses(stage, index)}
                onClick={() => handleStageClick(stage.status)}
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <div className={`flex items-center justify-center w-4 h-4 rounded transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                    stage.status === currentStatus 
                      ? 'bg-white/90 shadow-sm border border-current/20 group-hover:shadow-md' 
                      : 'bg-transparent group-hover:bg-white/50'
                  }`}>
                    <span className="text-xs leading-none transition-transform duration-500 group-hover:scale-125" role="img" aria-label={stage.label}>
                      {stage.emoji}
                    </span>
                  </div>
                  <span className="font-medium text-xs transition-all duration-300 group-hover:font-semibold group-hover:tracking-wide">{stage.label}</span>
                  {showTime && stage.time && (
                    <span className="text-[10px] font-medium opacity-70 bg-white/80 text-slate-600 px-1 py-0.5 rounded border border-slate-200/40 transition-all duration-300 group-hover:opacity-100 group-hover:bg-white group-hover:shadow-sm">
                      {stage.time}
                    </span>
                  )}
                </div>
                
                {/* Progress indicator with animation */}
                {stage.status === currentStatus && (
                  <>
                    <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-2 h-0.5 bg-current rounded-full shadow-sm animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-md animate-shimmer" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent rounded-md" />
                    </div>
                  </>
                )}
              </div>
              {index < visibleStages.length - 1 && (
                <ChevronRight className="w-3 h-3 text-slate-400 mx-0.5 transition-all duration-300 hover:text-slate-600 hover:scale-110" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <AlertDialog open={pendingStatus !== null} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-md border border-slate-200/60 shadow-xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
              {pendingStatus && (
                <>
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60">
                    <span className="text-2xl">
                      {stages.find(stage => stage.status === pendingStatus)?.emoji}
                    </span>
                  </div>
                  Update Task Status
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 mt-2">
              {getConfirmationMessage()}
              <div className="mt-4 p-3 bg-slate-50/80 rounded-lg border border-slate-200/40">
                <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                  This change will be automatically logged in the task history.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel 
              onClick={handleCancel}
              className="bg-white/90 text-slate-600 border-slate-200/60 hover:bg-slate-50/90 hover:text-slate-700 font-medium px-6 py-2.5 rounded-lg transition-all duration-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              className={`font-semibold px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${
                pendingStatus ? 
                `${stages.find(stage => stage.status === pendingStatus)?.bgColor} ${stages.find(stage => stage.status === pendingStatus)?.color} border-2 border-current/20 hover:scale-105` :
                'bg-indigo-500 text-white hover:bg-indigo-600'
              }`}
            >
              <span className="flex items-center gap-2">
                Confirm Update
                <ChevronRight className="w-4 h-4" />
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Compact version for mobile or limited space
export const CompactStageIndicator = ({ 
  currentStatus, 
  onStatusChange, 
  taskName = "this task",
  className = ""
}: EnhancedStageIndicatorProps) => {
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);

  // Filter out BACKLOG stage if current task is not in BACKLOG
  const visibleStages = currentStatus === TaskStatus.BACKLOG 
    ? stages 
    : stages.filter(stage => stage.status !== TaskStatus.BACKLOG);

  const handleStageClick = (status: TaskStatus) => {
    if (status === currentStatus) return;
    setPendingStatus(status);
  };

  const handleConfirm = () => {
    if (pendingStatus) {
      onStatusChange(pendingStatus);
      setPendingStatus(null);
    }
  };

  const handleCancel = () => {
    setPendingStatus(null);
  };

  const getConfirmationMessage = () => {
    if (!pendingStatus) return '';
    
    const targetStage = stages.find(stage => stage.status === pendingStatus);
    const currentStage = stages.find(stage => stage.status === currentStatus);
    
    if (!targetStage || !currentStage) return '';
    
    return `Move ${taskName} from "${currentStage.label}" to "${targetStage.label}"?`;
  };

  return (
    <>
      <div className={`w-auto bg-gradient-to-r from-slate-50/50 to-white/80 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-sm ml-auto ${className}`}>
        <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden no-scrollbar px-2 py-1.5">
          {visibleStages.map((stage) => (
            <div
              key={stage.status}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-500 ease-out cursor-pointer whitespace-nowrap border backdrop-blur-sm transform-gpu hover:-translate-y-0.5 hover:scale-105 group ${
                stage.status === currentStatus
                  ? `${stage.bgColor} ${stage.color} border-current/20 shadow-sm ring-1 ring-current/10 hover:shadow-lg hover:ring-2`
                  : 'bg-white/90 text-slate-500 border-slate-200/40 hover:bg-gradient-to-br hover:from-white hover:to-slate-50/70 hover:text-slate-800 hover:border-slate-400/60 hover:shadow-md'
              }`}
              onClick={() => handleStageClick(stage.status)}
            >
              <div className="flex items-center gap-1.5">
                <div className={`flex items-center justify-center w-4 h-4 rounded transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                  stage.status === currentStatus 
                    ? 'bg-white/80 shadow-sm border border-current/20 group-hover:shadow-md' 
                    : 'bg-transparent group-hover:bg-white/50'
                }`}>
                  <span className="text-xs leading-none transition-transform duration-500 group-hover:scale-125" role="img" aria-label={stage.label}>
                    {stage.emoji}
                  </span>
                </div>
                <span className="font-medium transition-all duration-300 group-hover:font-semibold group-hover:tracking-wide">{stage.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={pendingStatus !== null} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-md border border-slate-200/60 shadow-xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
              {pendingStatus && (
                <>
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60">
                    <span className="text-2xl">
                      {stages.find(stage => stage.status === pendingStatus)?.emoji}
                    </span>
                  </div>
                  Update Task Status
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 mt-2">
              {getConfirmationMessage()}
              <div className="mt-4 p-3 bg-slate-50/80 rounded-lg border border-slate-200/40">
                <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                  This change will be automatically logged in the task history.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel 
              onClick={handleCancel}
              className="bg-white/90 text-slate-600 border-slate-200/60 hover:bg-slate-50/90 hover:text-slate-700 font-medium px-6 py-2.5 rounded-lg transition-all duration-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              className={`font-semibold px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${
                pendingStatus ? 
                `${stages.find(stage => stage.status === pendingStatus)?.bgColor} ${stages.find(stage => stage.status === pendingStatus)?.color} border-2 border-current/20 hover:scale-105` :
                'bg-indigo-500 text-white hover:bg-indigo-600'
              }`}
            >
              <span className="flex items-center gap-2">
                Confirm Update
                <ChevronRight className="w-4 h-4" />
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};