
// Zoho Mail Handler Wrapper
// Handles interaction with Zoho Mail API

interface MailFolder {
    folderId: string;
    folderName: string;
    unreadCount: number;
}

interface MailMessage {
    messageId: string;
    subject: string;
    summary: string;
    sender: string;
    to: string;
    sentDateInGMT: string;
    hasAttachment: boolean;
    status: string;
    folderId: string;
    isRead: boolean;
    isStarred?: boolean;
}

interface DraftInput {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    content: string;
    isHtml?: boolean;
}

const MOCK_FOLDERS: MailFolder[] = [
    { folderId: '1', folderName: 'Inbox', unreadCount: 0 },
    { folderId: '2', folderName: 'Sent', unreadCount: 0 },
    { folderId: '3', folderName: 'Drafts', unreadCount: 0 },
    { folderId: '4', folderName: 'Trash', unreadCount: 0 },
    { folderId: '5', folderName: 'Spam', unreadCount: 0 }
];

export async function getFolders() {
    // In a real implementation, this would fetch from Zoho API
    // identifying that credentials might be missing or mocking for dev
    return { success: true, folders: MOCK_FOLDERS };
}

export async function getMessages(folderId: string, limit: number, start: number) {
    return { success: true, messages: [], total: 0 };
}

export async function getMessage(messageId: string) {
    return { success: false, error: 'Message not found (Mock)' };
}

export async function deleteMessage(messageId: string, permanent: boolean) {
    return { success: true };
}

export async function sendMessage(body: any) {
    console.log('Mock sending email:', body);
    return { success: true, messageId: 'mock-sent-id' };
}

export async function saveDraft(input: DraftInput) {
    console.log('Mock saving draft:', input);
    return { success: true, messageId: 'mock-draft-id' };
}

export async function moveMessage(messageId: string, folderId: string) {
    return { success: true };
}

export async function markAsRead(messageId: string, isRead: boolean) {
    return { success: true };
}

export async function markAsStarred(messageId: string, isStarred: boolean) {
    return { success: true };
}

export async function searchMessages(params: any) {
    return { success: true, messages: [] };
}

export async function getAttachment(messageId: string, attachmentId: string) {
    return { success: false, error: 'Attachments not supported in mock mode' };
}
