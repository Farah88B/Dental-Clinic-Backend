import { PrismaService } from '../../../src/common/prisma/services/prisma.service';


const SECRETARY_PERMISSIONS = [
  'view_patients',
  'search_patients',
  'create_patient',
  'update_patient',
  'archive_patient',
  'link_patient_account',        // ⬅ مضافة — EC-1 / EC-2 حصرًا للسكرتيرة

  'view_appointments',
  'create_appointment',
  'update_appointment',
  'cancel_appointment',
  'bulk_postpone_appointments',  // ⬅ مضافة — أداة الطوارئ FR-S-22
  'manage_schedule',             // ⬅ مضافة — قسم 3.2.6 كامل

  'view_invoices',               // ⬅ مضافة — السكرتيرة بتطبع/ترسل إيصالات (FR-S-17)
  'record_payment',              // ⬅ مضافة — نفس السبب

  'view_notifications',
  'manage_patient_form_fields',
];



export async function upsertRolePermissions(
 prisma: PrismaService,
){


return prisma.$transaction(async(tx)=>{


const doctor =
 await tx.role.findUnique({
  where:{
    code:'DOCTOR'
  }
 });


const secretary =
 await tx.role.findUnique({
  where:{
    code:'SECRETARY'
  }
});



const permissions =
 await tx.permission.findMany();



/**
 * Doctor gets everything
 */
if(doctor){


for(const permission of permissions){


 await tx.rolePermission.upsert({

 where:{
  roleId_permissionId:{
    roleId:doctor.id,
    permissionId:permission.id
  }
 },

 create:{
  roleId:doctor.id,
  permissionId:permission.id
 },

 update:{}

 });


}

}



/**
 * Secretary limited permissions
 */

if(secretary){


const allowed =
 permissions.filter(
  p=>SECRETARY_PERMISSIONS.includes(p.code)
 );


for(const permission of allowed){


 await tx.rolePermission.upsert({

 where:{
  roleId_permissionId:{
    roleId:secretary.id,
    permissionId:permission.id
  }
 },


 create:{
  roleId:secretary.id,
  permissionId:permission.id
 },


 update:{}

 });


}


}


});


}
