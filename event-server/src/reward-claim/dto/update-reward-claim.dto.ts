import {IsEnum, IsNotEmpty, IsOptional, IsString} from "class-validator";
import {ClaimStatus} from "../../common/enums/claim-status.enum";

export class UpdateClaimStatusDto {
    @IsEnum(ClaimStatus)
    @IsNotEmpty()
    status: ClaimStatus;

    @IsString()
    @IsOptional()
    notes?: string;
}
