import { PrismaService } from '../../../src/common/prisma/services/prisma.service';
import permissions from './permission.data.json';


export async function upsertDefaultPermissions(
  prisma: PrismaService,
) {

  return prisma.$transaction(async(tx)=>{


    for(const permission of permissions){


      await tx.permission.upsert({

        where:{
          code: permission.code,
        },


        update:{
          nameAr: permission.nameAr,
          nameEn: permission.nameEn,
          order: permission.order,
        },


        create:{
          code: permission.code,
          nameAr: permission.nameAr,
          nameEn: permission.nameEn,
          order: permission.order,
        },

      });


    }


  });


}
