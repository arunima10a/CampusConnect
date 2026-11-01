export interface Event { id:number; title:string; description:string; category:string; eventDate:string; eventTime:string; venue:string; imageUrl:string; capacity:number; registered:number }
export interface Registration { id:number; studentId:string; fullName:string; collegeEmail:string; department:string; academicYear:string; phone?:string; additionalInfo?:string; registeredAt:string; reference:string; event:Event }
export interface RegistrationInput { eventId:number; fullName:string; studentId:string; collegeEmail:string; department:string; academicYear:string; phone?:string; additionalInfo?:string }
export interface Notice { id:number; title:string; description:string; category:string; priority:string; publishedAt:string }
export interface AdminIdentity { authenticated:boolean; email:string; role:'admin' }
