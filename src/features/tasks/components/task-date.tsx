import { differenceInDays, format } from "date-fns";

import { cn } from "@/lib/utils";

interface TaskDateProps {
  value: string;
  className?: string;
}

export const TaskDate = ({ value, className }: TaskDateProps) => {
  if (!value) {
    return (
      <div className="text-gray-400" data-testid="task-date">
        <span className={cn("truncate", className)}>
          No date set
        </span>
      </div>
    );
  }

  const today = new Date();
  const endDate = new Date(value);
  
  // Check if the date is valid
  if (isNaN(endDate.getTime())) {
    return (
      <div className="text-gray-400" data-testid="task-date">
        <span className={cn("truncate", className)}>
          Invalid date
        </span>
      </div>
    );
  }

  const diffInDays = differenceInDays(endDate, today);

  let textColor = "text-green-500"; // Default green for more than 7 days

  if (diffInDays < 3) {
    textColor = "text-red-500";
  } else if (diffInDays < 7) {
    textColor = "text-yellow-500";
  }

  return (
    <div className={textColor} data-testid="task-date">
      <span className={cn("truncate", className)}>
        {format(endDate, "PPP")}
      </span>
    </div>
  );
};