/**
 * TikTok Download Workflow Skill
 * 
 * Complete TikTok download workflow that:
 * 1. Validates TikTok URL
 * 2. Checks user subscription limits
 * 3. Downloads video
 * 4. Uploads to Google Drive
 * 5. Tracks usage
 */

import { SkillDefinition, SkillMetadata, SkillExecutionContext } from '../../../tools-registry/src/skills/types';

const metadata: SkillMetadata = {
  name: 'download-tiktok',
  description: 'Complete TikTok download workflow: validate URL, check limits, download, upload to Drive',
  category: 'tools',
  tags: ['tiktok', 'download', 'gdrive'],
  aliases: ['@tiktok', '@download'],
  version: '1.0.0',
  requiredParams: ['userId', 'url'],
  optionalParams: ['folderId'],
  example: 'download-tiktok({ userId: "user123", url: "https://tiktok.com/@user/video/123" })',
};

const skill: SkillDefinition = {
  name: 'download-tiktok',
  description: metadata.description,
  metadata,
  parameters: [
    {
      name: 'userId',
      type: 'string',
      description: 'User ID',
      required: true,
    },
    {
      name: 'url',
      type: 'string',
      description: 'TikTok video URL',
      required: true,
      validation: (value) => {
        if (!value || !value.includes('tiktok.com')) {
          return 'Valid TikTok URL is required';
        }
        return true;
      },
    },
    {
      name: 'folderId',
      type: 'string',
      description: 'Google Drive folder ID (optional)',
      required: false,
    },
  ],
  
  validate: (params) => {
    if (!params.userId) {
      return 'User ID is required';
    }
    if (!params.url || !params.url.includes('tiktok.com')) {
      return 'Valid TikTok URL is required';
    }
    return true;
  },
  
  execute: async (params, context) => {
    const { userId, url, folderId } = params;
    
    context?.log?.(`Starting TikTok download workflow for user ${userId}`, 'info');
    
    try {
      // Step 1: Check if user can download (using check-access skill)
      context?.log?.('Checking download permissions...', 'info');
      const accessCheck = await context?.skills?.execute('check-access', {
        userId,
        toolId: 'tiktok-downloader',
        action: 'download',
      });
      
      if (!accessCheck.allowed) {
        throw new Error(accessCheck.message || 'Download limit reached');
      }
      
      context?.log?.(`Access granted. Remaining: ${accessCheck.remaining ?? 'unlimited'}`, 'info');
      
      // Step 2: Download TikTok video (using TikTok downloader tool)
      context?.log?.('Downloading TikTok video...', 'info');
      const downloadTool = await context?.tools?.import('tiktok', 'downloadVideo');
      const downloadResult = await downloadTool({ url });
      
      if (!downloadResult.success) {
        throw new Error(downloadResult.error || 'Failed to download video');
      }
      
      context?.log?.(`Video downloaded: ${downloadResult.videoUrl}`, 'info');
      
      // Step 3: Upload to Google Drive (using Google Drive tool)
      context?.log?.('Uploading to Google Drive...', 'info');
      const uploadTool = await context?.tools?.import('gdrive', 'uploadVideoToAccountFolder');
      const uploadResult = await uploadTool({
        videoUrl: downloadResult.videoUrl,
        fileName: downloadResult.fileName || 'tiktok-video.mp4',
        username: userId,
        folderId,
      });
      
      context?.log?.(`Uploaded to Drive: ${uploadResult.fileId}`, 'info');
      
      // Step 4: Track usage
      context?.log?.('Tracking usage...', 'info');
      const trackUsageTool = await context?.tools?.import('subscription', 'trackUsage');
      await trackUsageTool({
        userId,
        toolId: 'tiktok-downloader',
        action: 'download',
        metadata: {
          url,
          fileId: uploadResult.fileId,
          videoUrl: downloadResult.videoUrl,
        },
      });
      
      return {
        success: true,
        videoUrl: downloadResult.videoUrl,
        driveFileId: uploadResult.fileId,
        driveUrl: uploadResult.webViewLink,
        remaining: accessCheck.remaining !== null ? accessCheck.remaining - 1 : null,
        message: 'TikTok video downloaded and uploaded to Google Drive',
      };
    } catch (error) {
      context?.log?.(
        `TikTok download failed: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      throw error;
    }
  },
  
  errorHandler: (error, params) => {
    return {
      success: false,
      error: error.message,
      userId: params.userId,
      url: params.url,
    };
  },
};

export default skill;


