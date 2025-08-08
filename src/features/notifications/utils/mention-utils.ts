import React from "react";

export interface MemberForMention {
  id: string;
  name: string;
  email: string;
  userId: string;
  role: string;
  workspaceId: string;
  joinedAt: string;
}

export interface MentionMatch {
  username: string;
  startIndex: number;
  endIndex: number;
  member?: MemberForMention;
  isAllMention?: boolean;
  allMembers?: MemberForMention[];
}

/**
 * Extract @mentions from message content
 * Returns array of mention matches with their positions
 */
export function extractMentions(content: string, members: MemberForMention[] = [], currentUserId?: string): MentionMatch[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: MentionMatch[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1].toLowerCase();
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;

    // Check for @all mention
    if (username === 'all') {
      // Filter out current user from members for @all mention
      const allMembers = currentUserId 
        ? members.filter(m => m.userId !== currentUserId)
        : members;
      
      mentions.push({
        username: match[1],
        startIndex,
        endIndex,
        isAllMention: true,
        allMembers,
      });
    } else {
      // Find matching member by name (case insensitive)
      const member = members.find(m => 
        m.name?.toLowerCase().includes(username) ||
        m.name?.toLowerCase().replace(/\s+/g, '').includes(username)
      );

      mentions.push({
        username: match[1],
        startIndex,
        endIndex,
        member,
      });
    }
  }

  return mentions;
}

/**
 * Render message content with highlighted mentions
 */
export function renderMessageWithMentions(content: string, mentions: MentionMatch[]): React.ReactNode {
  if (mentions.length === 0) return content;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  mentions.forEach((mention, index) => {
    // Add text before mention
    if (mention.startIndex > lastIndex) {
      parts.push(content.slice(lastIndex, mention.startIndex));
    }

    // Add highlighted mention using React.createElement
    const mentionClassName = mention.isAllMention 
      ? "bg-orange-100 text-orange-800 px-1 rounded font-medium"
      : "bg-blue-100 text-blue-800 px-1 rounded font-medium";
    
    parts.push(
      React.createElement(
        'span',
        {
          key: `mention-${index}`,
          className: mentionClassName
        },
        `@${mention.username}`
      )
    );

    lastIndex = mention.endIndex;
  });

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

/**
 * Create mention suggestions dropdown data
 */
export function createMentionSuggestions(members: MemberForMention[]): Array<{
  id: string;
  name: string;
  username: string;
}> {
  return members
    .filter(member => member.name) // Only members with names
    .map(member => ({
      id: member.id,
      name: member.name,
      username: member.name.toLowerCase().replace(/\s+/g, ''),
    }));
}

/**
 * Get all unique user IDs that should be notified from mentions
 * Handles both individual mentions and @all mentions
 */
export function getMentionedUserIds(mentions: MentionMatch[]): string[] {
  const userIds = new Set<string>();
  
  mentions.forEach(mention => {
    if (mention.isAllMention && mention.allMembers) {
      // Add all member user IDs for @all mention
      mention.allMembers.forEach(member => {
        if (member.userId) {
          userIds.add(member.userId);
        }
      });
    } else if (mention.member?.userId) {
      // Add individual mention user ID
      userIds.add(mention.member.userId);
    }
  });
  
  return Array.from(userIds);
}