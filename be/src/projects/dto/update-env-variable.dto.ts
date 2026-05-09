import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateEnvVariableDto {
  @IsString()
  @IsOptional()
  value?: string;

  @IsBoolean()
  @IsOptional()
  isSecret?: boolean;
}
