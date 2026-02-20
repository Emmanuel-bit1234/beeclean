import type { RdcPayrollRole } from './roles.js';

// User with role (RDC Payroll)
export interface UserWithRole {
  id: number;
  name: string;
  email: string;
  role: RdcPayrollRole;
}

// Conversation types
export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: number;
  type: ConversationType;
  name?: string | null;
  description?: string | null;
  createdBy?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationWithParticipants extends Conversation {
  participants: Array<{
    id: number;
    name: string;
    email: string;
    role: RdcPayrollRole;
    joinedAt: Date;
    lastReadAt?: Date | null;
  }>;
  createdByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

// Message types
export type MessageType = 'text' | 'file' | 'image';

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageType: MessageType;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface MessageWithSender extends Message {
  sender: {
    id: number;
    name: string;
    email: string;
  };
}

// Request/Response types
export interface CreateDirectConversationRequest {
  userId: number;
}

export interface SendMessageRequest {
  content: string;
  messageType?: MessageType;
  metadata?: Record<string, any>;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  userIds: number[];
}

export interface AddGroupParticipantsRequest {
  userIds: number[];
}

export interface ConversationListItem {
  id: number;
  type: ConversationType;
  name?: string | null;
  otherParticipant?: UserWithRole; // For direct messages
  participantCount?: number; // For groups
  lastMessage?: {
    id: number;
    content: string;
    senderId: number;
    createdAt: Date;
  };
  unreadCount: number;
  updatedAt: Date;
}
