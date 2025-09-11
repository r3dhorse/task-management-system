"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SendIcon, SmileIcon, Paperclip, FileIcon, ImageIcon, X, Download, AtSign } from "@/lib/lucide-icons";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { cn } from "@/lib/utils";
import { useCurrent } from "@/features/auth/api/use-current";
import { useGetTaskMessages } from "../api/use-get-task-messages";
import { useCreateTaskMessage } from "../api/use-create-task-message";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TaskMessage } from "../types/messages";
import { toast } from "sonner";
import { extractMentions, renderMessageWithMentions, MemberForMention, getMentionedUserIds } from "@/features/notifications/utils/mention-utils";
import { createMentionNotification } from "@/features/notifications/utils/create-mention-notification";
import { useGetTask } from "../api/use-get-task";
import { useMarkNotificationsRead } from "@/features/notifications/api/use-mark-notifications-read";

interface TaskChatProps {
  taskId: string;
  className?: string;
}

type ChatMessage = Omit<TaskMessage, 'timestamp'> & {
  id: string;
  timestamp: Date;
  isOwn: boolean;
};

export const TaskChat = ({ taskId, className }: TaskChatProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  const workspaceId = useWorkspaceId();
  
  const { data: currentUser } = useCurrent();
  const { data: messagesData, isLoading: isLoadingMessages, error: messagesError } = useGetTaskMessages({ 
    taskId, 
    workspaceId 
  });
  const { mutate: createMessage, isPending: isCreatingMessage } = useCreateTaskMessage();
  const { data: task } = useGetTask({ taskId });
  const { mutate: markNotificationsRead } = useMarkNotificationsRead();

  // Filter task followers for mention dropdown (confidentiality)
  const filteredMembers = useMemo(() => {
    if (!task?.followers || !showMentionDropdown) return [];
    
    const members = task.followers
      .filter(follower => 
        follower.user?.name && 
        follower.user.id !== currentUser?.id && // Don't include current user
        follower.user.name.toLowerCase().includes(mentionQuery.toLowerCase())
      )
      .map(follower => ({
        id: follower.id,
        name: follower.user.name!, // We've already filtered for non-null names
        email: follower.user.email,
        userId: follower.user.id,
        role: follower.role || 'MEMBER', // Default role
        workspaceId: task.workspaceId,
        joinedAt: new Date().toISOString(), // Default joinedAt for followers
      }))
      .slice(0, 7); // Limit to 7 results to make room for @all
    
    // Add @all option if query matches and there are followers
    const shouldShowAll = 'all'.includes(mentionQuery.toLowerCase()) && 
                         task.followers.length > 1; // Only show @all if there are multiple followers
    
    if (shouldShowAll) {
      const allOption: MemberForMention = {
        id: 'all',
        name: 'All followers',
        email: '',
        userId: 'all',
        role: 'ALL',
        workspaceId: task.workspaceId,
        joinedAt: new Date().toISOString(),
      };
      return [allOption, ...members];
    }
    
    return members;
  }, [task?.followers, task?.workspaceId, currentUser?.id, showMentionDropdown, mentionQuery]);

  // Transform API messages to include isOwn property
  const messages = useMemo(() => {
    if (!messagesData?.documents) return [];
    
    return messagesData.documents.map((doc): ChatMessage => {
      const msg = doc as TaskMessage;
      return {
        ...msg,
        id: msg.id,
        timestamp: new Date(msg.timestamp),
        isOwn: msg.senderId === currentUser?.id,
      };
    });
  }, [messagesData?.documents, currentUser?.id]);

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    // Only auto-scroll if user is near the bottom or if it's their own message
    const shouldScroll = () => {
      if (!messagesEndRef.current) return false;
      
      const container = messagesEndRef.current.parentElement;
      if (!container) return true;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      return isNearBottom;
    };

    if (shouldScroll()) {
      scrollToBottom();
    }
  }, [messages]);

  // Scroll to bottom when component first loads
  useEffect(() => {
    scrollToBottom();
  }, []);

  // Mark task-related notifications as read when chat is opened
  useEffect(() => {
    if (taskId && currentUser) {
      markNotificationsRead({
        json: { taskId }
      });
    }
  }, [taskId, currentUser, markNotificationsRead]);

  // Close mention dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionDropdownRef.current && !mentionDropdownRef.current.contains(event.target as Node)) {
        setShowMentionDropdown(false);
      }
    };

    if (showMentionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMentionDropdown]);

  const validateFile = (file: File): boolean => {
    const maxSize = 3 * 1024 * 1024; // 3MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'application/pdf'];
    
    if (file.size > maxSize) {
      toast.error("File size must be less than 3MB");
      return false;
    }
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, SVG and PDF files are allowed");
      return false;
    }
    
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleUploadFile = async (): Promise<{ id: string; name: string; size: string; type: string } | null> => {
    if (!selectedFile) return null;

    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('source', 'chat');
      formData.append('workspaceId', workspaceId);
      formData.append('taskId', taskId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const result = await response.json();
      return {
        id: result.data.id || result.data.$id,
        name: selectedFile.name,
        size: selectedFile.size.toString(),
        type: selectedFile.type,
      };
    } catch (error) {
      console.error('File upload error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
      toast.error(errorMessage);
      return null;
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !currentUser || isCreatingMessage || isUploadingFile) return;

    let attachmentData = null;
    
    // Upload file if selected
    if (selectedFile) {
      attachmentData = await handleUploadFile();
      if (!attachmentData) {
        return; // Upload failed
      }
    }

    const messageData: {
      taskId: string;
      content: string;
      workspaceId: string;
      attachmentId?: string;
      attachmentFileName?: string;
      attachmentName?: string;
      attachmentSize?: string;
      attachmentType?: string;
    } = {
      taskId,
      content: newMessage.trim() || (selectedFile ? `Sent ${selectedFile.name}` : ''),
      workspaceId,
    };

    if (attachmentData) {
      messageData.attachmentId = attachmentData.id;
      messageData.attachmentName = attachmentData.name;
      messageData.attachmentSize = String(attachmentData.size);
      messageData.attachmentType = attachmentData.type;
    }

    // Detect mentions in the message content (use task followers only)
    const messageContent = messageData.content;
    const taskFollowers = task?.followers?.map(follower => ({
      id: follower.id,
      name: follower.user?.name || '',
      email: follower.user?.email || '',
      userId: follower.user?.id || '',
      role: follower.role || 'MEMBER',
      workspaceId: task.workspaceId,
      joinedAt: new Date().toISOString(), // Default joinedAt for followers
    })) || [];
    const mentions = extractMentions(messageContent, taskFollowers, currentUser.id);
    
    createMessage(
      { json: messageData },
      {
        onSuccess: async (response) => {
          // Create mention notifications after message is successfully sent
          if (mentions.length > 0 && task && currentUser && 'data' in response) {
            // Get all unique user IDs that should be notified (handles @all and individual mentions)
            const mentionedUserIds = getMentionedUserIds(mentions);
            
            for (const userId of mentionedUserIds) {
              if (userId !== currentUser.id) {
                try {
                  await createMentionNotification({
                    taskId,
                    messageId: response.data.id,
                    workspaceId,
                    mentionedUserId: userId,
                    mentionerUserId: currentUser.id,
                    mentionerName: currentUser.name || 'Unknown User',
                    taskName: task.name,
                    messageContent,
                  });
                } catch (error) {
                  console.error('Failed to create mention notification:', error);
                  // Don't show error to user, just log it
                }
              }
            }
          }
        }
      }
    );
    
    setNewMessage("");
    setSelectedFile(null);
    
    // Simulate typing indicator for demo
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const handleEmojiSelect = (emoji: string) => {
    if (messageInputRef.current) {
      const input = messageInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentValue = input.value;
      
      const newValue = currentValue.slice(0, start) + emoji + currentValue.slice(end);
      setNewMessage(newValue);
      
      // Focus back to input and set cursor position after emoji
      setTimeout(() => {
        input.focus();
        const newCursorPosition = start + emoji.length;
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setNewMessage(value);
    
    // Check for @ mention trigger
    const lastAtIndex = value.lastIndexOf('@', cursorPos - 1);
    const lastSpaceIndex = value.lastIndexOf(' ', cursorPos - 1);
    
    if (lastAtIndex > lastSpaceIndex && lastAtIndex !== -1) {
      // We're in a mention context
      const query = value.slice(lastAtIndex + 1, cursorPos);
      
      // Only show dropdown if query doesn't contain spaces and cursor is right after @
      if (!query.includes(' ') && cursorPos > lastAtIndex) {
        setShowMentionDropdown(true);
        setMentionQuery(query);
        setMentionStartPos(lastAtIndex);
        setSelectedMentionIndex(0);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  const selectMention = (member: MemberForMention) => {
    if (!messageInputRef.current) return;
    
    const input = messageInputRef.current;
    const beforeMention = newMessage.slice(0, mentionStartPos);
    const afterMention = newMessage.slice(input.selectionStart || 0);
    
    // Use 'all' for @all mentions, otherwise use formatted name
    const username = member.userId === 'all' ? 'all' : member.name.toLowerCase().replace(/\s+/g, '');
    
    const newValue = beforeMention + `@${username} ` + afterMention;
    setNewMessage(newValue);
    setShowMentionDropdown(false);
    
    // Focus and set cursor position after the mention
    setTimeout(() => {
      input.focus();
      const newCursorPos = beforeMention.length + username.length + 2; // +2 for @ and space
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle mention dropdown navigation
    if (showMentionDropdown && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
        return;
      }
      
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(filteredMembers[selectedMentionIndex]);
        return;
      }
      
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionDropdown(false);
        return;
      }
    }
    
    // Regular message sending
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return 'U';
    }
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatFileSize = (bytes: number | string) => {
    const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    if (numBytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (type: string) => {
    return type.startsWith('image/');
  };

  const getFileIcon = (type: string) => {
    if (isImage(type)) return ImageIcon;
    return FileIcon;
  };

  const handleDownloadFile = (fileId: string) => {
    window.open(`/api/download/${fileId}`, '_blank');
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const dateKey = message.timestamp.toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);

  if (isLoadingMessages) {
    return (
      <Card className={cn("flex flex-col", className)}>
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-500 rounded-full" />
            Team Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <LoadingSpinner variant="minimal" size="md" />
        </CardContent>
      </Card>
    );
  }

  if (messagesError) {
    return (
      <Card className={cn("flex flex-col", className)}>
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-500 rounded-full" />
            Team Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-2">Failed to load messages</p>
            <p className="text-sm text-gray-500">{messagesError.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-500 rounded-full" />
            Team Chat
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-2">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
            <div key={dateKey}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {formatDate(new Date(dateKey))}
                </div>
              </div>
              
              {/* Messages for this date */}
              {dateMessages.map((message, index) => {
                const showAvatar = index === 0 || 
                  dateMessages[index - 1]?.senderId !== message.senderId;
                const isLast = index === dateMessages.length - 1 ||
                  dateMessages[index + 1]?.senderId !== message.senderId;
                
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2 mb-1 w-full",
                      message.isOwn ? "justify-end" : "justify-start"
                    )}
                  >
                    {!message.isOwn && (
                      <div className="flex-shrink-0 w-8">
                        {showAvatar ? (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                              {getInitials(message.sender?.name || 'Unknown')}
                            </AvatarFallback>
                          </Avatar>
                        ) : null}
                      </div>
                    )}
                    
                    <div className={cn(
                      "max-w-[70%] flex flex-col min-w-0",
                      message.isOwn ? "items-end" : "items-start"
                    )}>
                      {/* Sender name */}
                      {showAvatar && (
                        <span className="text-xs text-gray-500 mb-1 px-2">
                          {message.isOwn ? "You" : message.sender?.name || 'Unknown'}
                        </span>
                      )}
                      
                      {/* Message bubble */}
                      <div
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm relative max-w-full min-w-0 border",
                          message.isOwn
                            ? "bg-blue-500 text-white rounded-br-sm border-blue-600/30 shadow-sm"
                            : "bg-gray-100 text-gray-900 rounded-bl-sm border-gray-200/80 shadow-sm",
                          !isLast && "mb-1",
                          // Add opacity for optimistic messages
                          message.id?.startsWith('temp-') && "opacity-70"
                        )}
                      >
                        {message.content && (
                          <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere">
                            {(() => {
                              // Use task followers for message mention highlighting (confidentiality)
                              const taskFollowers = task?.followers?.map(follower => ({
                                id: follower.id,
                                name: follower.user?.name || '',
                                email: follower.user?.email || '',
                                userId: follower.user?.id || '',
                                role: follower.role || 'MEMBER',
                                workspaceId: task.workspaceId,
                                joinedAt: new Date().toISOString(), // Default joinedAt for followers
                              })) || [];
                              const mentions = extractMentions(message.content, taskFollowers, currentUser?.id);
                              return mentions.length > 0 
                                ? renderMessageWithMentions(message.content, mentions)
                                : message.content;
                            })()}
                          </p>
                        )}

                        {/* Attachment */}
                        {message.attachmentId && (
                          <div className="mt-2">
                            {isImage(message.attachmentType || '') ? (
                              <div className="w-full max-w-sm max-h-80 overflow-hidden rounded-lg border-0 bg-gray-100">
                                <Image
                                  src={`/api/download/${message.attachmentId}`}
                                  alt={message.attachmentName || "Image attachment"}
                                  width={400}
                                  height={320}
                                  className="w-full h-auto object-contain cursor-pointer hover:scale-105 transition-transform duration-200"
                                  onClick={() => handleDownloadFile(message.attachmentId!)}
                                />
                              </div>
                            ) : (
                              <div className={cn(
                                "rounded-lg border overflow-hidden",
                                message.isOwn 
                                  ? "bg-blue-600 border-blue-400" 
                                  : "bg-white border-gray-300"
                              )}>
                                <div className="p-3 flex items-center gap-3">
                                  <div className={cn(
                                    "p-2 rounded",
                                    message.isOwn ? "bg-blue-400" : "bg-gray-100"
                                  )}>
                                    <FileIcon className={cn(
                                      "h-4 w-4",
                                      message.isOwn ? "text-white" : "text-gray-600"
                                    )} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-sm font-medium truncate",
                                      message.isOwn ? "text-white" : "text-gray-900"
                                    )}>
                                      {message.attachmentName}
                                    </p>
                                    <p className={cn(
                                      "text-xs",
                                      message.isOwn ? "text-blue-100" : "text-gray-500"
                                    )}>
                                      {formatFileSize(message.attachmentSize || '0')}
                                    </p>
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className={cn(
                                      "h-8 w-8",
                                      message.isOwn 
                                        ? "text-white hover:bg-blue-400" 
                                        : "text-gray-600 hover:bg-gray-200"
                                    )}
                                    onClick={() => handleDownloadFile(message.attachmentId!)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Timestamp (only on last message in group) */}
                        {isLast && (
                          <div className={cn(
                            "text-xs mt-1 flex",
                            message.isOwn 
                              ? "text-blue-100 justify-end" 
                              : "text-gray-500 justify-start"
                          )}>
                            {formatTime(message.timestamp)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
          )}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2 mb-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs bg-green-100 text-green-600">
                  SW
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 px-3 py-2 rounded-lg rounded-bl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="border-t-2 border-neutral-200/80 p-4 bg-gray-50/50 backdrop-blur-sm">
          {/* File preview */}
          {selectedFile && (
            <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded">
                {(() => {
                  const Icon = getFileIcon(selectedFile.type);
                  return <Icon className="h-5 w-5 text-blue-600" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedFile(null)}
                className="h-8 w-8 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* File upload button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingFile || isCreatingMessage}
              className="h-10 w-10 text-gray-400 hover:text-gray-600"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 relative">
              <Input
                ref={messageInputRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={selectedFile ? "Add a message..." : "Type a message..."}
                className="pr-10 resize-none min-h-[40px] rounded-full border-2 border-gray-300/80 focus:border-blue-400/80 transition-colors shadow-sm"
                maxLength={1000}
                disabled={isUploadingFile}
              />
              
              {/* Mention Dropdown */}
              {showMentionDropdown && filteredMembers.length > 0 && (
                <div
                  ref={mentionDropdownRef}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50"
                >
                  <div className="p-2 text-xs text-gray-500 border-b bg-gray-50">
                    <AtSign className="w-3 h-3 inline mr-1" />
                    Mention someone
                  </div>
                  {filteredMembers.map((member, index) => (
                    <button
                      key={member.id}
                      onClick={() => selectMention(member)}
                      className={cn(
                        "w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 transition-colors",
                        index === selectedMentionIndex && "bg-blue-50 border-l-2 border-blue-500"
                      )}
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                          {getInitials(member.name || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {member.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          @{member.userId === 'all' ? 'all' : (member.name || '').toLowerCase().replace(/\s+/g, '')}
                        </div>
                      </div>
                      {member.role === 'ADMIN' && (
                        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Admin
                        </div>
                      )}
                      {member.userId === 'all' && (
                        <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          All
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              <EmojiPicker onEmojiSelect={handleEmojiSelect}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-gray-600"
                  type="button"
                >
                  <SmileIcon className="h-4 w-4" />
                </Button>
              </EmojiPicker>
            </div>
            
            <Button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && !selectedFile) || isCreatingMessage || isUploadingFile}
              size="icon"
              className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200"
            >
              {isCreatingMessage || isUploadingFile ? (
                <LoadingSpinner size="sm" className="text-white" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Character count and file info */}
          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-gray-400">
              {selectedFile && (
                <span>File: {selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
              )}
            </div>
            <div className="text-xs text-gray-400">
              {newMessage.length}/1000
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/svg+xml,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
};