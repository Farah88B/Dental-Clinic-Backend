import { PrismaService } from '../../../src/common/prisma/services/prisma.service';
import roles from './roles.data.json';


export async function upsertDefaultRoles(
 prisma: PrismaService,
){

 return prisma.$transaction(async(tx)=>{


  for(const role of roles){


    await tx.role.upsert({

      where:{
        code: role.code,
      },

      update:{
        nameAr: role.nameAr,
        nameEn: role.nameEn,
        descriptionAr: role.descriptionAr,
        descriptionEn: role.descriptionEn,
      },


      create:{
        code: role.code,
        nameAr: role.nameAr,
        nameEn: role.nameEn,
        descriptionAr: role.descriptionAr,
        descriptionEn: role.descriptionEn,
      }

    });


  }


 });


}