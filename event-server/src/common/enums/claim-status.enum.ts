
export enum ClaimStatus {
    PENDING = 'PENDING',//운영자 검토 대기
    APPROVED = 'APPROVED',//지급 승인
    REJECTED = 'REJECTED', //거절
    PAID = 'PAID', //실제 지급 완료
    FAILED = 'PAID_FAILED', //지급 시도 중 오류
    CANCELLED = 'CANCELLED', //지급전 검토대기중 등등 취소
}
