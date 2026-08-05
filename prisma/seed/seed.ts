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
import { upsertDefaultTreatmentTemplates } from "./treatment-templates/treatment-templates.seed";
import { upsertDemoPatientJourney } from "./demo-patient-journey/demo-patient.seed";
import { upsertDemoContent } from "./content/content.seed";

const prisma = new PrismaService();


async function main(){

 await upsertDefaultPermissions(prisma);

 await upsertDefaultRoles(prisma);

 await upsertRolePermissions(prisma);

 await upsertDefaultAccounts(prisma);
    
 await upsertDefaultPatientFormFields(prisma); 

 await upsertClinicSettings(prisma);

 await upsertDefaultTreatmentTemplates(prisma);

 await upsertDemoPatientJourney(prisma);

 await upsertDemoContent(prisma);

}


main()
.catch((e)=>{
 console.error(e);
 process.exit(1);
})
.finally(async()=>{
 await prisma.$disconnect();
});