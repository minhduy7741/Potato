import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateEnvVariableDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  value: string;

  @IsBoolean()
  @IsOptional()
  isSecret?: boolean;
}
