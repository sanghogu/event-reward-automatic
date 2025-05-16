import * as bcrypt from 'bcrypt';

export const comparePassword  = (pass:string, passHash:string)=> {
    return bcrypt.compare(pass, passHash);
}
export const hashPassword = (pass:string)=> {
    return bcrypt.hash(pass, 10);
}