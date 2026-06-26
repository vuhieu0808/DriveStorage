import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleOAuthService } from './google-oauth.service';

@Injectable()
export class GoogleDriveClientService {
  constructor(private readonly googleOAuthService: GoogleOAuthService) {}

  async getStorageQuota(accessToken: string, refreshToken: string) {
    const oauth2Client = this.googleOAuthService.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    try {
      const response = await drive.about.get({
        fields: 'storageQuota,user',
      });

      const quota = response.data.storageQuota;
      const user = response.data.user;

      return {
        email: user?.emailAddress || '',
        totalSpace: quota?.limit || '16106127360', // Default 15GB in bytes
        usedSpace: quota?.usage || '0',
      };
    } catch (error) {
      console.error('Error fetching storage quota:', error);
      throw error;
    }
  }

  async uploadFile(
    accessToken: string,
    refreshToken: string,
    fileName: string,
    mimeType: string,
    fileStream: any,
  ) {
    const oauth2Client = this.googleOAuthService.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: mimeType,
      },
      media: {
        mimeType: mimeType,
        body: fileStream,
      },
      fields: 'id,name,size',
    });

    return response.data;
  }

  async deleteFile(
    accessToken: string,
    refreshToken: string,
    fileId: string,
  ) {
    const oauth2Client = this.googleOAuthService.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    await drive.files.delete({
      fileId: fileId,
    });
  }

  async getFileMetadata(
    accessToken: string,
    refreshToken: string,
    fileId: string,
  ) {
    const oauth2Client = this.googleOAuthService.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id,name,size,mimeType,createdTime,modifiedTime',
    });

    return response.data;
  }

  async createResumableUploadUrl(
    accessToken: string,
    refreshToken: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
  ) {
    const oauth2Client = this.googleOAuthService.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Create resumable upload session
    const response = await drive.files.create(
      {
        requestBody: {
          name: fileName,
          mimeType: mimeType,
        },
        media: {
          mimeType: mimeType,
          body: '', // Empty body to get upload URL
        },
      },
      {
        // Use resumable upload
        params: {
          uploadType: 'resumable',
        },
      },
    );

    return response.headers.location; // Returns the resumable upload URL
  }
}
