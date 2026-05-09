import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GitDeployDto {
  @IsString()
  @IsNotEmpty()
  gitRepo: string;

  @IsString()
  @IsOptional()
  deployBranch?: string;

  @IsString()
  @IsOptional()
  gitToken?: string;
}
