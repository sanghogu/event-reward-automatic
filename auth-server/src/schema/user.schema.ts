import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';



export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true, lowercase: true })
  username: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: [String] })
  roles: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);