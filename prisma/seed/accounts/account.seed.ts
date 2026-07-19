import { PrismaService } from '../../../src/common/prisma/services/prisma.service';
import DEFAULT_ACCOUNTS from './account.data.json';
import * as bcrypt from 'bcrypt';


export async function upsertDefaultAccounts(
  prisma: PrismaService,
) {

  for (const account of DEFAULT_ACCOUNTS) {


    const role = await prisma.role.findUnique({
      where: {
        code: account.roleCode,
      },
    });


    if (!role) {
      throw new Error(
        `Role ${account.roleCode} not found`,
      );
    }



    const hashedPassword =
      await bcrypt.hash(
        account.password,
        12,
      );



    const dbAccount =
      await prisma.account.upsert({

        where: {
          phone: account.phone,
        },


        update: {
          password: hashedPassword,
          status: 'ACTIVE',
        },


        create: {

          phone: account.phone,

          password: hashedPassword,

          status: 'ACTIVE',

          phoneVerifiedAt: new Date(),

        },

      });



    await prisma.accountRole.upsert({

      where:{
        accountId_roleId:{
          accountId: dbAccount.id,
          roleId: role.id,
        },
      },


      update:{},


      create:{
        accountId: dbAccount.id,
        roleId: role.id,
      },

    });

  }

}