import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddResultkDto, UpdateResultDto } from './dto';
import { AddManyResultkDto } from './dto/addmanyresult.dto';

@Injectable()
export class ResultService {
  constructor(private prisma: PrismaService) {}

  async addMark(dto: AddResultkDto) {
    const sunjectid = await this.prisma.subject.findUnique({
      where: {
        id: dto.subjectId,
      },
    });
    if (!sunjectid) {
      throw new NotFoundException('Subject does not exist');
    }
    try {
      await this.prisma.result.create({
        data: {
          ...dto,
        },
      });
    } catch (e) {
      throw new NotAcceptableException(
        'student id and subject id must be unique',
      );
    }

    return {
      msg: 'Result Created!',
    };
  }

  // async updateMark(dto: UpdateResultDto, resultId: number) {
  //   const marksheet = await this.prisma.result.update({
  //     where: { id: resultId },
  //     data: { ...dto },
  //   });

  //   return {
  //     msg: 'Marksheet Updated',
  //     data: marksheet,
  //   };
  // }

  async makeAnalysis(gradeId: number, semesterId: number) {
    try {
      if (![1, 2, 3].includes(semesterId)) {
        throw new Error('Please provide a valid semester ID (1, 2, or 3).');
      }
      // Fetch all subjects for the given grade

      const subjects = await this.prisma.subject.findMany({
        where: { gradeId },
      });

      // Fetch all results for the given grade
      const allResults = await this.prisma.result.findMany({
        where: { gradeLevelId: gradeId },
      });

      // Initialize an object to store analysis data
      const analysisData = [];

      // Iterate over each subject
      for (const subject of subjects) {
        // Filter results for the current subject
        const subjectResults = allResults.filter(
          (result) => result.subjectId === subject.id,
        );

        // Initialize count for score ranges
        let below50Count = 0;
        let between50And60Count = 0;
        let above60Count = 0;

        // Iterate over each result for the current subject
        for (const result of subjectResults) {
          // Get the total score based on the selected semester
          let totalScore;
          if (semesterId === 1) {
            totalScore = result.totalScore1;
          } else if (semesterId === 2) {
            totalScore = result.totalScore2;
          } else {
            totalScore = result.totalScore1 + result.totalScore2;
          }

          // Update count based on score range
          if (totalScore < 50) {
            below50Count++;
          } else if (totalScore >= 50 && totalScore <= 60) {
            between50And60Count++;
          } else {
            above60Count++;
          }
        }

        // Calculate percentages for each score range
        const totalCount = subjectResults.length;
        const below50Percent = (below50Count / totalCount) * 100;
        const between50And60Percent = (between50And60Count / totalCount) * 100;
        const above60Percent = (above60Count / totalCount) * 100;
        const teacher_get = subject.teacherId;
        const teacher_Name = await this.prisma.teacher.findUnique({
          where: { user_Id: teacher_get },
          select: { user: { select: { frist_name: true } } },
        });
        // Store analysis data for the current subject
        analysisData.push({
          id: subject.id,
          subject: subject.name,
          teacher_Name: teacher_Name,
          'Below 50': below50Percent,
          '50-60': between50And60Percent,
          'Above 60': above60Percent,
        });
      }

      // Return the analysis data
      return analysisData;
    } catch (error) {
      console.error('Error in makeAnalysis:', error);
      throw error;
    }
  }
  async getTeacherResult(
    id: number,
    gradeId: number,
    sectionId: number,
    subjectId: number,
  ) {
    const res = await this.prisma.result.findMany({
      where: {
        teacherId: id,
        subjectId: subjectId,
        sectionId: sectionId,
        gradeLevelId: gradeId,
      },
      include: {
        student: {
          select: { user: { select: { frist_name: true, last_name: true } } },
        },
      },
    });
    if (res) {
      const ready = res.map((r) => ({
        id: r.id,
        test1: r.test1,
        assignmentScore1: r.assignmentScore1,
        midtermScore1: r.midtermScore1,
        finalExamScore1: r.finalExamScore1,
        totalScore1: r.totalScore1,
        test2: r.test2,
        assignmentScore2:r.assignmentScore2 ,
        midtermScore2: r.midtermScore2,
        finalExamScore2: r.finalExamScore2,
        totalScore2: r.totalScore2,
        sectionId: r.sectionId,
        teacherId: r.teacherId,
        studentId: r.studentId,
        subjectId: r.subjectId,
        gradeLevelId:r.gradeLevelId,
        first_name: r.student.user.frist_name,
        last_name: r.student.user.last_name,
      }));
      return ready;
    } else {
      return {
        status: false,
        msg: 'Not found ',
      };
    }
  }

  
  async deleteResult(resultId: number) {
    const delt = await this.prisma.result.delete({
      where: {
        id: resultId,
      },
    });
    if (!delt) {
      throw new NotAcceptableException('Delete failed');
    }
    return { msg: `user ${resultId} deleted successfully` };
  }
  async getStudentHistory(id:number){
  const history= await this.prisma.studentHistory.findFirst({where:{studentId:id}})
  if(history){
    return history
  }else{
    throw new NotFoundException('No history found')
  }
}

  async updateMark(
    dto: UpdateResultDto,
    resultId: number,
    teacherId: number,
    gradeId: number,
    sectionId: number,
    subjectId: number,
  ) {
    const marksheet = await this.prisma.result.update({
      where: { id: resultId },
      data: {
        test1: dto.test1,
        assignmentScore1: dto.assignmentScore1,
        midtermScore1: dto.midtermScore1,
        finalExamScore1: dto.finalExamScore1,
        totalScore1: dto.totalScore1,

        test2: dto.test2,
        assignmentScore2: dto.assignmentScore2,
        midtermScore2: dto.midtermScore2,
        finalExamScore2: dto.finalExamScore2,
        totalScore2: dto.totalScore2,


        // teacherId:dto.teacherId,
        // gradeLevelId:dto.gradeLevelId,
        // subjectId:dto.subjectId
      },
    });

    return {
      msg: 'Marksheet Updated',
      // data: marksheet,
    };
  }

  async addManyResult(
    results: AddManyResultkDto[],
    gradeLevelId: number,
    teacherId: number,
    subjectId: number,
  ) {
    const incompleteStudents: string[] = [];

    for (const result of results) {
      // Check for incomplete or null fields
      if (
        result.test1 === null ||
        result.assignmentScore1 === null ||
        result.midtermScore1 === null ||
        result.finalExamScore1 === null ||
        result.totalScore1 === null
      ) {
        // Log an error or store the student ID in incompleteStudents array
        const errorMessage = `Incomplete data for student with id: ${result.studentId}`;
        incompleteStudents.push(errorMessage);
        // Skip to the next iteration
        continue;
      }

      // Process the result and save it to the database
      const savedResult = await this.prisma.result.create({
        data: {
          test1: result.test1,
          assignmentScore1: result.assignmentScore1,
          midtermScore1: result.midtermScore1,
          finalExamScore1: result.finalExamScore1,
          totalScore1: result.totalScore1,
          teacherId: teacherId,
          studentId: result.studentId,
          subjectId: subjectId,
          gradeLevelId: gradeLevelId,
        },
      });

      // Continue with additional processing if needed
    }

    // After the loop, you can return the list of incomplete students if necessary
    return { msg: 'students grade submitted', incomplete: incompleteStudents };
  }
}
