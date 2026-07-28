import { PrismaService } from "../../src/common/prisma/services/prisma.service";

import { upsertDefaultPermissions } 
from "./permissions/permission.seed";

import { upsertDefaultRoles } 
from "./roles/roles.seed";

import { upsertRolePermissions }
from "./roles-permissions/role-permission.seed";

import { upsertDefaultAccounts }
from "./accounts/account.seed";

import * as PermissionSeed from "./permissions/permission.seed";
import { upsertClinicSettings } from "./clinic-settings/clinic-settings.seed";

import { upsertDefaultPatientFormFields } from "./patient-form-fields/patient-form-field.seed";

const prisma = new PrismaService();


async function main(){

 await upsertDefaultPermissions(prisma);

 await upsertDefaultRoles(prisma);

 await upsertRolePermissions(prisma);

 await upsertDefaultAccounts(prisma);
    
 await upsertDefaultPatientFormFields(prisma); 

 await upsertClinicSettings(prisma);

}


main()
.catch((e)=>{
 console.error(e);
 process.exit(1);
})
.finally(async()=>{
 await prisma.$disconnect();
});