import {
  ForbiddenException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { SectionAddDto, SectionUpdateAddDto } from './dto/sectionAdd.dto';
import { PrismaService } from 'src/prisma/prisma.service';

// interface StudentResult {
//   totalScore1: number;
//   totalScore2: number;
// }

// interface StudentWithSubjectTotals {
//   result: StudentResult[];
//   careof_contact1: string;
//   careof_contact2: string;
//   user_Id: number;
//   gradeId: number;
//   sectionId: number;
//   subjectTotals: {
//     totalScore1?: number;
//     totalScore2?: number;
//     averageScore?: number;
//   };
// }

@Injectable()
export class SectionService {
  constructor(private prismaService: PrismaService) {}

  async addSection(
    schoolId: number,
    dto: SectionAddDto,
  ): Promise<{ msg: string; addSection?: any }> {
    try {
      const { gradeId, name } = dto;

      // Check if gradeId exists
      const gradeLevel = await this.prismaService.gradeLevel.findUnique({
        where: {
          id: gradeId,
        },
      });

      if (!gradeLevel) {
        return {
          msg: 'Grade level does not exist!',
        };
      }

      // Check if a section with the same gradeId and name already exists
      const existingSection = await this.prismaService.section.findFirst({
        where: {
          gradeId,
          name,
        },
      });

      if (!existingSection) {
        const addSection = await this.prismaService.section.create({
          data: {
            name: dto.name,
            gradeId: dto.gradeId,
            schoolId: schoolId,
          },
        });
        return {
          msg: 'Section added!',
          addSection,
        };
      }
      if (existingSection) {
        throw new NotAcceptableException('section arleady exists');
      }

      // If no section with the same gradeId and name exists, create the new section
    } catch (error) {
      throw new NotAcceptableException('section already exists');
    }
  }

  async getSection(secId: number): Promise<any[]> {
    try {
      const exist = await this.prismaService.section.findUnique({
        where: {
          id: secId,
        },
      });
      if (!exist) {
        throw new NotFoundException(`Section ${secId} not found`);
      }
      const getSection = await this.prismaService.section.findMany({});
      return getSection;
    } catch (error) {
      console.error('Error fetching sections:', error);
      return [];
    }
  }

  // async searchSection(secId: number) {
  //   const exist = await this.prismaService.section.findUnique({
  //     where: {
  //       id: secId,
  //     },
  //   });
  //   return exist;
  // }
  async searchSection(subj: number) {
    const searchSection = await this.prismaService.section.findUnique({
      where: { id: subj },
      include: {
        gradelevel: { select: { grade: true } },
        teacher: {
          include: { user: { select: { frist_name: true, last_name: true } } },
        },
      },
    });
    if (!searchSection) {
      throw new NotFoundException('Section not found');
    }
    return searchSection;
  }
  async manageSection(schoolId: number) {
    const section = await this.prismaService.section.findMany({
      where: {
        schoolId: schoolId,
      },
      select: {
        id: true,
        name: true,
        gradelevel: {
          select: {
            id: true,
            grade: true,
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                frist_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });
    return section;
  }
  async updateSection(dto: SectionUpdateAddDto, sectionId: number) {
    const exist = await this.prismaService.section.findUnique({
      where: {
        id: sectionId,
      },
      include: {
        teacher: true, // Include teacher information
      },
    });

    if (!exist) {
      throw new NotFoundException(`Section ${sectionId} does not exist`);
    }

    const existingTeacherIds = exist.teacher.map((teacher) => teacher.user_Id);

    if (existingTeacherIds.includes(dto.teacherId)) {
      // If the new teacher is already assigned to the section, update the section data only
      return this.prismaService.section.update({
        where: {
          id: sectionId,
        },
        data: {
          name: dto.name,
          gradeId: dto.gradeId,
        },
      });
    } else {
      // If the new teacher is not already assigned to the section, replace the existing teacher with the new one
      const update = await this.prismaService.section.update({
        where: {
          id: sectionId,
        },
        data: {
          name: dto.name,
          gradeId: dto.gradeId,
          teacher: {
            disconnect: existingTeacherIds.map((teacherId) => ({
              user_Id: teacherId,
            })),
            connect: {
              user_Id: dto.teacherId,
            },
          },
        },
      });

      // Update the new teacher's section and grade level associations
      await this.prismaService.teacher.update({
        where: { user_Id: dto.teacherId },
        data: {
          section: {
            connect: { id: update.id },
          },
          gradelevel: {
            connect: { id: update.gradeId },
          },
        },
      });

      return update;
    }
  }
  async deleteSection(sectionId: number): Promise<void> {
    // First, retrieve the section to get the associated teacher and grade level
    const section = await this.prismaService.section.findUnique({
      where: { id: sectionId },
      include: {
        teacher: true,
        gradelevel: true,
      },
    });

    if (!section) {
      throw new Error(`Section with ID ${sectionId} not found.`);
    }

    // Disconnect the teacher from the section if it exists
    if (section.teacher.length > 0) {
      const teacherIds = section.teacher.map((teacher) => teacher.user_Id);
      await Promise.all(
        teacherIds.map((teacherId) =>
          this.prismaService.teacher.update({
            where: { user_Id: teacherId },
            data: {
              section: {
                disconnect: {
                  id: sectionId,
                },
              },
            },
          }),
        ),
      );
    }

    // Finally, delete the section
    await this.prismaService.section.delete({
      where: { id: sectionId },
    });
  }
}
