export interface User {
  _id:string
  email:string
  emailVerified : boolean
  name?:string
  image?:string
  createdAt?:Date   
  updatedAt?:Date    
  role:string      
}