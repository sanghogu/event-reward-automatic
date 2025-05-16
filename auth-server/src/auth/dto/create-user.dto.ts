import {ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength} from "class-validator";
import {Role} from "../../common/enums/role.enum";


export class CreateUserDto {
    @IsString({ message: 'username is string' })
    @MinLength(3, { message: 'username length >= 3' })
    @MaxLength(30, { message: 'username length <= 30' })
    username: string;

    @IsString({ message: 'password is string' })
    @MinLength(8, { message: 'password length >= 8' })
    @MaxLength(100, { message: 'password length <= 100' })
    password: string;

    @IsOptional()
    @IsArray({ message: '배열이 아님.' })
    @ArrayMinSize(1, { message: '역할(roles)은 최소 하나 이상의 항목을 포함해야 합니다 (지정 시).' })
    @IsEnum(Role, { each: true, message: '각 역할은 유효한 Role 값(USER, OPERATOR, AUDITOR, ADMIN)이어야 합니다.' })
    roles?: Role[];
}