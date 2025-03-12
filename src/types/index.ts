// src/types/index.ts
export interface User {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string | null;
}

export interface SessionType {
  user: User;
}

export interface NotificationType {
  id: string;
  invitation_id: string;
  sender: {
    name: string;
    avatar_url?: string | null;
  } | null;
  availability: {
    date: string;
    start_time: string | null;
    end_time: string | null;
    comment?: string | null;
  } | null;
  created_at: string;
}

export interface AvailabilityType {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  comment?: string | null;
  user_id: string;
}

export interface InvitationType {
  id: string;
  availability_id: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface MessageType {
  id: string;
  sender_id: string;
  recipient_id: string;
  invitation_id?: string;
  type: 'message' | 'invitation' | 'acceptance' | 'rejection';
  content: string;
  is_read: boolean;
  created_at: string;
}
