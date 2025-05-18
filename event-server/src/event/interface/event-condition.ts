export interface EventCondition {
    type: string;
    [key: string]: any;
}

export interface LoginStreakCondition extends EventCondition {
    type: 'loginStreak';
    days: number;
}
export interface InviteFriendsCondition extends EventCondition {
    type: 'inviteFriends';
    count: number;
}
export interface QuestClearCondition extends EventCondition {
    type: 'questClear';
    questId: string;
}
