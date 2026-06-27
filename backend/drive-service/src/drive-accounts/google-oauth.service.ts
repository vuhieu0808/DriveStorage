import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class GoogleOAuthService {
  private oauth2Client: any;
  private readonly scopes: string[] = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
  ];

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_APP_CLIENT_ID,
      process.env.GOOGLE_APP_CLIENT_SECRET,
      process.env.GOOGLE_APP_REDIRECT_URI,
    );
  }

  getAuthUrl(userId: string): string {

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state: userId, // Pass userId as state to retrieve after callback
      prompt: 'consent', // Force consent screen to always get refresh token
    });
  }

  async exchangeCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return {
      accessToken: credentials.access_token,
      expiryDate: credentials.expiry_date,
    };
  }

  async revokeToken(token: string) {
    try {
      await this.oauth2Client.revokeToken(token);
    } catch (error) {
      console.error('Error revoking token:', error);
    }
  }

  getOAuth2Client() {
    return this.oauth2Client;
  }
}
