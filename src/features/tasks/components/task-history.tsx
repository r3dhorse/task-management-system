"use client";

import { formatHistoryMessage, getActionColor } from "../utils/history";
import { formatDistanceToNow } from "date-fns";
import { useGetTaskHistory } from "../api/use-get-task-history";

interface TaskHistoryProps {
  taskId: string;
}

export const TaskHistory = ({ taskId }: TaskHistoryProps) => {
  const { data: historyData, isLoading } = useGetTaskHistory({ taskId });

  const history = historyData?.documents || [];

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-3 h-3 bg-gray-300 rounded-full mt-1 animate-pulse flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-100 rounded w-24 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
          </div>
          <p className="text-gray-500 text-sm font-medium">No activity yet</p>
          <p className="text-gray-400 text-xs mt-1">Activity will appear here as changes are made</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {history.map((entry, index) => (
        <div key={entry.id} className="relative">
          {/* Timeline line */}
          {index < history.length - 1 && (
            <div className="absolute left-1.5 top-6 w-0.5 h-8 bg-gray-200"></div>
          )}
          
          <div className="flex items-start gap-3">
            {/* Activity dot */}
            <div 
              className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${getActionColor(entry.action, entry.field)} shadow-sm`}
            ></div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 pb-2">
              <div className="bg-gray-50/80 rounded-lg px-3 py-2 border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {formatHistoryMessage(
                    entry.action,
                    entry.userName,
                    entry.field,
                    entry.oldValue,
                    entry.newValue
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};