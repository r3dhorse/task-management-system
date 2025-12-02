/**
 * Lucide React Icon Wrapper
 * This module provides a stable interface for lucide-react icons
 * to work around version compatibility issues
 */
import React from "react";
import * as LucideReact from "lucide-react";

// Helper function to get icon with fallbacks
const getIcon = (iconName: string, fallbacks: string[] = []) => {
  const lucide = LucideReact as unknown as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>;
  
  // Try the main name first
  if (lucide[iconName]) {
    return lucide[iconName];
  }
  
  // Try fallbacks
  for (const fallback of fallbacks) {
    if (lucide[fallback]) {
      return lucide[fallback];
    }
  }
  
  // Default fallback to a basic icon if available
  return lucide.Circle || lucide.Square || (() => null);
};

// Export all commonly used icons with fallbacks
export const Search = getIcon('Search', ['SearchIcon', 'LucideSearch']);
export const Edit = getIcon('Edit', ['PenSquare', 'EditIcon', 'Pencil']);
export const Trash2 = getIcon('Trash2', ['Trash2Icon', 'Trash']);
export const Loader2 = getIcon('Loader2', ['Loader2Icon', 'Loader']);
export const Key = getIcon('Key', ['KeyIcon']);
export const Shield = getIcon('Shield', ['ShieldIcon']);
export const ShieldCheck = getIcon('ShieldCheck', ['ShieldCheckIcon']);
export const Copy = getIcon('Copy', ['CopyIcon']);
export const Plus = getIcon('Plus', ['PlusIcon']);
export const MessageCircle = getIcon('MessageCircle', ['MessageCircleIcon']);
export const CheckCheck = getIcon('CheckCheck', ['CheckCheckIcon']);
export const UserPlus = getIcon('UserPlus', ['UserPlusIcon']);
export const FileEdit = getIcon('FileEdit', ['FileEditIcon', 'FilePen']);
export const Bell = getIcon('Bell', ['BellIcon']);
export const ChevronLeft = getIcon('ChevronLeft', ['ChevronLeftIcon']);
export const ChevronRight = getIcon('ChevronRight', ['ChevronRightIcon']);
export const ArrowLeft = getIcon('ArrowLeft', ['ArrowLeftIcon']);
export const ArrowLeftIcon = getIcon('ArrowLeft', ['ArrowLeftIcon']);
export const CalendarIcon = getIcon('Calendar', ['CalendarIcon']);
export const UsersIcon = getIcon('Users', ['UsersIcon']);
export const CheckCircle2Icon = getIcon('CheckCircle2', ['CheckCircle', 'CheckCircle2Icon']);
export const Clock3Icon = getIcon('Clock3', ['Clock', 'Clock3Icon']);
export const ListTodoIcon = getIcon('ListTodo', ['List', 'ListTodoIcon']);
export const BarChart3Icon = getIcon('BarChart3', ['BarChart', 'BarChart3Icon']);
export const TrendingUpIcon = getIcon('TrendingUp', ['TrendingUpIcon']);
export const StarIcon = getIcon('Star', ['StarIcon']);
export const ZapIcon = getIcon('Zap', ['ZapIcon']);
export const Target = getIcon('Target', ['TargetIcon']);
export const Activity = getIcon('Activity', ['ActivityIcon']);
export const Award = getIcon('Award', ['AwardIcon']);
export const Briefcase = getIcon('Briefcase', ['BriefcaseIcon']);
export const Rocket = getIcon('Rocket', ['RocketIcon']);
export const Trophy = getIcon('Trophy', ['TrophyIcon']);
export const SettingsIcon = getIcon('Settings', ['SettingsIcon']);
export const Package = getIcon('Package', ['PackageIcon']);
export const SaveIcon = getIcon('Save', ['SaveIcon']);
export const XIcon = getIcon('X', ['XIcon']);
export const UserIcon = getIcon('User', ['UserIcon']);
export const EditIcon = getIcon('Edit', ['PenSquare', 'EditIcon', 'Pencil']);
export const FileTextIcon = getIcon('FileText', ['FileTextIcon']);
export const ArchiveIcon = getIcon('Archive', ['ArchiveIcon']);
export const Calendar = getIcon('Calendar', ['CalendarIcon']);
export const Clock = getIcon('Clock', ['ClockIcon']);
export const CheckCircle2 = getIcon('CheckCircle2', ['CheckCircle', 'CheckCircle2Icon']);
export const AlertCircle = getIcon('AlertCircle', ['AlertCircleIcon']);
export const BarChart3 = getIcon('BarChart3', ['BarChart', 'BarChart3Icon']);
export const Zap = getIcon('Zap', ['ZapIcon']);
export const ListTodo = getIcon('ListTodo', ['List', 'ListTodoIcon']);
export const Sparkles = getIcon('Sparkles', ['SparklesIcon']);
export const CalendarDays = getIcon('CalendarDays', ['CalendarDaysIcon']);
export const Timer = getIcon('Timer', ['TimerIcon']);
export const FolderOpen = getIcon('FolderOpen', ['FolderOpenIcon']);
export const ArrowUp = getIcon('ArrowUp', ['ArrowUpIcon']);
export const ArrowDown = getIcon('ArrowDown', ['ArrowDownIcon']);
export const ArrowUpDown = getIcon('ArrowUpDown', ['ArrowUpDownIcon']);
export const Home = getIcon('Home', ['HomeIcon']);
export const MenuIcon = getIcon('Menu', ['MenuIcon']);
export const Smile = getIcon('Smile', ['SmileIcon']);
export const Heart = getIcon('Heart', ['HeartIcon']);
export const Star = getIcon('Star', ['StarIcon']);
export const Flag = getIcon('Flag', ['FlagIcon']);
export const MapPin = getIcon('MapPin', ['MapPinIcon']);
export const Check = getIcon('Check', ['CheckIcon']);
export const ChevronDown = getIcon('ChevronDown', ['ChevronDownIcon']);
export const ChevronUp = getIcon('ChevronUp', ['ChevronUpIcon']);
export const User = getIcon('User', ['UserIcon']);
export const Mail = getIcon('Mail', ['MailIcon']);
export const Lock = getIcon('Lock', ['LockIcon']);
export const Eye = getIcon('Eye', ['EyeIcon']);
export const EyeOff = getIcon('EyeOff', ['EyeOffIcon']);
export const LogOut = getIcon('LogOut', ['LogOutIcon']);
export const Settings = getIcon('Settings', ['SettingsIcon']);
export const UserPlusIcon = getIcon('UserPlus', ['UserPlusIcon']);
export const SearchIcon = getIcon('Search', ['SearchIcon', 'LucideSearch']);
export const MailIcon = getIcon('Mail', ['MailIcon']);
export const CheckIcon = getIcon('Check', ['CheckIcon']);
export const AlertCircleIcon = getIcon('AlertCircle', ['AlertCircleIcon']);
export const KeyIcon = getIcon('Key', ['KeyIcon']);
export const CheckCircleIcon = getIcon('CheckCircle', ['CheckCircle2', 'CheckCircleIcon']);
export const EyeIcon = getIcon('Eye', ['EyeIcon']);
export const EyeOffIcon = getIcon('EyeOff', ['EyeOffIcon']);
export const MessageSquare = getIcon('MessageSquare', ['MessageSquareIcon']);
export const ListChecksIcon = getIcon('ListChecks', ['ListChecksIcon']);
export const FilterX = getIcon('FilterX', ['FilterXIcon']);
export const MoreHorizontal = getIcon('MoreHorizontal', ['MoreHorizontalIcon']);
export const ExternalLinkIcon = getIcon('ExternalLink', ['ExternalLinkIcon']);
export const SendIcon = getIcon('Send', ['SendIcon']);
export const SmileIcon = getIcon('Smile', ['SmileIcon']);
export const Paperclip = getIcon('Paperclip', ['PaperclipIcon']);
export const FileIcon = getIcon('File', ['FileIcon']);
export const ImageIcon = getIcon('Image', ['ImageIcon']);
export const X = getIcon('X', ['XIcon']);
export const Download = getIcon('Download', ['DownloadIcon']);
export const AtSign = getIcon('AtSign', ['AtSignIcon']);

// Additional missing icons
export const AlertTriangle = getIcon('AlertTriangle', ['AlertTriangleIcon']);
export const AlertTriangleIcon = getIcon('AlertTriangle', ['AlertTriangleIcon']);
export const RefreshCw = getIcon('RefreshCw', ['RefreshCwIcon']);
export const RefreshCwIcon = getIcon('RefreshCw', ['RefreshCwIcon']);
export const PlusIcon = getIcon('Plus', ['PlusIcon']);
export const MoreVertical = getIcon('MoreVertical', ['MoreVerticalIcon']);
export const MoreVerticalIcon = getIcon('MoreVertical', ['MoreVerticalIcon']);
export const LogOutIcon = getIcon('LogOut', ['LogOutIcon']);
export const ChevronsUpDown = getIcon('ChevronsUpDown', ['ChevronsUpDownIcon']);
export const ShieldIcon = getIcon('Shield', ['ShieldIcon']);
export const ClockIcon = getIcon('Clock', ['ClockIcon']);
export const BrushIcon = getIcon('Brush', ['BrushIcon']);
export const LinkIcon = getIcon('Link', ['LinkIcon']);
export const CopyIcon = getIcon('Copy', ['CopyIcon']);
export const InfoIcon = getIcon('Info', ['InfoIcon']);
export const TrashIcon = getIcon('Trash', ['TrashIcon']);
export const UserCheckIcon = getIcon('UserCheck', ['UserCheckIcon']);
export const Users = getIcon('Users', ['UsersIcon']);
export const CheckCircle = getIcon('CheckCircle', ['CheckCircleIcon']);
export const Building2 = getIcon('Building2', ['Building2Icon', 'Building']);
export const Info = getIcon('Info', ['InfoIcon']);
export const UserCheck = getIcon('UserCheck', ['UserCheckIcon']);
export const SlidersHorizontal = getIcon('SlidersHorizontal', ['SlidersHorizontalIcon', 'Sliders']);
export const Play = getIcon('Play', ['PlayIcon']);
export const PlayIcon = getIcon('Play', ['PlayIcon']);

// Export all lucide icons as a namespace for direct access
export * from "lucide-react";