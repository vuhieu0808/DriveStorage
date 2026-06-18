import { IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsNotEmpty()
  userName?: string;
}
