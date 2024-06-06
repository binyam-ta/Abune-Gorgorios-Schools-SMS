import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
export enum ClassType {
  nursery = 'nursery',
  junior_primary = 'junior primary',
  senior_primary = 'senior primary',
  junior_secondary = 'junior secondary',
  senior_secondary = 'senior secondary',
}
export class GradeLevel {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  grade: string;

  @IsOptional()
  @IsEnum(ClassType)
  classType?: ClassType;
  //classType?: keyof typeof ClassType;

  // If you want to use Prisma's ClassType instead
}
