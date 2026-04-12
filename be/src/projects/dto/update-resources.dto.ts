import { IsString, IsOptional } from 'class-validator';

export class UpdateResourcesDto {
  @IsOptional()
  ramLimit?: number;

  @IsOptional()
  cpuLimit?: number;
}
