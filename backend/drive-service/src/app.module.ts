import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SessionsModule } from './sessions/sessions.module';
import { FoldersModule } from './folders/folders.module';
import { DriveAccountsModule } from './drive-accounts/drive-accounts.module';
import { FilesModule } from './files/files.module';
import { FileChunksModule } from './file-chunks/file-chunks.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    SessionsModule,
    FoldersModule,
    DriveAccountsModule,
    FilesModule,
    FileChunksModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: Number(process.env.DATABASE_PORT ?? 5432),
      username: process.env.DATABASE_USERNAME ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      database: process.env.DATABASE_NAME ?? 'drive_service',
      autoLoadEntities: true,
      synchronize: process.env.DATABASE_SYNC === 'true',
    }),
  ],
})
export class AppModule {}
